import { fixtureOrigin as fixture } from "./fixture-origin.js"
import { expect, test, type APIRequestContext } from "@playwright/test"
const state = (request: APIRequestContext, data: Record<string, unknown>) =>
  request.post(`${fixture}/__test/state`, { data })
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("locked Focus layout and workflow controls use the actual gateway contract", async ({
  page,
  request,
}) => {
  test.setTimeout(240000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/", { waitUntil: "networkidle" })
  const brew = page.getByRole("button", { name: "Brew espresso", exact: true })
  await expect(brew).toBeEnabled({ timeout: 90000 })
  await expect(
    page
      .getByRole("group", { name: "Favorite profiles" })
      .getByRole("button", { name: /^Select / })
  ).toHaveCount(5, { timeout: 90000 })
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  expect(
    await page.locator(".focus-skin > header").boundingBox()
  ).toMatchObject({ x: 0, y: 0, width: 1340, height: 72 })
  expect(
    await page.locator(".focus-skin > div > aside").first().boundingBox()
  ).toMatchObject({ x: 0, y: 72, width: 220, height: 632 })
  expect(
    await page.locator(".focus-skin > div > aside").last().boundingBox()
  ).toMatchObject({ x: 1012, y: 72, width: 328, height: 632 })
  expect(
    await page.locator(".focus-skin > footer").boundingBox()
  ).toMatchObject({ x: 0, y: 704, width: 1340, height: 96 })
  await page.screenshot({ path: "artifacts/fidelity/test-ready.png" })
  await page.getByRole("button", { name: "Increase dose", exact: true }).click()
  await expect(page.getByLabel("Dose value", { exact: true })).toHaveText(
    "18.1g"
  )
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.context.coffeeName).toBe("Fixture coffee")
  await page
    .getByRole("button", { name: "Increase temperature", exact: true })
    .click()
  await expect(
    page.getByLabel("Temperature value", { exact: true })
  ).toHaveText("88.5°C")
  await page
    .getByRole("button", { name: "Browse profiles", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Profile library", exact: true })
  ).toBeVisible()
  await page.getByRole("searchbox", { name: "Search profiles" }).fill("80's")
  await page
    .getByRole("button", { name: "Load 80's Espresso", exact: true })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "80's Espresso"
  )
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.getByRole("button", { name: "History", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Shot history", exact: true })
  ).toBeVisible()
  await page
    .getByRole("button", { name: /D-Flow \/ default.*annotated yield/ })
    .click()
  await expect(page.getByText("targetWeight", { exact: true })).toBeVisible()
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "History", exact: true })
  ).toBeFocused()
  expect(errors).toEqual([])
})

test("real stages roll, stop remains available, completion has no dots", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Brew espresso", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Stop extraction" })
  ).toBeEnabled()
  await state(request, { state: "espresso", elapsed: 12 })
  await expect(page.locator(".focus-stage[data-active=true]")).toContainText(
    "Extraction"
  )
  await expect(
    page.locator(".focus-stage[data-active=true] .focus-dot")
  ).toHaveCount(9)
  await expect(page.locator(".graph-color path").first()).toHaveAttribute(
    "d",
    /M.+L/
  )
  await page.screenshot({ path: "artifacts/fidelity/test-brewing.png" })
  await state(request, { state: "espresso", elapsed: 22 })
  await expect(page.locator(".focus-stage[data-active=true]")).toContainText(
    "Pressure decline"
  )
  await state(request, { state: "idle", elapsed: 30, reason: "targetWeight" })
  await expect(page.getByRole("button", { name: "Brew again" })).toBeEnabled()
  const completed = page
    .locator(".focus-stage")
    .filter({ hasText: "Shot complete" })
  await expect(completed.locator(".focus-dot")).toHaveCount(0)
  await expect(page.locator(".motion-transform")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, -312)"
  )
  await page.screenshot({ path: "artifacts/fidelity/test-completed.png" })
  await page.getByRole("button", { name: "Adjust profile settings" }).click()
  await expect(
    page.getByRole("button", { name: "Decrease grind size" })
  ).toBeFocused()
})

test("steam, hot water and flush settings persist and start/stop only on explicit input", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  for (const [label, path] of [
    ["Steam", "steam"],
    ["Hot water", "hotWater"],
    ["Flush", "flush"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click()
    const timeLabel =
      label === "Steam"
        ? "steam time"
        : label === "Hot water"
          ? "water time"
          : "flush time"
    await page
      .getByRole("button", { name: `Increase ${timeLabel}`, exact: true })
      .click()
    await expect(
      page.getByLabel(
        `${timeLabel[0].toUpperCase()}${timeLabel.slice(1)} value`,
        { exact: true }
      )
    ).toHaveText(
      label === "Steam" ? "35s" : label === "Hot water" ? "16s" : "6s"
    )
    await page
      .getByRole("button", {
        name: `Start ${label.toLowerCase()}`,
        exact: true,
      })
      .click()
    await expect(
      page.getByRole("button", {
        name: `Stop ${label.toLowerCase()}`,
        exact: true,
      })
    ).toBeEnabled()
    await page
      .getByRole("button", { name: `Stop ${label.toLowerCase()}`, exact: true })
      .click()
    await expect(
      page.getByRole("button", {
        name: `Start ${label.toLowerCase()}`,
        exact: true,
      })
    ).toBeEnabled()
    await page.keyboard.press("Escape")
    const commands = await (
      await request.get(`${fixture}/__test/requests`)
    ).json()
    expect(
      commands.some(
        (c: { path: string }) => c.path === `/api/v1/machine/state/${path}`
      )
    ).toBe(true)
  }
})

test("disconnects, errors and unsupported sequencing mode block starts without mock fallback", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  await state(request, { connected: false })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeDisabled()
  await expect(page.getByRole("main")).toContainText("Machine disconnected")
  await state(request, { connected: true, mode: "full" })
  await expect(page.getByRole("main")).toContainText("tracking mode")
  await state(request, { mode: "tracking", error: "Profile write rejected" })
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Browse profiles" }).click()
  await page
    .getByRole("button", { name: "Load 80's Espresso", exact: true })
    .click()
  await expect(page.getByRole("main")).toContainText("Profile write rejected")
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.profile.title).toBe("D-Flow / default")
})

test("empty workflows can choose their first profile and named grind settings remain editable", async ({
  page,
  request,
}) => {
  await state(request, { emptyProfile: true, grinderSetting: "Medium-fine" })
  await page.goto("/", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Steam", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Start steam", exact: true })
  ).toBeEnabled()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Browse profiles" }).click()
  const load = page.getByRole("button", {
    name: "Load D-Flow / default",
    exact: true,
  })
  await expect(load).toBeEnabled()
  await load.click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "D-Flow / default"
  )
  await expect(
    page.getByRole("button", { name: "Edit grinder setting" })
  ).toHaveText("Medium-fine")
  await page.getByRole("button", { name: "Edit grinder setting" }).click()
  await page.getByLabel("Grinder setting", { exact: true }).fill("Fine")
  await page.getByRole("button", { name: "Save setting" }).click()
  await expect(
    page.getByRole("button", { name: "Edit grinder setting" })
  ).toHaveText("Fine")
})

test("mid-shot attachment uses live stages, reduced motion works, long labels cannot widen the canvas", async ({
  page,
  request,
}) => {
  await state(request, { state: "espresso", elapsed: 12 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".focus-stage[data-active=true]")).toContainText(
    "Extraction"
  )
  await expect(page.locator(".focus-dot").first()).toHaveCSS(
    "animation-name",
    "none"
  )
  await expect(page.locator(".motion-transform")).toHaveCSS(
    "transition-duration",
    "0s"
  )
  await expect(page.getByLabel("Shot readings")).toContainText("—s")
  await state(request, { state: "idle", elapsed: 30, reason: "targetWeight" })
  await page.getByRole("button", { name: "Adjust profile settings" }).click()
  await state(request, {
    profileTitle:
      "An exceptionally long profile name with multiple roast details and a LongUnbrokenImportedIdentifierThatMustNotOverlapTheSidebar",
  })
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "exceptionally"
  )
  const dims = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }))
  expect(dims).toEqual({ width: 1340, height: 800 })
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log("Focus failure state:", await page.locator("body").innerText())
    console.log(
      "Focus browser errors:",
      await page.evaluate(() => ({
        online: navigator.onLine,
        visibility: document.visibilityState,
      }))
    )
  }
})
