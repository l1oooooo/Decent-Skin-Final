import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"
test.setTimeout(240000)

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("first install reads defaults without writes and preserves intentionally empty favorites", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, { data: { unsetDose: true } })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.0g"
  )
  await expect(
    page.getByText("Coffee · default", { exact: true })
  ).toBeVisible()
  await expect(
    page
      .getByRole("group", { name: "Favorite profiles" })
      .getByRole("button", { name: /^Select / })
  ).toHaveCount(5, { timeout: 90000 })
  await page.goto("/?page=settings&category=display", {
    waitUntil: "networkidle",
  })
  await expect(
    page.getByLabel("Temperature units", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Invalid Decaid response", { exact: true })
  ).toHaveCount(0)
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await request.post(`${fixture}/__test/state`, { data: { favorites: [] } })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Empty favorite 1", exact: true })
  ).toBeEnabled()
  await expect(
    page
      .getByRole("group", { name: "Favorite profiles" })
      .getByRole("button", { name: /^Select / })
  ).toHaveCount(0)
})

test("scale notices dismiss across replay; optional scale does not lock recipe or brewing", async ({
  page,
  request,
}) => {
  const connectionError = {
    kind: "scaleDisconnected",
    deviceId: "scale-fixture",
    timestamp: "2026-11-06T12:00:00Z",
    message: "Scale disconnected unexpectedly.",
  }
  await request.post(`${fixture}/__test/state`, {
    data: {
      scale: false,
      connectionError,
      daily: { settings: { blockOnNoScale: false } },
    },
  })
  await page.goto("/", { waitUntil: "networkidle" })
  const brew = page.getByRole("status", {
    name: "Machine state",
    exact: true,
  })
  await expect(brew).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  await expect(
    page.getByRole("button", { name: "Increase dose", exact: true })
  ).toBeEnabled()
  await expect(
    page.getByText(connectionError.message, { exact: true })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Dismiss notice", exact: true })
    .click()
  await request.post(`${fixture}/__test/state`, { data: { connectionError } })
  await expect(
    page.getByText(connectionError.message, { exact: true })
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Connect scale", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Connections", exact: true })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await expect(
    page.getByText("Connection confirmed.", { exact: true })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([
    {
      path: "/api/v1/devices/connect",
      method: "PUT",
      body: { deviceId: "scale-fixture" },
    },
  ])
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await request.post(`${fixture}/__test/state`, {
    data: { scale: false, connectionError: null },
  })
  await expect(
    page.getByRole("button", { name: "Connect scale", exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 0 },
  })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-operation", "espresso")
})

test("landscape Home fits every panel and touch target without scrolling", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  for (const viewport of [
    { width: 1340, height: 800 },
    { width: 1340, height: 700 },
    { width: 1280, height: 720 },
    { width: 1024, height: 600 },
    { width: 893, height: 533 },
    { width: 800, height: 480 },
  ]) {
    await page.setViewportSize(viewport)
    for (const label of [
      "Steam",
      "Hot water",
      "Flush",
      "Browse profiles",
      "Increase temperature",
      "Decrease dose",
    ]) {
      const control = page.getByRole("button", { name: label, exact: true })
      await expect(control).toBeInViewport({ ratio: 1 })
      const box = await control.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
    await expect(
      page.getByRole("status", { name: "Machine state", exact: true })
    ).toBeInViewport({ ratio: 1 })
    expect(
      await page
        .locator(".focus-main, .focus-body > aside")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            vertical: node.scrollHeight <= node.clientHeight + 1,
            horizontal: node.scrollWidth <= node.clientWidth + 1,
          }))
        )
    ).toEqual([
      { vertical: true, horizontal: true },
      { vertical: true, horizontal: true },
      { vertical: true, horizontal: true },
    ])
    expect(
      await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }))
    ).toEqual(viewport)
    const lastFavorite = await page
      .getByRole("group", { name: "Favorite profiles" })
      .getByRole("button")
      .last()
      .boundingBox()
    const browse = await page
      .getByRole("button", { name: "Browse profiles", exact: true })
      .boundingBox()
    expect(lastFavorite!.y + lastFavorite!.height).toBeLessThanOrEqual(
      browse!.y
    )
    await page.screenshot({
      path: `artifacts/tablet-0.2.4/ready-${viewport.width}x${viewport.height}.png`,
    })
  }
  await expect(
    page.getByRole("button", { name: /^(Brew|Start|Stop) / })
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Steam", exact: true }).click()
  await expect(
    page.getByRole("dialog", { name: "Steam settings" })
  ).toBeInViewport({ ratio: 1 })
  await page
    .getByRole("button", { name: "Close utility card", exact: true })
    .click()
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "heating",
      profileTitle:
        "A very long imported profile title with roast details and LongUnbrokenProfileIdentifierThatMustFit",
    },
  })
  await expect(page.getByRole("main")).toContainText(
    "Heating to your brew temperature"
  )
  expect(
    await page
      .locator(".focus-main, .focus-body > aside")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.scrollHeight <= node.clientHeight + 1 &&
            node.scrollWidth <= node.clientWidth + 1
        )
      )
  ).toBe(true)
  await page.screenshot({ path: "artifacts/tablet-0.2.4/heating-800x480.png" })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 12 },
  })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    480
  )
  expect(
    await page
      .locator(".focus-main, .focus-body > aside")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.scrollHeight <= node.clientHeight + 1 &&
            node.scrollWidth <= node.clientWidth + 1
        )
      )
  ).toBe(true)
  await page.screenshot({ path: "artifacts/tablet-0.2.4/brewing-800x480.png" })
  await page.keyboard.press("Escape")
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "machineEnded", elapsed: 30 },
  })
  await expect(
    page.getByRole("button", { name: "Adjust profile settings", exact: true })
  ).toBeInViewport({ ratio: 1 })
  await expect(
    page.getByRole("button", { name: /^(Brew|Start|Stop) / })
  ).toHaveCount(0)
  await page.screenshot({
    path: "artifacts/tablet-0.2.4/completed-800x480.png",
  })
})

test("profile selection uses its own temperature and yield; missing dose uses the chosen default", async ({
  page,
  request,
}) => {
  const profiles = await (
    await request.get(`${fixture}/api/v1/profiles?includeHidden=true`)
  ).json()
  profiles[0].profile.target_weight = 50
  profiles[0].profile.steps[0].temperature = 88
  profiles[1].profile.target_weight = 36
  profiles[1].profile.steps[0].temperature = 82
  profiles[2].profile.target_weight = 0
  profiles[2].profile.steps[0].temperature = 94
  await request.post(`${fixture}/__test/state`, {
    data: {
      profiles,
      recipeStore: {
        recipes: { "profile:0": { targetDoseWeight: 18, targetYield: 50 } },
      },
    },
  })
  await page.goto("/", { waitUntil: "networkidle" })
  const rail = page.getByRole("group", { name: "Favorite profiles" })
  await expect(rail.getByRole("button", { name: /^Select / })).toHaveCount(5, {
    timeout: 90000,
  })
  for (const [index, title, dose, yieldValue, temp, ratio] of [
    [1, profiles[1].profile.title, "18.0g", "36.0g", "82.0°C", "1:2.0"],
    [0, profiles[0].profile.title, "18.0g", "50.0g", "88.0°C", "1:2.8"],
    [2, profiles[2].profile.title, "18.0g", "Off", "94.0°C", "—"],
  ] as const) {
    await rail.getByRole("button").nth(index).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title)
    await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
      dose
    )
    await expect(
      page.getByLabel("Target yield value", { exact: true })
    ).toHaveText(yieldValue)
    await expect(
      page.getByLabel("Temperature value", { exact: true })
    ).toHaveText(temp)
    await expect(
      page.getByLabel("Recipe summary").locator("p").nth(1)
    ).toHaveText(ratio)
  }
  await expect(
    page.getByText("Coffee · default", { exact: true })
  ).toBeVisible()
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.context.targetYield).toBe(0)
  expect(workflow.context.targetDoseWeight).toBe(18)
  expect(workflow.context.coffeeName).toBe("Fixture coffee")
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.every((write: { path: string }) => write.path === "/api/v1/workflow")
  ).toBe(true)
  expect(writes).toHaveLength(3)
  expect(writes[2].body.context.targetDoseWeight).toBe(18)
})

test("Help reports the current CSS viewport and updates after resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 893, height: 533 })
  await page.goto("/?page=settings&category=help", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("heading", { name: "Screen and viewport", exact: true })
  ).toBeVisible()
  const measurements = page
    .getByText("Layout viewport (CSS pixels)", { exact: true })
    .locator("..")
  await expect(measurements).toContainText("893 × 533")
  await page.setViewportSize({ width: 1024, height: 600 })
  await expect(measurements).toContainText("1024 × 600")
  await expect(page.getByText("0.2.4", { exact: true })).toBeVisible()
})
