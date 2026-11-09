import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") })
  await page.goto("/")
  await page.clock.pauseAt(new Date("2026-11-06T12:01:00Z"))
})

test("Home shows configured target segments and updates its legend with the selected profile", async ({
  page,
}) => {
  const chart = page.locator('[aria-label="Planned profile chart"]')
  await expect(chart.locator("[data-series]")).toHaveCount(3)
  await expect(chart.locator("[data-area]")).toHaveCount(2)
  await expect(chart.locator(".brew-legend")).toHaveText(
    "PressureFlowTemperature"
  )
  await page
    .getByRole("button", {
      name: "Select Easy blooming — active pressure decline",
      exact: true,
    })
    .click({ force: true })
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.clock.runFor(100)
  await expect(chart.locator("[data-area]")).toHaveCount(3)
  await page.screenshot({ path: "artifacts/v032/mixed-profile-1007.png" })
  await page.setViewportSize({ width: 1340, height: 800 })
  await page.clock.runFor(100)
  await page
    .getByRole("button", { name: "Select 80's Espresso", exact: true })
    .click({ force: true })
  await expect(chart.locator('[data-series="pressure"]')).toHaveAttribute(
    "d",
    /C/
  )
  const pressure = await chart
    .locator('[data-series="pressure"]')
    .getAttribute("d")
  const temperature = await chart
    .locator('[data-series="groupTemperature"]')
    .getAttribute("d")
  await expect(chart.locator('[data-series="flow"]')).toHaveCount(0)
  await expect(chart.locator(".brew-legend")).toHaveText("PressureTemperature")
  await page
    .getByRole("button", { name: "Increase temperature", exact: true })
    .click({ force: true })
  await expect(
    chart.locator('[data-series="groupTemperature"]')
  ).not.toHaveAttribute("d", temperature!)
  await expect(chart.locator('[data-series="pressure"]')).toHaveAttribute(
    "d",
    pressure!
  )
  await page
    .getByRole("button", { name: "Select Rao Allongé", exact: true })
    .click({ force: true })
  await expect(chart.locator('[data-series="pressure"]')).toHaveCount(0)
  await expect(chart.locator('[data-series="flow"]')).toHaveAttribute("d", /C/)
  await expect(chart.locator("[data-area]")).toHaveCount(2)
  await expect(chart).toHaveAttribute("data-duration", "32")
  await expect(chart.locator("svg text")).toHaveCount(0)
  await expect(chart.locator(".brew-legend")).toHaveText("FlowTemperature")
  await expect(page.locator(".focus-profile-heading > p")).toHaveCount(0)
  await expect(page.locator(".focus-chart")).not.toContainText(
    "PROFILE PREVIEW"
  )
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await expect(page.locator("button.scale-readout")).toHaveCount(0)
  await expect(page.locator("footer")).toHaveCount(0)
  await expect(page.locator('[aria-label="Group temperature"]')).toHaveText(
    "Group88 °C"
  )
  await expect(page.locator('[aria-label="Tank volume"]')).toContainText("2058")
  await expect(page.locator('[aria-label="Sleep machine"] svg')).toHaveClass(
    /lucide-power/
  )
  for (const [width, height] of [
    [1340, 800],
    [1240, 719],
    [800, 480],
  ]) {
    await page.setViewportSize({ width, height })
    await page.clock.runFor(100)
    const layout = await page
      .locator(".candidate-header")
      .evaluate((header) => {
        const groups = [...header.children].map((e) =>
          e.getBoundingClientRect()
        )
        return {
          right: Math.max(...groups.map((r) => r.right)),
          left: Math.min(...groups.map((r) => r.left)),
          scroll: document.documentElement.scrollWidth,
        }
      })
    expect(layout.right).toBeLessThanOrEqual(width)
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.scroll).toBe(width)
    const spacing = await page
      .locator(".focus-recipe-controls > .focus-stepper")
      .evaluateAll((elements) =>
        elements.map((row) => {
          const label = row.querySelector("p")!.getBoundingClientRect()
          const controls = row.querySelector("div")!.getBoundingClientRect()
          return {
            gap: controls.top - label.bottom,
            bottom: controls.bottom,
            rowBottom: row.getBoundingClientRect().bottom,
            alignment: getComputedStyle(row).justifyContent,
            touch: [...row.querySelectorAll("button")].every(
              (button) => button.getBoundingClientRect().height >= 44
            ),
          }
        })
      )
    for (const row of spacing) {
      expect(row.alignment).toBe("flex-start")
      expect(row.gap).toBeGreaterThanOrEqual(height > 650 ? 16 : 6)
      expect(row.touch).toBe(true)
      expect(row.bottom).toBeLessThanOrEqual(row.rowBottom + 0.5)
    }
    const rows = await page
      .locator(".focus-recipe-controls > .focus-stepper")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { top: rect.top, bottom: rect.bottom, height: rect.height }
        })
      )
    expect(
      Math.max(...rows.map((r) => r.height)) -
        Math.min(...rows.map((r) => r.height))
    ).toBeLessThan(1)
    expect(rows[3].bottom).toBeLessThanOrEqual(height - 60)
    for (let i = 1; i < rows.length; i++)
      expect(rows[i].top).toBeGreaterThanOrEqual(rows[i - 1].bottom - 1)
  }
})

test("one utility popover keeps tabs stable, preserves focus and enforces brewing gates", async ({
  page,
}) => {
  const writes: string[] = []
  page.on("request", (r) => {
    if (r.method() !== "GET") writes.push(r.url())
  })
  const trigger = page.getByRole("button", {
    name: "Hardware settings",
    exact: true,
  })
  await trigger.click({ force: true })
  await page.clock.runFor(200)
  const popover = page.getByRole("dialog", {
    name: "Hardware settings",
    exact: true,
  })
  const before = await popover.boundingBox()
  for (const name of ["Steam", "Hot Water", "Flush"]) {
    await page.getByRole("tab", { name, exact: true }).click({ force: true })
    await page.clock.runFor(200)
    await expect(popover).toBeVisible()
    expect(await popover.boundingBox()).toEqual(before)
  }
  await expect(
    page.getByRole("button", { name: "Edit flush time", exact: true })
  ).toBeVisible()
  await page
    .getByRole("tab", { name: "Steam", exact: true })
    .click({ force: true })
  await page
    .getByRole("switch", { name: "Enable steam" })
    .click({ force: true })
  await expect(
    page.getByRole("switch", { name: "Enable steam" })
  ).not.toBeChecked()
  await page
    .getByRole("switch", { name: "Enable steam" })
    .click({ force: true })
  await expect(page.getByRole("switch", { name: "Enable steam" })).toBeChecked()
  await page
    .getByRole("button", { name: "Increase steam temperature", exact: true })
    .click({ force: true })
  await expect(
    page.getByRole("button", { name: "Edit steam temperature", exact: true })
  ).toHaveText("141.0")
  await page.getByRole("tab", { name: "Steam", exact: true }).press("Escape")
  await page.clock.runFor(200)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await trigger.click({ force: true })
  await page.clock.runFor(200)
  await page
    .getByRole("heading", { name: "D-Flow / default", exact: true })
    .click({ force: true, position: { x: 8, y: 8 } })
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await page
    .getByRole("button", { name: "Simulate GHC brew", exact: true })
    .click({ force: true })
  await page.clock.runFor(1500)
  await trigger.click({ force: true })
  await expect(
    page.getByRole("button", {
      name: "Increase steam temperature",
      exact: true,
    })
  ).toBeDisabled()
  await expect(
    page.getByRole("switch", { name: "Enable steam" })
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeDisabled()
  expect(writes).toEqual([])
})

test("rolling text changes without moving its icon and settles rapid interrupted transitions", async ({
  page,
}) => {
  const machineStatus = page.locator(".candidate-status")
  await expect(machineStatus).toHaveText("DE1Ready")
  await page
    .getByRole("button", { name: "Simulate GHC brew", exact: true })
    .click({ force: true })
  await expect(machineStatus).toHaveText("DE1Heating")
  await page.clock.runFor(1800)
  const status = page.locator(".rolling-status")
  await expect(status).toHaveAttribute("data-tone", "preinfusion")
  await expect(machineStatus).toHaveText("DE1Ready")
  await expect(page.locator(".brew-title h1")).toHaveCount(0)
  const titleStyle = await status.evaluate((node) => ({
    color: getComputedStyle(node).color,
    foreground: getComputedStyle(node).getPropertyValue("--foreground").trim(),
    size: getComputedStyle(node).fontSize,
    left: node.getBoundingClientRect().left,
  }))
  expect(titleStyle.color).toBe(titleStyle.foreground)
  expect(titleStyle.size).toBe("26px")
  expect(titleStyle.left).toBe(28)
  const icon = page.locator(".rolling-icon")
  const before = await icon.boundingBox()
  await page.clock.runFor(8000)
  await expect(status).toHaveAttribute("data-tone", "pouring")
  await page.clock.runFor(400)
  await expect(page.locator(".rolling-window")).toHaveText("Extraction")
  await expect(machineStatus).toHaveText("DE1Ready")
  const after = await icon.boundingBox()
  expect(after!.x).toBe(before!.x)
  expect(after!.y).toBe(before!.y)
  await expect(page.locator(".rolling-window > span")).toHaveCount(1)
  await expect(page.locator(".brew-status")).toHaveCount(0)
  await page
    .getByRole("button", { name: "Test scenarios" })
    .click({ force: true })
  await page
    .getByRole("button", { name: "Disconnect", exact: true })
    .click({ force: true })
  await expect(machineStatus).toHaveText("DE1Disconnected")
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page.getByRole("button", { name: "Block shot" }).click({ force: true })
  await page.clock.runFor(500)
  await expect(status).toHaveAttribute("data-tone", "error")
  await expect(page.locator(".rolling-window")).toHaveText("Shot blocked")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await expect(page.locator(".rolling-window")).toHaveText("Preparing")
  expect(
    await status.evaluate(
      (node) => node.getAnimations({ subtree: true }).length
    )
  ).toBe(0)
  await page
    .getByRole("button", { name: "Complete shot", exact: true })
    .click({ force: true })
  await expect(page.locator(".rolling-window")).toHaveText(
    "Shot ended · outcome unconfirmed"
  )
  expect(
    await page
      .locator(".rolling-window > span")
      .evaluate((node) => node.scrollWidth <= node.clientWidth)
  ).toBe(true)
})
