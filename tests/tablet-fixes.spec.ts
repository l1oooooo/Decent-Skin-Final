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
  await page.goto("/", { waitUntil: "networkidle" })
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
  const brew = page.getByRole("button", { name: "Brew espresso", exact: true })
  await expect(brew).toBeEnabled()
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
  await brew.click()
  await expect(
    page.getByRole("button", { name: "Stop extraction", exact: true })
  ).toBeEnabled()
})

test("short landscape viewports keep the footer and touch targets visible in ready and brewing", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  for (const viewport of [
    { width: 1340, height: 800 },
    { width: 1024, height: 600 },
    { width: 893, height: 533 },
    { width: 800, height: 480 },
  ]) {
    await page.setViewportSize(viewport)
    for (const label of ["Steam", "Hot water", "Flush", "Brew espresso"]) {
      const control = page.getByRole("button", { name: label, exact: true })
      await expect(control).toBeInViewport({ ratio: 1 })
      const box = await control.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
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
      path: `artifacts/tablet-acceptance/fixture-${viewport.width}x${viewport.height}.png`,
    })
  }
  await page.getByRole("button", { name: "Steam", exact: true }).click()
  await expect(
    page.getByRole("dialog", { name: "Steam settings" })
  ).toBeInViewport({ ratio: 1 })
  await page
    .getByRole("button", { name: "Close utility card", exact: true })
    .click()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 12 },
  })
  await expect(
    page.getByRole("button", { name: "Stop extraction", exact: true })
  ).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    480
  )
})
