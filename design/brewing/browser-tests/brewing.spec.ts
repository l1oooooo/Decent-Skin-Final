import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") })
  await page.goto("/")
  await page.clock.pauseAt(new Date("2026-11-06T12:01:00Z"))
})
test("preserves Home, streams five traces, holds completion and returns once", async ({
  page,
}) => {
  const requests: string[] = []
  page.on("request", (request) => {
    if (request.method() !== "GET" || /api\/|ws\/v1/.test(request.url()))
      requests.push(request.url())
  })
  await expect(
    page.getByRole("heading", { name: "D-Flow / default" })
  ).toBeVisible()
  await page
    .getByRole("button", {
      name: "Select Easy blooming — active pressure decline",
    })
    .click({ force: true })
  const svg = page.locator(".brew-chart-live .brew-chart svg")
  const originalSvg = await svg.elementHandle()
  await page
    .getByRole("button", { name: "Simulate GHC brew", exact: true })
    .click({ force: true })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "preparing"
  )
  await page.clock.runFor(24000)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await expect(svg.locator("[data-series]")).toHaveCount(5)
  expect(
    await svg.evaluate((node, original) => node === original, originalSvg)
  ).toBe(true)
  expect(
    Number(
      await page
        .locator(".brew-chart-live .brew-chart")
        .getAttribute("data-samples")
    )
  ).toBeGreaterThan(220)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    1340
  )
  const bounds = await page.locator(".brew-chart-surface").boundingBox()
  expect(
    (bounds!.width * bounds!.height) / (1340 * (800 - 72))
  ).toBeGreaterThan(0.65)
  await page.clock.runFor(7000)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "complete"
  )
  const trace = await svg.locator('[data-series="pressure"]').getAttribute("d")
  await page.clock.runFor(2400)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "complete"
  )
  expect(await svg.locator('[data-series="pressure"]').getAttribute("d")).toBe(
    trace
  )
  await page.clock.runFor(900)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "returning"
  )
  await page.clock.runFor(600)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home"
  )
  await expect(
    page.getByRole("heading", {
      name: "Easy blooming — active pressure decline",
      exact: true,
    })
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveText("Shot completed")
  await page.clock.runFor(4200)
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveCount(0)
  expect(requests).toEqual([])
})
test("manual stops, duplicate ends, rapid restart and navigation stay distinct", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Simulate GHC brew", exact: true })
    .click({ force: true })
  await page.clock.runFor(3000)
  await page
    .getByRole("button", { name: "Simulate GHC stop", exact: true })
    .click({ force: true })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "complete"
  )
  await page.clock.runFor(3000)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "returning"
  )
  await page.clock.runFor(600)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home"
  )
  await page.clock.runFor(20)
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveText("Shot stopped manually")
  await page
    .getByRole("button", { name: "Test scenarios" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page.clock.runFor(2000)
  await page
    .getByRole("button", { name: "Complete shot", exact: true })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Duplicate completion" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Late previous-shot event" })
    .click({ force: true })
  await page.clock.runFor(3500)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveCount(0)
  await page
    .getByRole("button", { name: "Navigate away" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Complete shot", exact: true })
    .click({ force: true })
  await page.clock.runFor(4000)
  await expect(
    page.getByRole("heading", { name: "You’ve left the brewing view." })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Return to brewing preview" })
    .click({ force: true })
  await page.clock.runFor(20)
  const reviewAction = page.locator(
    '[data-notification-key="shot-review"] [data-slot="toast-action"]'
  )
  await expect(reviewAction).toBeVisible()
  await page.keyboard.press("F6")
  await expect(
    page.getByRole("button", { name: "Back to Home", exact: true })
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveCount(0)
})
test("disconnect retains trace, blanks current readings and never auto-returns", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Simulate GHC brew", exact: true })
    .click({ force: true })
  await page.clock.runFor(6000)
  await page
    .getByRole("button", { name: "Test scenarios" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Disconnect", exact: true })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Close simulation scenarios" })
    .click({ force: true })
  await page.clock.runFor(5000)
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "interrupted"
  )
  await expect(page.locator(".brew-metrics")).toContainText("—")
  await expect(
    page.locator('[data-notification-key="shot-review"]')
  ).toContainText("machine state is unknown")
  await expect(page.locator('[aria-label="Steam temperature"]')).toContainText(
    "—"
  )
  await expect(page.locator('[aria-label="Tank volume"]')).toContainText("—")
  await expect(page.locator('[aria-label="Scale disconnected"]')).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Sleep machine", exact: true })
  ).toBeDisabled()
})
test("missing scale breaks its trace, outliers expand axes, reduced motion disables animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page
    .getByRole("button", { name: "Test scenarios" })
    .click({ force: true })
  await page
    .getByRole("combobox", { name: "Telemetry", exact: true })
    .selectOption("missing-scale")
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page.clock.runFor(15000)
  await expect(
    page.locator('[data-notification-key="shot-scale"]')
  ).toBeVisible()
  const d = await page.locator('[data-series="weightFlow"]').getAttribute("d")
  await page.clock.runFor(1000)
  expect(
    await page.locator('[data-series="weightFlow"]').getAttribute("d")
  ).toBe(d)
  await page
    .getByRole("combobox", { name: "Telemetry", exact: true })
    .selectOption("high")
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page.clock.runFor(17000)
  await expect(page.locator(".brew-chart-live .brew-chart svg")).toContainText(
    "18"
  )
  expect(
    await page
      .locator(".brew-chart-surface")
      .evaluate((node) => node.getAnimations().length)
  ).toBe(0)
})
