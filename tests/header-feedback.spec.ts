import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("header steam follows live readings even with heating off, with no header controls", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { steamTemperature: 87 } },
  })
  await page.goto("/", { waitUntil: "networkidle" })
  const steam = page
    .getByRole("banner")
    .getByLabel("Steam temperature", { exact: true })
  await expect(steam).toHaveText(/Steam\s*87\s*°C/)
  await expect(
    page.getByRole("button", { name: "Steam temperature settings" })
  ).toHaveCount(0)
  let resume!: () => void
  const held = new Promise<void>((resolve) => {
    resume = resolve
  })
  await page.route("**/api/v1/machine/state", async (route) => {
    await held
    await route.continue()
  })
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { pauseMachine: true } },
  })
  try {
    await expect(steam).toHaveText(/Steam\s*—\s*°C/, { timeout: 15000 })
    await expect(
      page.getByRole("button", { name: "Sleep machine" })
    ).toBeDisabled()
  } finally {
    resume()
    await request.post(`${fixture}/__test/state`, {
      data: { advanced: { pauseMachine: false } },
    })
  }
  await expect(steam).toHaveText(/Steam\s*87\s*°C/)
  await steam.click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page
    .getByRole("button", { name: "Machine Settings", exact: true })
    .click()
  await page.getByRole("switch", { name: "Enable steam" }).click()
  await expect(
    page.getByRole("switch", { name: "Enable steam" })
  ).toHaveAttribute("aria-checked", "false")
  await page
    .getByRole("button", {
      name: /Close (machine settings|utility card|steam settings|hot water settings|flush settings)/,
    })
    .click()
  await expect(steam).toHaveText(/Steam\s*87\s*°C/)
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { steamTemperature: 73 } },
  })
  await expect(steam).toHaveText(/Steam\s*73\s*°C/)
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { steamTemperature: null } },
  })
  await expect(steam).toHaveText(/Steam\s*—\s*°C/)
  await request.post(`${fixture}/__test/state`, {
    data: {
      advanced: { steamTemperature: 100 },
      preferences: { temperatureUnit: "F" },
    },
  })
  await page.reload({ waitUntil: "networkidle" })
  await expect(steam).toHaveText(/Steam\s*212\s*°F/)
  await request.post(`${fixture}/__test/state`, { data: { connected: false } })
  await expect(steam).toHaveText(/Steam\s*—\s*°F/)
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeDisabled()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toHaveLength(1)
  expect(writes[0].path).toBe("/api/v1/workflow")
  expect(writes[0].body.steamSettings.targetTemperature).toBe(0)
})

test("Sleep is one touch, waits for observation, and sends no repeated or wake commands", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  const sleep = page.getByRole("button", { name: "Sleep machine" })
  await expect(sleep).toBeEnabled({ timeout: 90000 })
  let release!: () => void
  let received!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const sent = new Promise<void>((resolve) => {
    received = resolve
  })
  await page.route("**/api/v1/machine/state/sleeping", async (route) => {
    received()
    await held
    await route.continue()
  })
  await sleep.click()
  await sent
  await expect(sleep).toBeDisabled()
  await expect(
    page.getByRole("heading", { name: "Sleeping", exact: true })
  ).toHaveCount(0)
  release()
  await expect(
    page.getByRole("heading", { name: "Sleeping", exact: true })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Wake machine" })).toBeEnabled()
  await page.reload({ waitUntil: "networkidle" })
  await expect(
    page.getByRole("heading", { name: "Sleeping", exact: true })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([
    { path: "/api/v1/machine/state/sleeping", method: "PUT", body: {} },
  ])
})

test("header Sleep reports failed writes on shared pages and stays blocked during operations", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/machine/state/sleeping" },
  })
  await page.goto("/?page=library", { waitUntil: "networkidle" })
  const sleep = page.getByRole("button", { name: "Sleep machine" })
  await sleep.click()
  await expect(
    page.locator('[data-slot="toast"][data-type="error"]')
  ).toContainText("Section write rejected")
  await expect(sleep).toBeEnabled()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "steam", failPath: null },
  })
  await expect(sleep).toBeDisabled()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 1 },
  })
  await expect(sleep).toBeDisabled()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", connected: false },
  })
  await expect(sleep).toBeDisabled()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toHaveLength(1)
  expect(writes[0].path).toBe("/api/v1/machine/state/sleeping")
})
