import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(180000)
const card = '[data-slot="toast"]'
test.beforeEach(async ({ request, page }) => {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") })
  await request.post(`${fixture}/__test/reset`)
})

test("heating and preparation stay quiet; shot completion uses the shared Toaster", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.clock.pauseAt(new Date("2026-11-07T12:01:00Z"))
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, { data: { state: "heating" } })
  await page.clock.runFor(200)
  const heat = page.locator(`${card}[data-notification-key="machine-heating"]`)
  await expect(heat).toHaveCount(0)
  await page.mouse.move(0, 0)
  await page.clock.runFor(4200)
  await expect(heat).toHaveCount(0, { timeout: 15000 })
  await request.post(`${fixture}/__test/state`, { data: { state: "heating" } })
  await page.clock.runFor(200)
  await expect(heat).toHaveCount(0)
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "preparingForShot",
      shotId: "toast-shot",
      elapsed: 1,
    },
  })
  await page.clock.runFor(200)
  await expect(heat).toHaveCount(0)
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", substate: "pouring", elapsed: 12 },
  })
  await page.clock.runFor(200)
  await expect(page.locator(".rolling-window")).toHaveText("Extraction")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", elapsed: 30, reason: "targetWeight" },
  })
  await page.clock.runFor(200)
  const result = page.locator(`${card}[data-notification-key^="shot-result-"]`)
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
  await expect(result).toContainText("Shot completed")
  await expect(page.locator('[data-slot="toast-viewport"]')).toHaveCount(1)
  await expect(
    page.locator(".brew-toast,.brew-alert,.brew-operation-notice")
  ).toHaveCount(0)
  await page.clock.runFor(4200)
  await expect(result).toHaveCount(0, { timeout: 15000 })
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("refill remains through repeated frames, Escape and machine loss, then resolves from confirmed state", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.clock.pauseAt(new Date("2026-11-07T12:01:00Z"))
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "needsWater" },
  })
  await page.clock.runFor(200)
  const water = page.locator(`${card}[data-notification-key="machine-water"]`)
  await expect(water).toContainText("Water refill required")
  await expect(water.getByRole("button", { name: "Close toast" })).toHaveCount(
    0
  )
  await water.focus()
  await page.keyboard.press("Escape")
  await expect(water).toBeVisible()
  for (let i = 0; i < 3; i++)
    await request.post(`${fixture}/__test/state`, {
      data: { state: "needsWater" },
    })
  await page.clock.runFor(200)
  await expect(water).toHaveCount(1)
  await request.post(`${fixture}/__test/state`, { data: { connected: false } })
  await page.clock.runFor(200)
  const connection = page.locator(
    `${card}[data-notification-key="machine-connection"]`
  )
  await expect(connection).toBeVisible()
  await expect(water).toBeVisible()
  const bounds = await page
    .locator(`${card}[data-persistent="true"]`)
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect()
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }
      })
    )
  for (const r of bounds) {
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.right).toBeLessThanOrEqual(1007)
    expect(r.bottom).toBeLessThanOrEqual(601)
  }
  await request.post(`${fixture}/__test/state`, {
    data: { connected: true, state: "needsWater" },
  })
  await page.clock.runFor(200)
  await expect(connection).toHaveCount(0)
  await expect(water).toBeVisible()
  await request.post(`${fixture}/__test/state`, { data: { state: "idle" } })
  await page.clock.runFor(200)
  await expect(water).toHaveCount(0)
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("idle scale absence and successful connection are quiet; failures expire", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, { data: { scale: false } })
  await page.goto("/", { waitUntil: "networkidle" })
  const scale = page.getByRole("button", {
    name: "Scale disconnected. Open Connections to reconnect",
  })
  await expect(scale).toBeVisible()
  await expect(page.locator(`${card}[data-persistent="true"]`)).toHaveCount(0)
  await scale.click()
  let release: (() => void) | undefined
  await page.route("**/api/v1/devices/connect", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.continue()
  })
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await expect(page.locator(`${card}[data-type="loading"]`)).toHaveCount(0)
  await expect.poll(() => !!release).toBe(true)
  release!()
  await expect(page.getByLabel("Scale weight 0.0 grams")).toBeVisible()
  await expect(page.locator(`${card}[data-type="success"]`)).toHaveCount(0)
  await page.unroute("**/api/v1/devices/connect")
  await request.post(`${fixture}/__test/state`, {
    data: { scale: false, failPath: "/api/v1/devices/connect" },
  })
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  const failure = page
    .locator(`${card}[data-type="error"]`)
    .filter({ hasText: "Section write rejected" })
  await expect(failure).toHaveCount(1)
  await page.mouse.move(0, 0)
  await expect(failure).toHaveCount(0, { timeout: 20000 })
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.filter((w: { path: string }) => w.path === "/api/v1/devices/connect")
  ).toHaveLength(2)
})

test("scale-dependent active shot retains safety feedback and manual stop gets one truthful result", async ({
  page,
  request,
}) => {
  await page.clock.pauseAt(new Date("2026-11-07T12:01:00Z"))
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "pouring",
      shotId: "manual-toast",
      elapsed: 10,
    },
  })
  await page.clock.runFor(200)
  await request.post(`${fixture}/__test/state`, {
    data: { scale: false, elapsed: 12 },
  })
  await page.clock.runFor(200)
  const warning = page.locator(`${card}[data-notification-key="shot-scale"]`)
  await expect(warning).toContainText("Stop-at-weight is unavailable")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "apiStop", elapsed: 13 },
  })
  await page.clock.runFor(200)
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
  await expect(warning).toHaveCount(0)
  const result = page.locator(`${card}[data-notification-key^="shot-result-"]`)
  await expect(result).toContainText("Shot stopped manually")
  await expect(result).toHaveCount(1)
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})
