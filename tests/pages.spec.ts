import { fixtureOrigin as fixture } from "./fixture-origin.js"
import {
  expect,
  test,
  type Page,
  type APIRequestContext,
} from "@playwright/test"
const state = (request: APIRequestContext, data: Record<string, unknown>) =>
  request.post(`${fixture}/__test/state`, { data })
const saved = async (request: APIRequestContext) =>
  (
    await request.get(`${fixture}/api/v1/store/decent-skin-codex/favorites`)
  ).json()
const requests = async (request: APIRequestContext) =>
  (await request.get(`${fixture}/__test/requests`)).json()
async function manage(page: Page) {
  await page.goto("/?page=favorites")
  await expect(
    page.getByRole("button", { name: "Replace favorite 1", exact: true })
  ).toBeEnabled()
}
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("shared pages support direct entry, Back, reload, search and a single session", async ({
  page,
  request,
}) => {
  let sockets = 0
  page.on("websocket", () => sockets++)
  await page.goto("/")
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await expect(page).toHaveURL(/page=settings/)
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  expect(
    await page.locator(".focus-page > header").boundingBox()
  ).toMatchObject({ height: 72 })
  expect(await page.getByRole("navigation").boundingBox()).toMatchObject({
    width: 220,
  })
  expect(
    await page.locator(".focus-page > footer").boundingBox()
  ).toMatchObject({ height: 96 })
  await page.screenshot({ path: "artifacts/phase-2/settings.png" })
  await page
    .getByRole("searchbox", { name: "Search settings" })
    .fill("brightness")
  await page.getByRole("button", { name: /Display and presence/ }).click()
  await expect(
    page.getByLabel("Requested brightness", { exact: true })
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/page=settings$/)
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Profile library" })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Profile library"
  )
  expect(sockets).toBe(5)
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))
  ).toEqual({ width: 1340, height: 800 })
  const smallControls = await page
    .locator('button, select, input:not([type=file]):not([aria-hidden="true"])')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const box = element.getBoundingClientRect()
          return box.width > 0 && (box.height < 44 || box.width < 44)
        })
        .map(
          (element) => element.getAttribute("aria-label") || element.textContent
        )
    )
  expect(smallControls).toEqual([])
  expect(await requests(request)).toEqual([])
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Profile library"
  )
  await page.goto("/?page=unknown")
  await expect(
    page.getByRole("button", { name: "Brew espresso", exact: true })
  ).toBeEnabled()
  await expect(page).not.toHaveURL(/page=/)
})

test("favorite assignment swaps, reorders and saves without changing workflow", async ({
  page,
  request,
}) => {
  await manage(page)
  await page.screenshot({ path: "artifacts/phase-2/favorites.png" })
  await page
    .getByRole("button", { name: "Replace favorite 1", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Assign 80's Espresso", exact: true })
    .click()
  let rows = page
    .getByRole("list", { name: "Favorite positions" })
    .getByRole("listitem")
  await expect(rows.nth(0)).toContainText("80's Espresso")
  await expect(rows.nth(1)).toContainText("D-Flow")
  await page.getByRole("button", { name: "Move favorite 1 down" }).click()
  await expect(rows.nth(0)).toContainText("D-Flow")
  await page
    .getByRole("button", { name: "Clear favorite 3", exact: true })
    .click()
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect(page.getByRole("status").last()).toContainText("Favorites saved")
  expect(await saved(request)).toEqual([
    "profile:0",
    "profile:1",
    null,
    "profile:3",
    "profile:4",
  ])
  expect(
    (await requests(request)).map((r: { path: string }) => r.path)
  ).toEqual(["/api/v1/store/decent-skin-codex/favorites"])
  await page.reload()
  rows = page
    .getByRole("list", { name: "Favorite positions" })
    .getByRole("listitem")
  await expect(rows.nth(2)).toContainText("Empty position")
  await page.getByRole("button", { name: "Return to Home" }).click()
  await expect(
    page.getByRole("button", { name: "Empty favorite 3" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Empty favorite 3" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Choose favorite 3"
  )
  await page.getByRole("button", { name: "Cancel assignment" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Manage favorites"
  )
})

test("all-empty favorites survive reload; ordinary navigation protects drafts and Cancel restores them", async ({
  page,
  request,
}) => {
  await manage(page)
  await page
    .getByRole("button", { name: "Clear favorite 1", exact: true })
    .click()
  await page.getByRole("button", { name: "Return to Home" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Keep editing" }).click()
  await expect(
    page.getByRole("button", { name: "Return to Home" })
  ).toBeFocused()
  await page.getByRole("button", { name: "Cancel changes" }).click()
  await expect(
    page.getByRole("button", { name: "Replace favorite 1", exact: true })
  ).toBeVisible()
  for (let i = 1; i <= 5; i++)
    await page
      .getByRole("button", { name: `Clear favorite ${i}`, exact: true })
      .click()
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect(page.getByRole("status").last()).toContainText("Favorites saved")
  expect(await saved(request)).toEqual([null, null, null, null, null])
  await page.getByRole("button", { name: "Return to Home" }).click()
  await page.reload()
  await expect(
    page.getByRole("group", { name: "Favorite profiles" }).getByRole("button")
  ).toHaveCount(5)
  await expect(
    page.getByRole("button", { name: "Empty favorite 1" })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Browse profiles" }).click()
  await page
    .getByRole("button", { name: "Load 80's Espresso", exact: true })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "80's Espresso"
  )
  expect(await saved(request)).toEqual([null, null, null, null, null])
})

test("failed saves retain draft and acknowledged rail; edits made during Save survive late responses", async ({
  page,
  request,
}) => {
  await manage(page)
  await page
    .getByRole("button", { name: "Clear favorite 1", exact: true })
    .click()
  await state(request, { error: "Favorites write rejected" })
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "Favorites write rejected"
  )
  await page.getByRole("button", { name: "Return to Home" }).click()
  await page.getByRole("button", { name: "Discard and leave" }).click()
  await expect(
    page.getByRole("button", { name: "Select D-Flow / default", exact: true })
  ).toBeVisible()
  await state(request, { error: null })
  await page.getByRole("button", { name: "Browse profiles" }).click()
  await page
    .getByRole("main")
    .getByRole("button", { name: "Manage favorites", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Clear favorite 1", exact: true })
    .click()
  let release = () => {}
  await page.route(
    "**/api/v1/store/decent-skin-codex/favorites",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue()
      const response = await route.fetch()
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.fulfill({ response })
    }
  )
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled()
  await expect.poll(async () => (await saved(request))[0]).toBeNull()
  await page
    .getByRole("button", { name: "Clear favorite 2", exact: true })
    .click()
  release()
  await expect(
    page.getByRole("button", { name: "Save favorites" })
  ).toBeEnabled()
  await expect(page.getByRole("listitem").nth(1)).toContainText(
    "Empty position"
  )
  expect((await saved(request))[1]).toBe("profile:1")
  await page.unrouteAll({ behavior: "wait" })
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect.poll(async () => (await saved(request))[1]).toBeNull()
})

test("a physical start dismisses navigation prompts, exposes Stop and preserves the draft", async ({
  page,
  request,
}) => {
  await manage(page)
  await page
    .getByRole("button", { name: "Clear favorite 2", exact: true })
    .click()
  await page.getByRole("button", { name: "Return to Home" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await state(request, { state: "espresso", elapsed: 12 })
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Stop extraction" })
  ).toBeEnabled()
  await expect(
    page.getByRole("button", { name: "Select 80's Espresso", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Stop extraction" }).click()
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Manage favorites" })
    .click()
  await expect(page.getByRole("listitem").nth(1)).toContainText(
    "Empty position"
  )
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect.poll(async () => (await saved(request))[1]).toBeNull()
})

test("unavailable, duplicate and malformed assignments remain explicit and recoverable", async ({
  page,
  request,
}) => {
  await state(request, {
    favorites: ["missing-id", "profile:1", "profile:1", null],
  })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Unavailable favorite 1" })
  ).toBeEnabled({ timeout: 90000 })
  await page.getByRole("button", { name: "Unavailable favorite 1" }).click()
  await page.getByRole("button", { name: "Cancel assignment" }).click()
  await expect(page.getByRole("alert")).toContainText("Duplicate assignments")
  await expect(page.getByRole("listitem").nth(0)).toContainText("missing-id")
  await expect(page.getByRole("listitem").nth(2)).toContainText(
    "Empty position"
  )
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect
    .poll(async () => await saved(request))
    .toEqual(["missing-id", "profile:1", null, null, null])
  await state(request, { favorites: { broken: true } })
  await page.reload()
  await expect(page.getByRole("alert")).toContainText("malformed")
  expect(await saved(request)).toEqual({ broken: true })
  await page.getByRole("button", { name: "Save favorites" }).click()
  await expect
    .poll(async () => await saved(request))
    .toEqual([null, null, null, null, null])
})

test("details, preview, hide/restore and import/export use profile APIs without workflow writes", async ({
  page,
  request,
}) => {
  await page.goto("/?page=library")
  await page
    .getByRole("button", { name: "Details D-Flow / default", exact: true })
    .click()
  await expect(page.getByRole("main")).toContainText("Bundled default")
  await expect(
    page.getByRole("img", { name: /Pressure, flow and temperature/ })
  ).toBeVisible()
  await page.getByRole("button", { name: "Hide profile", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Restore profile" })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Return to Home" }).click()
  await expect(
    page.getByRole("button", { name: "Unavailable favorite 1" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Browse profiles" }).click()
  await page.getByRole("combobox", { name: "Profile visibility" }).click()
  await page.getByRole("option", { name: "Hidden", exact: true }).click()
  await page
    .getByRole("button", { name: "Details D-Flow / default", exact: true })
    .click()
  await page.getByRole("button", { name: "Restore profile" }).click()
  await expect(
    page.getByRole("button", { name: "Hide profile", exact: true })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Back to library" }).click()
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export profiles" }).click()
  expect((await download).suggestedFilename()).toBe("focus-profiles.json")
  const records = await (await request.get(`${fixture}/api/v1/profiles`)).json()
  await page.getByLabel("Profile import file").setInputFiles({
    name: "profiles.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        records[0],
        { ...records[1], id: "new-profile" },
        { ...records[1], id: "invalid-import" },
      ])
    ),
  })
  await expect(
    page.getByRole("button", { name: "Confirm import" })
  ).toBeVisible()
  await state(request, { state: "espresso", elapsed: 12 })
  await expect(
    page.getByRole("button", { name: "Stop extraction" })
  ).toBeEnabled()
  await state(request, { state: "idle", elapsed: 30, reason: "targetWeight" })
  await page.getByRole("button", { name: "Browse profiles" }).click()
  await expect(
    page.getByRole("region", { name: "Review import" })
  ).toContainText("profiles.json")
  await page.getByRole("button", { name: "Confirm import" }).click()
  await expect(page.getByRole("main")).toContainText(
    "1 imported · 1 skipped · 1 failed"
  )
  expect(
    (await requests(request)).every((r: { path: string }) =>
      r.path.startsWith("/api/v1/profiles/")
    )
  ).toBe(true)
  await page.screenshot({ path: "artifacts/phase-2/library.png" })
})

test("Back cancellation keeps history usable and active-shot replay does not interrupt direct entry", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings")
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Manage favorites" })
    .click()
  await page
    .getByRole("button", { name: "Clear favorite 1", exact: true })
    .click()
  await page.goBack()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Keep editing" }).click()
  await expect(page).toHaveURL(/page=favorites/)
  await page.goBack()
  await page.getByRole("button", { name: "Discard and leave" }).click()
  await expect(page).toHaveURL(/page=settings/)
  await page.goForward()
  await expect(page).toHaveURL(/page=favorites/)
  await expect(
    page.getByRole("button", { name: "Replace favorite 1", exact: true })
  ).toBeVisible()
  await state(request, { state: "espresso", elapsed: 12 })
  await expect(
    page.getByRole("button", { name: "Stop extraction" })
  ).toBeEnabled()
  await page.goto("/?page=settings")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings")
  await expect(
    page.getByRole("button", { name: "Stop extraction" })
  ).toBeEnabled()
})

test("library errors retry, empty states stay honest, and duplicate titles load the chosen ID", async ({
  page,
  request,
}) => {
  const original = await (
    await request.get(`${fixture}/api/v1/profiles`)
  ).json()
  await page.route(
    "**/api/v1/profiles?includeHidden=true",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Library temporarily unavailable" }),
      }),
    { times: 1 }
  )
  await page.goto("/?page=library")
  await expect(page.getByRole("alert")).toContainText(
    "Library temporarily unavailable"
  )
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Details D-Flow / default", exact: true })
  ).toBeVisible()
  await state(request, { profiles: [], favorites: [] })
  await page.reload()
  await expect(page.getByRole("main")).toContainText("No profiles saved")
  const duplicates = [
    {
      ...original[0],
      id: "duplicate-one",
      profile: { ...original[0].profile, title: "Same recipe name" },
    },
    {
      ...original[1],
      id: "duplicate-two",
      profile: {
        ...original[1].profile,
        title: "Same recipe name",
        target_weight: 42,
      },
    },
  ]
  await state(request, { profiles: duplicates })
  await page.reload()
  await page
    .getByRole("group", {
      name: "Profile Same recipe name (duplicate-two)",
      exact: true,
    })
    .getByRole("button", { name: "Load Same recipe name", exact: true })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Same recipe name"
  )
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  expect(workflow.profile.target_weight).toBe(42)
  expect(workflow.context.targetYield).toBe(42)
  expect(await saved(request)).toEqual([])
})

test.afterEach(async ({ page, request }, info) => {
  if (info.status === info.expectedStatus) return
  console.log("Stored fixture favorites:", await saved(request))
  if (page.isClosed()) return
  if (
    await page
      .getByRole("button", { name: "Browse profiles", exact: true })
      .count()
  ) {
    await page
      .getByRole("button", { name: "Browse profiles", exact: true })
      .click()
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Manage favorites", exact: true })
      .click()
  }
  console.log("Page failure state:", await page.locator("body").innerText())
})
