import { writeFileSync, mkdirSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { fixtureOrigin } from "./fixture-origin.js"

test("repeated shots and navigation retain one session and bounded resources", async ({
  page,
  request,
  context,
}, testInfo) => {
  test.setTimeout(360000)
  await request.post(`${fixtureOrigin}/__test/reset`)
  await page.setViewportSize({ width: 1007, height: 601 })
  const errors: string[] = []
  const sockets = new Set<string>()
  let opened = 0
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("websocket", (socket) => {
    opened++
    sockets.add(socket.url())
    socket.on("close", () => sockets.delete(socket.url()))
  })
  await page.goto("/")
  const ready = page.getByRole("button", {
    name: "Increase grind size",
    exact: true,
  })
  await expect(ready).toBeEnabled({ timeout: 90000 })
  await expect(
    page.locator('[aria-label="Favorite profiles"] button[aria-pressed="true"]')
  ).toHaveCount(1)
  const cdp = await context.newCDPSession(page)
  await cdp.send("Performance.enable")
  const resources = async (label: string) => {
    await cdp.send("HeapProfiler.collectGarbage")
    const dom = await cdp.send("Memory.getDOMCounters")
    const heap = await cdp.send("Runtime.getHeapUsage")
    const { metrics } = await cdp.send("Performance.getMetrics")
    return { label, ...dom, heapUsed: heap.usedSize, metrics }
  }
  const samples: Awaited<ReturnType<typeof resources>>[] = []
  const state = async (data: Record<string, unknown>) => {
    const result = await request.post(`${fixtureOrigin}/__test/state`, { data })
    expect(result.ok()).toBe(true)
  }
  const root = page.locator(".brew-preview")
  const chart = page.locator(".brew-chart-live .brew-chart")
  const phase = async (value: string) =>
    expect(root).toHaveAttribute("data-phase", value)
  const settle = async () =>
    expect
      .poll(() =>
        page
          .locator(".brew-chart-surface")
          .evaluate((el) => el.getAnimations().length)
      )
      .toBe(0)
  let elapsed = 0
  for (let cycle = 0; cycle < 20; cycle++) {
    const retained = await chart.elementHandle()
    await state({
      state: "espresso",
      shotId: `soak-${cycle}`,
      elapsed: ++elapsed,
    })
    await phase("active")
    await settle()
    await expect(chart).toHaveAttribute("data-displayed-duration", "35")
    elapsed += 25
    await state({ elapsed })
    await expect(
      page.locator(".brew-metrics > div").first().locator("p")
    ).toHaveText("00:25")
    await state({
      state: "idle",
      elapsed,
      reason: cycle % 2 ? "apiStop" : "targetWeight",
    })
    await phase("home")
    await settle()
    expect(
      await chart.evaluate((el, original) => el === original, retained)
    ).toBe(true)
    await retained?.dispose()
    await expect(ready).toBeEnabled()
    // Navigate through the shell without reloading the document or gateway.
    await page.getByRole("button", { name: "Settings", exact: true }).click()
    await expect(page).toHaveURL(/page=settings/)
    await page
      .getByRole("button", { name: "Return to Home", exact: true })
      .click()
    await expect(ready).toBeEnabled()
    await settle()
    if ([2, 9, 19].includes(cycle))
      samples.push(await resources(`after-${cycle + 1}-cycles`))
  }
  const report = {
    browser: await page.context().browser()!.version(),
    viewport: page.viewportSize(),
    cycles: 20,
    opened,
    activeSockets: [...sockets],
    errors,
    samples,
  }
  mkdirSync("artifacts/phase6", { recursive: true })
  writeFileSync(
    "artifacts/phase6/stability.json",
    JSON.stringify(report, null, 2)
  )
  await testInfo.attach("stability", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  })
  expect(errors).toEqual([])
  expect(opened).toBe(5)
  expect(sockets.size).toBe(5)
  expect(
    await (await request.get(`${fixtureOrigin}/__test/requests`)).json()
  ).toEqual([])
  const warm = samples[0],
    last = samples.at(-1)!
  // Allow lazy caches and toast expiry, but reject accumulated page trees/listeners.
  expect(last.documents).toBeLessThanOrEqual(warm.documents + 1)
  expect(last.nodes).toBeLessThan(warm.nodes + 150)
  expect(last.jsEventListeners).toBeLessThan(warm.jsEventListeners + 30)
  expect(last.heapUsed).toBeLessThan(warm.heapUsed + 2 * 1024 * 1024)
})
