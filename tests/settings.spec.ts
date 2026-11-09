import { fixtureOrigin as fixture } from "./fixture-origin.js"
import { test, expect, type APIRequestContext } from "@playwright/test"
test.setTimeout(240000)
const state = (request: APIRequestContext, data: Record<string, unknown>) =>
  request.post(`${fixture}/__test/state`, { data })
const writes = async (request: APIRequestContext) =>
  (await request.get(`${fixture}/__test/requests`)).json()
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("daily settings visits are read-only and discovery never auto-connects", async ({
  page,
  request,
}) => {
  for (const category of ["connections", "brew", "machine", "display"]) {
    await page.goto(`/?page=settings&category=${category}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      {
        connections: "Connections",
        brew: "Brew and utilities",
        machine: "Machine and power",
        display: "Display and presence",
      }[category]!
    )
    await expect(
      page.getByText("Reconnect to Decaid before making changes.", {
        exact: false,
      })
    ).toHaveCount(0)
  }
  await expect(
    page.getByLabel("Requested brightness", { exact: true })
  ).toHaveValue("70")
  expect(await writes(request)).toEqual([])
  await page.screenshot({ path: "artifacts/phase-4/display.png" })
  await page.goto("/?page=settings&category=connections")
  await page
    .getByRole("button", { name: "Scan for devices", exact: true })
    .click()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Discovery requested" })
  ).toBeVisible()
  expect((await writes(request)).map((r: { path: string }) => r.path)).toEqual([
    "/api/v1/devices/scan",
  ])
  await page.screenshot({ path: "artifacts/phase-4/connections.png" })
})

test("utility patches agree with Home and failed sections retain drafts", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=brew")
  const steam = page.getByLabel("Steam duration (s)", { exact: true })
  await expect(steam).toHaveValue("30")
  await steam.fill("45")
  await page
    .getByRole("button", { name: "Save utility recipe", exact: true })
    .click()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Utility recipe saved." })
  ).toBeVisible()
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.steamSettings).toEqual({
    targetTemperature: 140,
    duration: 45,
    flow: 0.8,
  })
  expect(workflow.context.coffeeName).toBe("Fixture coffee")
  expect((await writes(request))[0].body).toEqual({
    steamSettings: { duration: 45 },
  })
  await page
    .getByRole("switch", {
      name: "Require a scale before brewing",
      exact: true,
    })
    .click()
  await state(request, { failPath: "/api/v1/settings" })
  await page
    .getByRole("button", { name: "Save Decaid preferences", exact: true })
    .click()
  await expect(
    page.locator('[data-slot="toast"][data-type="error"]')
  ).toContainText("Section write rejected")
  await expect(
    page.getByRole("switch", {
      name: "Require a scale before brewing",
      exact: true,
    })
  ).toHaveAttribute("aria-checked", "false")
  expect(
    (await (await request.get(`${fixture}/api/v1/settings`)).json())
      .blockOnNoScale
  ).toBe(true)
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  await state(request, { state: "espresso" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-operation", "espresso")
  await state(request, { state: "idle", failPath: null })
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await page.getByRole("button", { name: /Brew and utilities/ }).click()
  await expect(
    page.getByRole("switch", {
      name: "Require a scale before brewing",
      exact: true,
    })
  ).toHaveAttribute("aria-checked", "false")
  await page
    .getByRole("button", { name: "Save Decaid preferences", exact: true })
    .click()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Decaid preferences saved." })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Hardware settings", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Increase steam time", exact: true })
  ).toBeVisible()
  await expect(
    page.getByLabel("Steam time value", { exact: true })
  ).toContainText("45")
})

test("display saves preserve newer edits, report caps and persist units", async ({
  page,
  request,
}) => {
  await state(request, {
    daily: { display: { lowBatteryBrightnessActive: true, brightness: 20 } },
  })
  await page.goto("/?page=settings&category=display")
  const brightness = page.getByLabel("Requested brightness", { exact: true })
  await expect(brightness).toHaveValue("70")
  let release: () => void = () => {}
  const paused = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/v1/display/brightness", async (route) => {
    await paused
    await route.continue()
  })
  await brightness.fill("80")
  await page
    .getByRole("button", { name: "Save display brightness", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Saving…", exact: true })
  ).toBeVisible()
  await brightness.fill("90")
  release()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Display brightness saved." })
  ).toBeVisible()
  await expect(brightness).toHaveValue("90")
  await expect(
    page.getByText("Applied brightness · 20 · Limited by battery policy")
  ).toBeVisible()
  await page
    .getByRole("region", { name: "Display brightness", exact: true })
    .getByRole("button", { name: "Cancel", exact: true })
    .click()
  await expect(brightness).toHaveValue("80")
  await page
    .getByRole("combobox", { name: "Temperature units", exact: true })
    .click()
  await page.getByRole("option", { name: "Fahrenheit", exact: true }).click()
  await page
    .getByRole("button", { name: "Save Focus preferences", exact: true })
    .click()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Focus preferences saved." })
  ).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole("combobox", { name: "Temperature units", exact: true })
      .locator('[data-slot="select-value"]')
  ).toHaveText("Fahrenheit")
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(page.getByLabel("Machine status")).toContainText("190 °F")
})

test("wake schedules and sleep are explicit; unsupported grinder controls stay unavailable", async ({
  page,
  request,
}) => {
  await state(request, {
    grinder: true,
    daily: { grinderInfo: { capabilities: [], controls: {} } },
  })
  await page.goto("/?page=settings&category=connections")
  await expect(
    page.getByText("Grind setting is read-only or unavailable.")
  ).toBeVisible({ timeout: 90000 })
  await expect(
    page.getByRole("button", { name: "Start grinder", exact: true })
  ).toHaveCount(0)
  expect(await writes(request)).toEqual([])
  await page.goto("/?page=settings&category=display")
  await page
    .getByRole("button", { name: "Add wake schedule", exact: true })
    .click()
  await page.getByLabel("Wake time", { exact: true }).fill("08:15")
  await page.getByRole("button", { name: "Mon", exact: true }).click()
  await page.getByRole("button", { name: "Save schedule", exact: true }).click()
  await expect(
    page
      .locator('[data-slot="toast"]')
      .filter({ hasText: "Wake schedule saved." })
  ).toBeVisible()
  expect(
    (
      await (await request.get(`${fixture}/api/v1/presence/schedules`)).json()
    )[0]
  ).toMatchObject({ time: "08:15", daysOfWeek: [1], enabled: true })
  await page.goto("/?page=settings&category=machine")
  const sleep = page
    .getByRole("main")
    .getByRole("button", { name: "Sleep machine", exact: true })
  await expect(sleep).toBeEnabled({ timeout: 90000 })
  await sleep.click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Wake machine", exact: true })
  ).toBeEnabled()
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Sleeping", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Wake machine", exact: true }).click()
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  expect(
    (await writes(request)).filter((r: { path: string }) =>
      r.path.includes("/grinder/")
    )
  ).toEqual([])
})
