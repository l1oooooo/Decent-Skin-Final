import { test, expect } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"
test.setTimeout(360000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus)
    await info.attach("advanced-page-state", {
      body: await page.locator("body").innerText(),
      contentType: "text/plain",
    })
})
test("advanced page visits are read-only and keep the shared frame", async ({
  page,
  request,
}) => {
  for (const category of ["calibration", "maintenance", "machine", "updates"]) {
    await page.goto(`/?page=settings&category=${category}`, {
      waitUntil: "networkidle",
    })
    await expect(
      page.getByRole("button", {
        name: "Refresh operation status",
        exact: true,
      })
    ).toBeVisible({ timeout: 90000 })
    await expect(
      page
        .getByRole("status", { name: "Machine state", exact: true })
        .getByText("Ready", { exact: true })
    ).toBeVisible({ timeout: 90000 })
    if (category === "machine")
      await expect(
        page.getByText("Cup warming is unavailable on this machine.", {
          exact: true,
        })
      ).toBeVisible()
  }
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  expect(
    await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }))
  ).toEqual({ w: 1340, h: 800 })
  await page.screenshot({ path: "artifacts/phase-7/updates.png" })
})
test("sensor correction is confirmed, verified and cleared; flow calibration preserves workflow", async ({
  page,
  request,
}) => {
  const workflow = await (
    await request.get(`${fixture}/api/v1/workflow`)
  ).json()
  await page.goto("/?page=settings&category=calibration", {
    waitUntil: "networkidle",
  })
  await page.getByLabel("DE1 observed reading", { exact: true }).fill("8")
  await page
    .getByLabel("Measured instrument reading", { exact: true })
    .fill("8.4")
  await page
    .getByRole("switch", {
      name: "I recorded stable paired measurements and checked the instrument.",
      exact: true,
    })
    .click()
  await page
    .getByRole("button", { name: "Apply sensor correction", exact: true })
    .click()
  await expect(
    page.getByRole("dialog", {
      name: "Apply pressure correction?",
      exact: true,
    })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(/Returned pressure calibration: 1.05/)
  ).toBeVisible()
  await expect(
    page.getByLabel("DE1 observed reading", { exact: true })
  ).toHaveValue("")
  await page
    .getByRole("button", { name: "Restore factory sensor", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(/Returned pressure calibration: 1\./)
  ).toBeVisible()
  await page
    .getByLabel("Machine-estimated sample volume (ml)", { exact: true })
    .fill("100")
  await page
    .getByLabel("Measured sample volume (ml)", { exact: true })
    .fill("105")
  await page
    .getByRole("button", { name: "Apply flow multiplier", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText("Read-back flow multiplier: 1.05.", { exact: true })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/api/v1/workflow`)).json()
  ).toEqual(workflow)
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.map((w: { path: string }) => w.path)).toEqual([
    "/api/v1/machine/calibration/pressure",
    "/api/v1/machine/calibration/pressure",
    "/api/v1/machine/calibration",
  ])
})
test("maintenance requires cool steam, observes state and cancels an outstanding start in order", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { steamTemperature: 100 } },
  })
  await page.goto("/?page=settings&category=maintenance", {
    waitUntil: "networkidle",
  })
  await page
    .getByRole("switch", {
      name: "I have completed the descaling preparation.",
      exact: true,
    })
    .click()
  await expect(
    page.getByRole("button", { name: "Start descaling", exact: true })
  ).toBeDisabled()
  await page
    .getByRole("button", { name: "Disable steam heater", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText(/Steam heater disabled/)).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { steamTemperature: 50 } },
  })
  await page
    .getByRole("button", { name: "Start descaling", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText("Running: idle", { exact: true })).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "descaling", substate: "cleaningSteam" },
  })
  await expect(
    page.getByText("Running: cleaningSteam", { exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, { data: { state: "idle" } })
  await expect(page.getByText(/Cycle returned to idle/)).toBeVisible()
  let release!: () => void
  const paused = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/v1/machine/state/cleaning", async (route) => {
    await paused
    await route.continue()
  })
  await page
    .getByRole("switch", {
      name: "I have completed the cleaning preparation.",
      exact: true,
    })
    .click()
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await page
    .getByRole("button", { name: "Stop maintenance", exact: true })
    .click()
  release()
  await expect(page.getByText(/Cancel request sent/)).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.slice(-2).map((w: { path: string }) => w.path)).toEqual([
    "/api/v1/machine/state/cleaning",
    "/api/v1/machine/state/idle",
  ])
  expect(
    (await (await request.get(`${fixture}/api/v1/machine/state`)).json()).state
      .state
  ).toBe("idle")
})
test("firmware rejects verification failure and cancellation, then accepts only verified done", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { firmwareMode: "error" } },
  })
  await page.goto("/?page=settings&category=updates", {
    waitUntil: "networkidle",
  })
  const install = page.getByRole("button", {
    name: "Install firmware",
    exact: true,
  })
  await expect(install).toHaveCount(2, { timeout: 90000 })
  await expect(install.nth(0)).toBeEnabled({ timeout: 90000 })
  await expect(install.nth(1)).toBeDisabled()
  await install.nth(0).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText("Verification rejected", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText(/reported verified firmware completion/)
  ).toHaveCount(0)
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { firmwareMode: "hold" } },
  })
  await page
    .getByRole("button", { name: "Refresh operation status", exact: true })
    .click()
  await install.nth(0).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText("100%", { exact: true })).toBeVisible()
  await page
    .getByRole("button", { name: "Cancel firmware update", exact: true })
    .click()
  await expect(page.getByText(/Cancel request sent/)).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { firmwareMode: "done" } },
  })
  await page
    .getByRole("button", { name: "Refresh operation status", exact: true })
    .click()
  await install.nth(0).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(/reported verified firmware completion/)
  ).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.filter((w: { method: string }) => w.method === "DELETE")
  ).toHaveLength(1)
  expect(
    writes
      .filter((w: { path: string }) => w.path.endsWith("/apply"))
      .every((w: { body: { force: boolean } }) => w.body.force === false)
  ).toBe(true)
})
test("load-cell results and supported accessories follow the reported capabilities", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: {
      daily: { info: { model: "Bengle" } },
      advanced: {
        capabilities: ["scaleCalibration", "cupWarmer", "preheat", "ledStrip"],
      },
    },
  })
  await page.goto("/?page=settings&category=calibration", {
    waitUntil: "networkidle",
  })
  await expect(
    page.getByText("DE1 sensor calibration is unavailable for this model.", {
      exact: true,
    })
  ).toBeVisible()
  const prepared = page.getByRole("switch", {
    name: "The platform and known mass are prepared for the selected step.",
    exact: true,
  })
  await prepared.click()
  await page
    .getByRole("button", { name: "Zero unloaded scale", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText("zeroing", { exact: true })).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: {
      advanced: {
        scale: { step: "complete", subState: "done", status: "badWeight" },
      },
    },
  })
  await expect(page.getByText(/Zero step reported complete/)).toBeVisible()
  await page.getByLabel("Known mass (g)", { exact: true }).fill("500.5")
  await prepared.click()
  await page
    .getByRole("button", { name: "Latch known mass", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText("calLatch", { exact: true })).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: {
      advanced: {
        scale: {
          step: "complete",
          subState: "done",
          status: "incomplete",
          detectedCell: "a",
        },
      },
    },
  })
  await expect(page.getByText(/Latch result: incomplete; cell a/)).toBeVisible()
  await page.goto("/?page=settings&category=machine", {
    waitUntil: "networkidle",
  })
  await page
    .getByRole("switch", { name: "Manual mat heating", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Save cup warmer", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`${fixture}/api/v1/machine/cupWarmer`)
          ).json()
        ).enabled
    )
    .toBe(true)
  expect(
    (await (await request.get(`${fixture}/api/v1/machine/cupWarmer`)).json())
      .enabled
  ).toBe(true)
  await page
    .getByRole("switch", { name: "Enable scheduled preheat", exact: true })
    .click()
  await page.getByLabel("Minutes before wake", { exact: true }).fill("30")
  await page
    .getByRole("button", { name: "Save mat preheat", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`${fixture}/api/v1/machine/cupWarmer/preheat`)
          ).json()
        ).leadMinutes
    )
    .toBe(30)
  expect(
    await (
      await request.get(`${fixture}/api/v1/machine/cupWarmer/preheat`)
    ).json()
  ).toMatchObject({ enabled: true, leadMinutes: 30 })
  const before = await (
    await request.get(`${fixture}/api/v1/machine/ledStrip`)
  ).json()
  await page.getByLabel("Front strip — awake", { exact: true }).fill("#336699")
  await page.getByRole("button", { name: "Save lighting", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect
    .poll(
      async () =>
        (await (await request.get(`${fixture}/api/v1/machine/ledStrip`)).json())
          .frontStrip.awake
    )
    .toBe("330066009900")
  const palette = await (
    await request.get(`${fixture}/api/v1/machine/ledStrip`)
  ).json()
  expect(palette.frontStrip.awake).toBe("330066009900")
  expect(palette.backStrip).toEqual(before.backStrip)
})
test("backup and sync expose section failures and preserve explicit transfer choices", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=updates", {
    waitUntil: "networkidle",
  })
  await page
    .getByRole("button", { name: "Backup and transfer", exact: true })
    .click()
  const download = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export full backup", exact: true })
    .click()
  expect((await download).suggestedFilename()).toBe("decaid-backup.zip")
  await page.getByLabel("Backup ZIP", { exact: true }).setInputFiles({
    name: "fixture.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==", "base64"),
  })
  await page.getByRole("button", { name: "Import backup", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .getByText("Fixture rejected shot", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("profiles: 2 imported · 1 skipped", { exact: true })
  ).toBeVisible()
  await page
    .getByLabel("Other Decaid origin", { exact: true })
    .fill("http://other.fixture:8080")
  await page
    .getByRole("button", { name: "Start data sync", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText("pull: profiles: 2 imported · 1 skipped", { exact: true })
  ).toBeVisible()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  const sync = writes.find(
    (w: { path: string }) => w.path === "/api/v1/data/sync"
  )
  expect(sync.body).toMatchObject({
    target: "http://other.fixture:8080",
    mode: "pull",
    onConflict: "skip",
    sections: ["profiles", "shots", "beans", "grinders"],
    continueOnPullFailure: false,
  })
})
test("app and skin updates are distinct explicit actions and preserve the serving URL", async ({
  page,
  request,
}) => {
  await page.goto("/?page=settings&category=updates", {
    waitUntil: "networkidle",
  })
  const url = page.url()
  await page.getByRole("button", { name: "Decaid app", exact: true }).click()
  await page
    .getByRole("button", { name: "Check Decaid update", exact: true })
    .click()
  await expect(page.getByText(/Check requested/)).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { advanced: { app: { phase: "available" } } },
  })
  await page
    .getByRole("button", { name: "Install Decaid update", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(/Install requested. Complete any native prompts/)
  ).toBeVisible()
  await page.getByRole("button", { name: "Skins", exact: true }).click()
  await page
    .getByLabel("GitHub owner/repository", { exact: true })
    .fill("fixture/skin")
  await page.getByRole("button", { name: "Install skin", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByText(/Skin installed. Review its version/)
  ).toBeVisible()
  expect(page.url()).toBe(url)
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.map((w: { path: string }) => w.path)).toEqual([
    "/ws/v1/update",
    "/ws/v1/update",
    "/api/v1/webui/skins/install/github-release",
  ])
})
