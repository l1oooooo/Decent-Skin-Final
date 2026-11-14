import { test, expect } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"
test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})
test("extensions preserve hidden credentials and failed drafts, and build a safe return link", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=extensions&plugin=fixture.tools", {
    waitUntil: "networkidle",
  })
  await expect(
    page
      .getByRole("status", { name: "Machine state", exact: true })
      .getByText("Ready", { exact: true })
  ).toBeVisible({
    timeout: 90000,
  })
  await page
    .getByRole("button", { name: "Refresh extensions", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Save plugin settings", exact: true })
  ).toBeVisible()
  const open = page.getByRole("link", {
    name: "Open Fixture tools",
    exact: true,
  })
  await expect(open).toBeVisible()
  const url = new URL((await open.getAttribute("href"))!)
  expect(url.origin).toBe(fixture)
  const back = new URL(url.searchParams.get("returnTo")!)
  expect(back.origin).toBe(new URL(page.url()).origin)
  expect(back.searchParams.get("plugin")).toBe("fixture.tools")
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await expect(page.getByLabel("internal", { exact: true })).toHaveCount(0)
  await expect(
    page.getByLabel("Service credential", { exact: true })
  ).toHaveValue("")
  await page.getByLabel("Display name", { exact: true }).fill("My plugin")
  await page.getByLabel("Minimum shot length", { exact: true }).fill("7.5")
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/plugins/fixture.tools/settings" },
  })
  await page
    .getByRole("button", { name: "Save plugin settings", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/Section write rejected/)
  ).toBeVisible()
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "My plugin"
  )
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  await page
    .getByRole("button", { name: "Save plugin settings", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/Plugin settings acknowledged/)
  ).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.at(-1).body).toEqual({ nickname: "My plugin", threshold: 7.5 })
  const settings = await (
    await request.get(`${fixture}/api/v1/plugins/fixture.tools/settings`)
  ).json()
  expect(settings.internal).toBe("keep")
  expect(settings.token).toEqual({ isSet: true })
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Retained after shot")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 12 },
  })
  await expect(
    page.getByRole("status", {
      name: "Machine state",
      exact: true,
      includeHidden: true,
    })
  ).toHaveAttribute("data-operation", "espresso")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", elapsed: 30, reason: "targetWeight" },
  })
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await page
    .getByRole("button", { name: /^Extensions Installed plugin/ })
    .click()
  await page
    .getByRole("button", { name: "Settings for Fixture tools", exact: true })
    .click()
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Retained after shot"
  )
  await page
    .getByRole("button", { name: "Cancel plugin edits", exact: true })
    .click()
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "My plugin"
  )
})
test("plugin management requires explicit permission approval and reports partial updates", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=extensions", {
    waitUntil: "networkidle",
  })
  await page
    .getByRole("button", { name: "Disable Fixture tools", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Enable Fixture tools", exact: true })
  ).toBeEnabled()
  await page
    .getByRole("button", { name: "Enable Fixture tools", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Disable Fixture tools", exact: true })
  ).toBeEnabled()
  await request.post(`${fixture}/__test/state`, {
    data: { extensions: { updateFailure: true } },
  })
  await page
    .getByRole("button", {
      name: "Check and install plugin updates",
      exact: true,
    })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/Fixture update partially failed/)
  ).toBeVisible()
  await expect(page.getByText(/Pending version 2.0.*network.tcp/)).toBeVisible()
  let writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.some((w: { path: string }) => w.path.endsWith("/approve"))
  ).toBe(false)
  await page
    .getByRole("button", { name: "Approve pending update", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Approve pending update", exact: true })
  ).toHaveCount(0)
  await page
    .getByLabel("Plugin GitHub owner/repository", { exact: true })
    .fill("fixture/new")
  await page
    .getByRole("button", { name: "Install plugin", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Installed extension", exact: true })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Remove Installed extension", exact: true })
    .click()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.filter((w: { method: string }) => w.method === "DELETE")
  ).toHaveLength(0)
  expect(
    writes.find((w: { path: string }) => w.path.endsWith("/github-release"))
      .body
  ).toEqual({ repo: "fixture/new", includePrerelease: false })
})
test("help reads stay local and feedback requires review with retained failures", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=help", { waitUntil: "networkidle" })
  await expect(
    page
      .getByRole("status", { name: "Machine state", exact: true })
      .getByText("Ready", { exact: true })
  ).toBeVisible({
    timeout: 90000,
  })
  await page
    .getByRole("button", { name: "Refresh system status", exact: true })
    .click()
  await expect(page.getByText("Signed in", { exact: true })).toBeVisible()
  await page
    .getByRole("button", { name: "Read BLE diagnostics", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Read Decaid log", exact: true })
    .click()
  await expect(page.getByText(/Fixture diagnostic log/)).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page
    .getByRole("switch", {
      name: "Automatically check for updates",
      exact: true,
    })
    .click()
  await page
    .getByRole("button", { name: "Save system preferences", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/System preferences acknowledged/)
  ).toBeVisible()
  await page
    .getByLabel("Feedback description", { exact: true })
    .fill("Fixture review only. No external submission.")
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/feedback" },
  })
  await page
    .getByRole("button", { name: "Review and submit feedback", exact: true })
    .click()
  await expect(
    page.getByRole("dialog", { name: "Submit this feedback?", exact: true })
  ).toBeVisible()
  let writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.some((w: { path: string }) => w.path.endsWith("/feedback"))
  ).toBe(false)
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/Feedback was not confirmed/)
  ).toBeVisible()
  await expect(
    page.getByLabel("Feedback description", { exact: true })
  ).toHaveValue("Fixture review only. No external submission.")
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  await page
    .getByRole("button", { name: "Review and submit feedback", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText("Feedback acknowledged as issue #123.", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByLabel("Feedback description", { exact: true })
  ).toHaveValue("")
  writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes[0].body).toEqual({ automaticUpdateCheck: true })
  expect(writes.at(-1).body).toEqual({
    description: "Fixture review only. No external submission.",
    type: "bug",
    includeLogs: false,
    includeSystemInfo: false,
  })
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))
  ).toEqual({ width: 1340, height: 800 })
})

test("unavailable plugins and logs stay explicit; credentials clear only on Save", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { failReadPath: "/api/v1/plugins" },
  })
  await page.goto("/?page=settings&category=extensions", {
    waitUntil: "networkidle",
  })
  await expect(
    page
      .getByRole("status", { name: "Machine state", exact: true })
      .getByText("Ready", { exact: true })
  ).toBeVisible({
    timeout: 90000,
  })
  await page
    .getByRole("button", { name: "Refresh extensions", exact: true })
    .click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/plugins\s*:\s*503:/)
  ).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: "Check and install plugin updates",
      exact: true,
    })
  ).toBeDisabled()
  await expect(
    page.getByRole("heading", { name: "Fixture tools", exact: true })
  ).toHaveCount(0)
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await request.post(`${fixture}/__test/state`, {
    data: { failReadPath: null },
  })
  await page
    .getByRole("button", { name: "Refresh extensions", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Settings for Fixture tools", exact: true })
    .click()
  await page
    .getByRole("button", {
      name: "Clear Service credential on Save",
      exact: true,
    })
    .click()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page
    .getByRole("button", { name: "Save plugin settings", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText(/No credential stored/)).toBeVisible()
  expect(
    (await (await request.get(`${fixture}/__test/requests`)).json()).at(-1).body
  ).toEqual({ token: null })
  await request.post(`${fixture}/__test/state`, {
    data: {
      extensions: { account: { loggedIn: false } },
      failReadPath: "/api/v1/webview/logs",
    },
  })
  await page.goto("/?page=settings&category=help", { waitUntil: "networkidle" })
  await expect(page.getByText("Not signed in", { exact: true })).toBeVisible()
  await page
    .getByLabel("Feedback description", { exact: true })
    .fill("Retained offline feedback")
  await expect(
    page.getByRole("button", {
      name: "Review and submit feedback",
      exact: true,
    })
  ).toBeDisabled()
  await page
    .getByRole("button", { name: "Read WebView log", exact: true })
    .click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText(/503: Log unavailable/)
  ).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.map((w: { path: string }) => w.path)).toEqual([
    "/api/v1/plugins/fixture.tools/settings",
  ])
})
