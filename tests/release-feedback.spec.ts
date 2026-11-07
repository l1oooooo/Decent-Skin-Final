import { fixtureOrigin as fixture } from "./fixture-origin.js"
import { expect, test, type Locator } from "@playwright/test"

async function enter(dialog: Locator, value: string) {
  await dialog.getByRole("button", { name: "Clear", exact: true }).click()
  for (const digit of value)
    await dialog
      .getByRole("button", {
        name: digit === "." ? "Decimal point" : digit,
        exact: true,
      })
      .click()
}

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("Home has quiet footer, text-only scale, live steam reading and profile edit shortcut", async ({
  page,
  request,
}) => {
  test.setTimeout(240000)
  await request.post(`${fixture}/__test/state`, { data: { scale: false } })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await expect(
    page.getByRole("button", { name: "Edit dose", exact: true })
  ).toBeEnabled()
  await expect(page.locator("footer")).toHaveCount(0)
  await expect(
    page.getByLabel("Scale disconnected", { exact: true })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Connect scale" })).toHaveCount(
    0
  )
  const steam = page
    .getByRole("banner")
    .getByLabel("Steam temperature", { exact: true })
  await expect(steam).toHaveText(/Steam\s*50\s*°C/)
  await page
    .getByRole("button", { name: "Machine Setting", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Edit steam temperature", exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: "Steam temperature",
    exact: true,
  })
  await enter(dialog, "145")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(steam).toHaveText(/Steam\s*50\s*°C/)
  await page
    .getByRole("button", {
      name: /Close (machine settings|utility card|steam settings|hot water settings|flush settings)/,
    })
    .click()
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  await expect(page).toHaveURL(/page=edit.*profile=profile%3A0/)
  await expect(page.getByLabel("Profile name", { exact: true })).toHaveValue(
    "D-Flow / default"
  )
  await page.setViewportSize({ width: 800, height: 480 })
  await expect(
    page.getByRole("banner").getByLabel("Steam temperature", { exact: true })
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
  const input = dialog.getByRole("textbox")
  await expect(input).toHaveAttribute("readonly", "")
  await expect(input).toHaveAttribute("inputmode", "none")
  for (const button of await dialog.getByRole("button").all()) {
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  }
  await enter(dialog, "999")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog.getByRole("alert")).toContainText("8 to 30")
  await enter(dialog, "18.7")
  await page.screenshot({
    path: "artifacts/tablet-0.2.4/number-entry-800x480.png",
  })
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.7g"
  )
  await trigger.click()
  await enter(dialog, "20")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.7g"
  )
  await request.post(`${fixture}/__test/state`, {
    data: { error: "Write rejected" },
  })
  await trigger.click()
  await enter(dialog, "19.3")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog.getByRole("alert")).toContainText("Write rejected")
  await expect(input).toHaveValue("19.3")
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.every((w: { path: string }) =>
      ["/api/v1/workflow", "/api/v1/store/decent-skin-codex/recipes"].includes(
        w.path
      )
    )
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

test("Home adjustments survive profile switches and a reload, with partial saves kept explicit", async ({
  page,
  request,
}) => {
  test.setTimeout(240000)
  await page.goto("/", { waitUntil: "networkidle" })
  const rail = page.getByRole("group", { name: "Favorite profiles" })
  await expect(rail.getByRole("button")).toHaveCount(5)
  // Establish the selected profile's identity, then exercise both editing paths.
  await rail.getByRole("button").nth(0).click()
  await page.getByRole("button", { name: "Increase dose", exact: true }).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.1g"
  )
  for (const [label, value] of [
    ["Target yield", "42.5"],
    ["Temperature", "91"],
    ["Grind size", "2.4"],
  ]) {
    await page
      .getByRole("button", { name: `Edit ${label.toLowerCase()}`, exact: true })
      .click()
    const dialog = page.getByRole("dialog", { name: label, exact: true })
    await enter(dialog, value)
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }
  await rail.getByRole("button").nth(1).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.0g"
  )
  await expect(
    page.getByText("Coffee · default", { exact: true })
  ).toBeVisible()
  await rail.getByRole("button").nth(0).click()
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.1g"
  )
  await expect(
    page.getByLabel("Target yield value", { exact: true })
  ).toHaveText("42.5g")
  await expect(
    page.getByLabel("Temperature value", { exact: true })
  ).toHaveText("91.0°C")
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "2.4"
  )
  const saved = await (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/recipes`)
  ).json()
  expect(saved["profile:0"]).toEqual({
    targetDoseWeight: 18.1,
    targetYield: 42.5,
    temperature: 91,
    grinderSetting: "2.4",
  })
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/store/decent-skin-codex/recipes" },
  })
  await page.getByRole("button", { name: "Edit dose", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Dose", exact: true })
  await enter(dialog, "19.2")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog.getByRole("alert")).toContainText(
    "Current recipe updated, but saving this profile adjustment could not be confirmed"
  )
  await expect(dialog.getByRole("textbox")).toHaveValue("19.2")
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await rail.getByRole("button").nth(1).click()
  await rail.getByRole("button").nth(0).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "19.2g"
  )
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.every((w: { path: string }) =>
      ["/api/v1/workflow", "/api/v1/store/decent-skin-codex/recipes"].includes(
        w.path
      )
    )
  ).toBe(true)
})

test("keypad supports decimal correction and physical keys; integer utilities reject decimals", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Edit dose", exact: true }).click()
  let dialog = page.getByRole("dialog", { name: "Dose", exact: true })
  await dialog.getByRole("button", { name: "2", exact: true }).click()
  await expect(dialog.getByRole("textbox")).toHaveValue("2")
  await dialog
    .getByRole("button", { name: "Decimal point", exact: true })
    .click()
  await dialog
    .getByRole("button", { name: "Decimal point", exact: true })
    .click()
  await dialog.getByRole("button", { name: "5", exact: true }).click()
  await expect(dialog.getByRole("textbox")).toHaveValue("2.5")
  await dialog.getByRole("button", { name: "Backspace", exact: true }).click()
  await expect(dialog.getByRole("textbox")).toHaveValue("2.")
  await dialog.getByRole("textbox").focus()
  await page.keyboard.type("19.4")
  await expect(dialog.getByRole("textbox")).toHaveValue("19.4")
  await page.keyboard.press("Enter")
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole("button", { name: "Machine Setting", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Edit steam time", exact: true })
    .click()
  dialog = page.getByRole("dialog", { name: "Steam time", exact: true })
  await expect(
    dialog.getByRole("button", { name: "Decimal point", exact: true })
  ).toBeDisabled()
  await enter(dialog, "45")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel("Steam time value", { exact: true })).toHaveText(
    "45s"
  )
})
