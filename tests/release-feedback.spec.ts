import { fixtureOrigin as fixture } from "./fixture-origin.js"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("Home has quiet footer, text-only scale, steam target and profile edit shortcut", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, { data: { scale: false } })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Edit dose", exact: true })
  ).toBeEnabled()
  await expect(page.locator("footer")).not.toContainText("group-head")
  await expect(
    page.getByRole("button", { name: "Connect scale" }).locator("svg")
  ).toHaveCount(0)
  const steam = page.getByRole("button", { name: "Steam temperature settings" })
  await expect(steam).toContainText("140°C")
  await steam.click()
  await page
    .getByRole("button", { name: "Edit steam temperature", exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: "Steam temperature",
    exact: true,
  })
  await dialog.getByRole("spinbutton").fill("145")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(steam).toContainText("145°C")
  await page.getByRole("button", { name: "Close utility card" }).click()
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  await expect(page).toHaveURL(/page=edit.*profile=profile%3A0/)
  await expect(page.getByLabel("Profile name", { exact: true })).toHaveValue(
    "D-Flow / default"
  )
  await page.setViewportSize({ width: 800, height: 480 })
  await expect(
    page.getByRole("button", { name: "Steam temperature settings" })
  ).toBeInViewport({ ratio: 1 })
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }).first()
  ).toBeInViewport({ ratio: 1 })
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toHaveLength(1)
  expect(writes[0].path).toBe("/api/v1/workflow")
  expect(writes[0].body.steamSettings.targetTemperature).toBe(145)
  expect(writes[0].body.steamSettings.duration).toBe(30)
})

test("numeric entry validates, cancels, saves decimals and retains failed drafts", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 800, height: 480 })
  await page.goto("/", { waitUntil: "networkidle" })
  const trigger = page.getByRole("button", { name: "Edit dose", exact: true })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Dose", exact: true })
  await expect(dialog).toBeInViewport({ ratio: 1 })
  const input = dialog.getByRole("spinbutton")
  await input.fill("999")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog.getByRole("alert")).toContainText("8 to 30")
  await input.fill("18.7")
  await page.screenshot({
    path: "artifacts/tablet-0.2.3/number-entry-800x480.png",
  })
  await input.press("Enter")
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.7g"
  )
  await trigger.click()
  await input.fill("20")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.7g"
  )
  await request.post(`${fixture}/__test/state`, {
    data: { error: "Write rejected" },
  })
  await trigger.click()
  await input.fill("19.3")
  await input.press("Enter")
  await expect(dialog.getByRole("alert")).toContainText("Could not save")
  await expect(input).toHaveValue("19.3")
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.every((w: { path: string }) => w.path === "/api/v1/workflow")
  ).toBe(true)
})

test("Streamline copy is a reviewed draft, preserves other Focus fields and saves only on request", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: {
      recipeStore: {
        "profile%3A0": {
          targetDoseWeight: 19.5,
          targetYield: 42,
          grinderSetting: "2.4",
          brewTemperature: 91,
          targetSteamDuration: 50,
        },
        recipes: {
          "profile:0": { extension: "keep" },
          "profile:1": { targetDoseWeight: 17 },
        },
      },
    },
  })
  await page.goto("/?page=recipe&profile=profile%3A0", {
    waitUntil: "networkidle",
  })
  await page.getByRole("button", { name: "Copy from Streamline" }).click()
  await expect(page.getByLabel("Dose (g)", { exact: true })).toHaveValue("19.5")
  await expect(
    page.getByLabel("First-stage temperature (°C)", { exact: true })
  ).toHaveValue("91")
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page.getByRole("button", { name: "Save recipe preferences" }).click()
  await expect(
    page.getByText("Recipe preferences saved. Load this profile to apply them.")
  ).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toHaveLength(1)
  expect(writes[0].path).toBe("/api/v1/store/decent-skin-codex/recipes")
  expect(writes[0].body).toEqual({
    "profile:0": {
      extension: "keep",
      targetDoseWeight: 19.5,
      targetYield: 42,
      grinderSetting: "2.4",
      temperature: 91,
    },
    "profile:1": { targetDoseWeight: 17 },
  })
})
