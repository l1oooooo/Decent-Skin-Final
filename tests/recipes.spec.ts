import { test, expect } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"
test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("default fork preserves unknown fields and supports ordered stage editing", async ({
  page,
  request,
}) => {
  await page.goto("/?page=edit&profile=profile%3A0")
  await expect(page.getByLabel("Profile name", { exact: true })).toHaveValue(
    "D-Flow / default"
  )
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page
    .getByRole("button", { name: "Structured JSON", exact: true })
    .click()
  const original = JSON.parse(
    await page.getByLabel("Profile JSON", { exact: true }).inputValue()
  )
  original.title = "My edited default"
  original.steps[0].seconds = 8
  original.extension = { keep: "yes" }
  original.steps[0].extension = { keep: 42 }
  await page
    .getByLabel("Profile JSON", { exact: true })
    .fill(JSON.stringify(original))
  await page
    .getByRole("button", { name: "Apply JSON to draft", exact: true })
    .click()
  await page.getByRole("button", { name: "Stage forms", exact: true }).click()
  await page
    .getByRole("button", { name: "Move stage 1 down", exact: true })
    .click()
  await expect(page.getByLabel("Stage 2 name", { exact: true })).toHaveValue(
    "Preinfusion"
  )
  await page.getByRole("button", { name: "Save as new", exact: true }).click()
  await expect(
    page.getByText(
      "Profile saved. The active recipe is unchanged until you load it.",
      { exact: true }
    )
  ).toBeVisible()
  const records = await (await request.get(`${fixture}/api/v1/profiles`)).json()
  expect(
    records.find((r: { id: string }) => r.id === "profile:0").profile.title
  ).toBe("D-Flow / default")
  const saved = records.find(
    (r: { profile: { title: string } }) =>
      r.profile.title === "My edited default"
  )
  expect(saved.parentId).toBe("profile:0")
  expect(saved.metadata.focusExtensions.extension).toEqual({ keep: "yes" })
  expect(saved.metadata.focusExtensions.steps[1].extension).toEqual({
    keep: 42,
  })
  await page.goto(`/?page=edit&profile=${encodeURIComponent(saved.id)}`)
  await page
    .getByRole("button", { name: "Structured JSON", exact: true })
    .click()
  expect(
    JSON.parse(await page.getByLabel("Profile JSON").inputValue()).steps[1]
      .extension
  ).toEqual({ keep: 42 })
  expect(
    (await (await request.get(`${fixture}/__test/requests`)).json()).some(
      (r: { path: string }) => r.path.includes("/machine/state/")
    )
  ).toBe(false)
  await page.screenshot({ path: "artifacts/phase-5/profile-editor.png" })
})

test("profile ID remapping recovers after a failed write and reload without resaving content", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: {
      recipeStore: {
        recipes: {
          "profile:1": { targetDoseWeight: 19, grinderSetting: "2.1" },
        },
      },
      failPath: "/api/v1/store/decent-skin-codex/favorites",
    },
  })
  await page.goto("/?page=edit&profile=profile%3A1")
  await expect(
    page.getByLabel("Stage 1 maximum time (s)", { exact: true })
  ).toHaveValue("7")
  await page.getByLabel("Stage 1 maximum time (s)", { exact: true }).fill("9")
  await page.getByRole("button", { name: "Save profile", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Retry pending save", exact: true })
  ).toBeVisible()
  const journal = await (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/profile-save`)
  ).json()
  expect(journal.savedId).not.toBe("profile:1")
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  await page.goto("/?page=edit&profile=profile%3A1")
  await page
    .getByRole("button", { name: "Retry pending save", exact: true })
    .click()
  await expect(
    page.getByText(
      "Profile saved. The active recipe is unchanged until you load it.",
      { exact: true }
    )
  ).toBeVisible()
  const favorites = await (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/favorites`)
  ).json()
  expect(favorites).toContain(journal.savedId)
  expect(favorites).not.toContain("profile:1")
  const preferences = await (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/recipes`)
  ).json()
  expect(preferences[journal.savedId].targetDoseWeight).toBe(19)
  const calls = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    calls.filter(
      (r: { path: string; method: string }) =>
        r.path === "/api/v1/profiles/profile%3A1" && r.method === "PUT"
    )
  ).toHaveLength(1)
  await page
    .getByRole("button", { name: "Restore previous version to draft" })
    .click()
  await expect(
    page.getByLabel("Stage 1 maximum time (s)", { exact: true })
  ).toHaveValue("7")
})

test("inventory selection and recipe preferences survive profile loading and archive", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: {
      inventory: {
        beans: [
          {
            id: "bean:1",
            name: "Test coffee",
            roaster: "Local roaster",
            archived: false,
            extras: { preserve: true },
          },
        ],
        "bean-batches": [
          {
            id: "batch:1",
            beanId: "bean:1",
            roastDate: "2026-11-01",
            weight: 250,
            weightRemaining: 200,
            archived: false,
          },
        ],
        grinders: [
          {
            id: "record:1",
            model: "Hand grinder",
            archived: false,
            burrs: "Steel",
          },
        ],
      },
    },
  })
  await page.goto("/?page=inventory")
  await page.getByRole("button", { name: "Roast batches", exact: true }).click()
  await page.getByRole("button", { name: "Use in recipe", exact: true }).click()
  await expect(
    page.getByText("Current coffee: Test coffee", { exact: true })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Grinder records", exact: true })
    .click()
  await page.getByRole("button", { name: "Use in recipe", exact: true }).click()
  await expect(
    page.getByText("Current grinder record: Hand grinder", { exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Archive", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(
      "Archived. Existing workflow and shot context are preserved.",
      { exact: true }
    )
  ).toBeVisible()
  await page.goto("/?page=recipe&profile=profile%3A1")
  await expect(page.getByLabel("Dose (g)", { exact: true })).toBeVisible()
  await page.getByLabel("Dose (g)", { exact: true }).fill("19")
  await page.getByLabel("Target yield (g)", { exact: true }).fill("38")
  await page
    .getByLabel("First-stage temperature (°C)", { exact: true })
    .fill("92")
  await page
    .getByRole("button", { name: "Save recipe preferences", exact: true })
    .click()
  await expect(
    page.getByText(
      "Recipe preferences saved. Load this profile to apply them.",
      { exact: true }
    )
  ).toBeVisible()
  await page.goto("/?page=profile&profile=profile%3A1")
  await page.getByRole("button", { name: "Load profile", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "80's Espresso", exact: true })
  ).toBeVisible()
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.context).toMatchObject({
    targetDoseWeight: 19,
    targetYield: 38,
    beanBatchId: "batch:1",
    coffeeName: "Test coffee",
    grinderId: "record:1",
    grinderModel: "Hand grinder",
  })
  expect(workflow.profile.steps[0].temperature).toBe(92)
  const calls = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    calls.some(
      (r: { path: string }) =>
        r.path.startsWith("/api/v1/grinder/") ||
        r.path.includes("/machine/state/")
    )
  ).toBe(false)
})

test("inventory drafts survive shot interruption and explicit create/edit/archive preserve records", async ({
  page,
  request,
}) => {
  await page.goto("/?page=inventory")
  await page.getByRole("button", { name: "Add bean", exact: true }).click()
  await page
    .getByLabel("Coffee name", { exact: true })
    .fill("Long name coffee from a small family farm")
  await page.getByLabel("Roaster", { exact: true }).fill("Test roaster")
  await page
    .getByLabel("Varieties (comma separated)", { exact: true })
    .fill("Bourbon, Caturra")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 3 },
  })
  await expect(
    page.getByRole("button", { name: "Stop extraction", exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "targetWeight" },
  })
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await page
    .getByRole("button", { name: "Coffee & equipment", exact: true })
    .click()
  await expect(page.getByLabel("Coffee name", { exact: true })).toHaveValue(
    "Long name coffee from a small family farm"
  )
  await page.getByRole("button", { name: "Save record", exact: true }).click()
  await expect(
    page.getByText("Inventory record saved. Historical shots are unchanged.", {
      exact: true,
    })
  ).toBeVisible()
  const beans = await (await request.get(`${fixture}/api/v1/beans`)).json()
  expect(beans).toHaveLength(1)
  expect(beans[0].variety).toEqual(["Bourbon", "Caturra"])
  await page
    .getByLabel("Coffee notes", { exact: true })
    .fill("Keep this for future shots")
  await page.getByRole("button", { name: "Save record", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Save record", exact: true })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Close editor", exact: true }).click()
  await page.getByRole("button", { name: "Archive", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await page.getByRole("button", { name: "Show archived", exact: true }).click()
  await page.getByRole("button", { name: "Restore", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  const restored = (
    await (await request.get(`${fixture}/api/v1/beans`)).json()
  )[0]
  expect(restored.notes).toBe("Keep this for future shots")
  expect(restored.archived).toBe(false)
  await page.screenshot({ path: "artifacts/phase-5/inventory.png" })
})

test("profile drafts guard navigation, validate exits and retain edits after a physical start", async ({
  page,
  request,
}) => {
  await page.goto("/?page=edit&profile=profile%3A1")
  await expect(page.getByLabel("Profile name", { exact: true })).toHaveValue(
    "80's Espresso"
  )
  await page.getByLabel("Stage 1 maximum time (s)", { exact: true }).fill("-1")
  await page.getByRole("button", { name: "Save profile", exact: true }).click()
  await expect(
    page.getByText("Enter a number from 0 to 127.", { exact: true })
  ).toBeVisible()
  await page.getByLabel("Stage 1 maximum time (s)", { exact: true }).fill("9")
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 4 },
  })
  await expect(
    page.getByRole("button", { name: "Stop extraction", exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "targetWeight" },
  })
  await page
    .getByRole("button", { name: "Browse profiles", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Details 80's Espresso", exact: true })
    .click()
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  await expect(
    page.getByLabel("Stage 1 maximum time (s)", { exact: true })
  ).toHaveValue("9")
  await page.getByRole("button", { name: "Cancel edits", exact: true }).click()
  await expect(
    page.getByLabel("Stage 1 maximum time (s)", { exact: true })
  ).toHaveValue("7")
})
