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
  const brew = page.getByRole("status", {
    name: "Machine state",
    exact: true,
  })
  await expect(brew).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  await expect(
    page
      .getByRole("group", { name: "Favorite profiles" })
      .getByRole("button", { name: /^Select / })
  ).toHaveCount(5, { timeout: 90000 })
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  expect(await page.locator(".focus-app > header").boundingBox()).toMatchObject(
    { x: 0, y: 0, width: 1340, height: 72 }
  )
  expect(
    await page.locator(".focus-skin > div > aside").first().boundingBox()
  ).toMatchObject({ x: 0, y: 72, width: 220, height: 728 })
  expect(
    await page.locator(".focus-skin > div > aside").last().boundingBox()
  ).toMatchObject({ x: 1012, y: 72, width: 328, height: 728 })
  await expect(page.locator(".focus-skin > footer")).toHaveCount(0)
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
    .getByRole("button", {
      name: /^(All profiles|Browse profiles)$/,
      exact: true,
    })
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

test("physical starts roll real stages, the footer stays quiet, completion has no dots", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  await page.getByRole("status", { name: "Machine state", exact: true }).click()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await state(request, { state: "espresso", elapsed: 0 })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-operation", "espresso")
  await page.getByRole("status", { name: "Machine state", exact: true }).click()
  await page.keyboard.press("Escape")
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await state(request, { state: "espresso", elapsed: 12 })
  await expect(page.locator(".rolling-window")).toContainText("Extraction")
  await expect(page.locator(".rolling-icon > span")).toHaveCount(9)
  await expect(
    page.locator(".brew-chart-live [data-series=pressure]")
  ).toHaveAttribute("d", /M.+L/)
  await page.screenshot({ path: "artifacts/fidelity/test-brewing.png" })
  await state(request, { state: "espresso", elapsed: 22 })
  await expect(page.locator(".rolling-window")).toContainText(
    "Pressure decline"
  )
  await state(request, { state: "idle", elapsed: 30, reason: "targetWeight" })
  await expect(
    page.getByRole("status", { name: "Machine state" })
  ).toHaveAttribute("data-ready", "true")
  await expect(page.locator(".rolling-window")).toHaveText("Shot complete")
  await expect(page.locator(".rolling-status")).toHaveAttribute(
    "data-running",
    "false"
  )
  await page.screenshot({ path: "artifacts/fidelity/test-completed.png" })
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveText("Shot completed")
  await expect(
    page.getByRole("button", { name: "Decrease grind size" })
  ).toBeVisible()
})

test("utility settings persist; starting and stopping stay on the physical group head", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  for (const [label, path] of [
    ["Steam", "steam"],
    ["Hot water", "hotWater"],
    ["Flush", "flush"],
  ]) {
    await page
      .getByRole("button", { name: "Hardware settings", exact: true })
      .click()
    await page
      .getByRole("tab", {
        name: label === "Hot water" ? "Hot Water" : label,
        exact: true,
      })
      .click()
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
    const card = page.getByRole("dialog", { name: "Hardware settings" })
    await expect(card).not.toContainText("Press")
    await expect(card.getByRole("button", { name: /^Start / })).toHaveCount(0)
    await state(request, { state: path })
    await expect(
      card.getByRole("button", { name: `Increase ${timeLabel}`, exact: true })
    ).toBeDisabled()
    await state(request, { state: "idle" })
    await expect(
      card.getByRole("button", { name: `Increase ${timeLabel}`, exact: true })
    ).toBeEnabled()
    await page.keyboard.press("Escape")
    const commands = await (
      await request.get(`${fixture}/__test/requests`)
    ).json()
    expect(
      commands.some(
        (c: { path: string }) => c.path === `/api/v1/machine/state/${path}`
      )
    ).toBe(false)
    expect(
      commands.filter((c: { path: string }) =>
        c.path.startsWith("/api/v1/machine/state/")
      )
    ).toEqual([])
  }
})

test("disconnects, errors and unsupported sequencing mode block starts without mock fallback", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  await state(request, { connected: false })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "false")
  await expect(page.getByRole("main")).toContainText("Machine disconnected")
  await state(request, { connected: true, mode: "full" })
  await expect(page.getByRole("main")).toContainText("tracking mode")
  await state(request, { mode: "tracking", error: "Profile write rejected" })
  await expect(
    page.getByRole("status", { name: "Machine state", exact: true })
  ).toHaveAttribute("data-ready", "true", { timeout: 90000 })
  await page
    .getByRole("button", { name: /^(All profiles|Browse profiles)$/ })
    .click()
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
  await page
    .getByRole("button", { name: "Hardware settings", exact: true })
    .click()
  await expect(
    page.getByRole("dialog", { name: "Hardware settings", exact: true })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await page
    .getByRole("button", { name: /^(All profiles|Browse profiles)$/ })
    .click()
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
  const rail = page.getByRole("group", { name: "Favorite profiles" })
  await rail.getByRole("button").nth(1).click()
  await rail.getByRole("button").nth(0).click()
  await expect(
    page.getByRole("button", { name: "Edit grinder setting" })
  ).toHaveText("Fine")
  const saved = await (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/recipes`)
  ).json()
  expect(saved["profile:0"].grinderSetting).toBe("Fine")
})

test("mid-shot attachment uses live stages, reduced motion works, long labels cannot widen the canvas", async ({
  page,
  request,
}) => {
  const transport: string[] = []
  page.on("requestfailed", (request) =>
    transport.push(`${request.url()}: ${request.failure()?.errorText}`)
  )
  page.on("response", (response) => {
    if (response.status() >= 400)
      transport.push(`${response.status()} ${response.url()}`)
  })
  page.on("websocket", (socket) => {
    socket.on("close", () => transport.push(`Closed ${socket.url()}`))
    socket.on("socketerror", (error) =>
      transport.push(`${socket.url()}: ${error}`)
    )
  })
  try {
    await state(request, { state: "espresso", elapsed: 12 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/", { waitUntil: "networkidle" })
    await expect(page.locator(".rolling-window")).toContainText("Extraction", {
      timeout: 90000,
    })
    await expect(page.locator(".rolling-icon > span").first()).toHaveCSS(
      "animation-name",
      "none"
    )
    await expect(page.locator(".brew-metrics > div").first()).toContainText(
      "—s"
    )
    await page.evaluate(async (origin) => {
      const toast = () =>
        document.querySelector(
          '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
        )?.textContent ?? ""
      await new Promise<void>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (toast() === "Shot completed") {
            clearTimeout(timeout)
            observer.disconnect()
            resolve()
          }
        })
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(
            new Error("Mid-shot attachment did not complete and return Home")
          )
        }, 15000)
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        })
        void fetch(`${origin}/__test/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: "idle",
            elapsed: 30,
            reason: "targetWeight",
          }),
        }).catch(reject)
      })
    }, fixture)
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
  } finally {
    await test.info().attach("transport-events", {
      body: JSON.stringify(transport),
      contentType: "application/json",
    })
  }
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
