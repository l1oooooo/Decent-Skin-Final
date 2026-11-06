import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { fixtureOrigin as fixture } from "./fixture-origin.js"
test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})
test("history filters, paging, detail and Back share one read-only session", async ({
  page,
  request,
}) => {
  const base = await (
    await request.get(`${fixture}/api/v1/shots/record`)
  ).json()
  const shots = Array.from({ length: 23 }, (_, i) => ({
    ...base,
    id: `shot:${i}`,
    timestamp: new Date(Date.parse(base.timestamp) + i * 60000).toISOString(),
    workflow: {
      ...base.workflow,
      profile: { ...base.workflow.profile, title: `Recipe ${i}` },
      context: {
        ...base.workflow.context,
        coffeeName: i % 2 ? "Ethiopia" : "Colombia",
      },
    },
  }))
  await request.post(`${fixture}/__test/state`, { data: { shots } })
  let sockets = 0
  page.on("websocket", () => sockets++)
  await page.goto("/?page=history")
  await expect(
    page.getByText("23 matching shots", { exact: false })
  ).toBeVisible()
  await page.getByRole("button", { name: "Next page", exact: true }).click()
  await expect(page.getByText("21–23", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: /Recipe 0.*annotated yield/ }).click()
  await expect(page).toHaveURL(/page=shot&shot=shot%3A0/)
  await expect(
    page.getByRole("region", { name: "Recorded curves" })
  ).toBeVisible()
  await page.goBack()
  await expect(page.getByText("21–23", { exact: false })).toBeVisible()
  await page.getByLabel("Coffee name", { exact: true }).fill("Ethiopia")
  await page.getByRole("button", { name: "Apply filters", exact: true }).click()
  await expect(
    page.getByText("11 matching shots", { exact: false })
  ).toBeVisible()
  expect(sockets).toBe(5)
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  expect(
    await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }))
  ).toEqual({ w: 1340, h: 800 })
  await page.screenshot({ path: "artifacts/phase-6/history.png" })
})
test("annotations retain failed and newer edits, clear canonical notes and never rewrite measurements", async ({
  page,
  request,
}) => {
  const original = await (
    await request.get(`${fixture}/api/v1/shots/record`)
  ).json()
  await page.goto("/?page=shot&shot=record")
  await expect(page.getByLabel("Shot notes", { exact: true })).toHaveValue(
    "Sweet and balanced"
  )
  await page.getByLabel("Enjoyment (0–10)", { exact: true }).fill("11")
  await page
    .getByRole("button", { name: "Save annotations", exact: true })
    .click()
  await expect(
    page.getByText("Enjoyment (0–10): enter 0–10, or leave blank.", {
      exact: true,
    })
  ).toBeVisible()
  await page.getByLabel("Enjoyment (0–10)", { exact: true }).fill("9")
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/shots/record" },
  })
  await page
    .getByRole("button", { name: "Save annotations", exact: true })
    .click()
  await expect(page.getByText(/500: Section write rejected/)).toBeVisible()
  await expect(
    page.getByLabel("Enjoyment (0–10)", { exact: true })
  ).toHaveValue("9")
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/v1/shots/record", async (route) => {
    if (route.request().method() === "PUT") await pending
    await route.continue()
  })
  await page
    .getByRole("button", { name: "Save annotations", exact: true })
    .click()
  await page.getByLabel("Shot notes", { exact: true }).fill("Newer note")
  release()
  await expect(
    page.getByText("Annotations saved. Newer edits are still unsaved.", {
      exact: true,
    })
  ).toBeVisible()
  await page.getByRole("button", { name: "Refresh shot", exact: true }).click()
  await expect(page.getByLabel("Shot notes", { exact: true })).toHaveValue(
    "Newer note"
  )
  await page.getByLabel("Shot notes", { exact: true }).fill("")
  await page.getByLabel("Actual yield (g)", { exact: true }).fill("")
  await page
    .getByRole("button", { name: "Save annotations", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Save annotations", exact: true })
  ).toBeDisabled()
  await expect(
    page.getByText("Annotations saved.", { exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Shot notes", { exact: true })).toHaveValue("")
  const saved = await (
    await request.get(`${fixture}/api/v1/shots/record`)
  ).json()
  expect(saved.measurements).toEqual(original.measurements)
  expect(saved.workflow).toEqual(original.workflow)
  expect(saved.annotations).toMatchObject({
    enjoyment: 9,
    espressoNotes: "",
    extras: { source: "fixture" },
  })
  expect(saved.annotations.actualYield).toBeUndefined()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  for (const write of writes)
    expect(Object.keys(write.body)).toEqual(["annotations"])
  await page.screenshot({ path: "artifacts/phase-6/shot.png" })
})
test("repeat loads only the recorded recipe; export and confirmed deletion report real outcomes", async ({
  page,
  request,
}) => {
  const original = await (
    await request.get(`${fixture}/api/v1/shots/record`)
  ).json()
  await page.goto("/?page=shot&shot=record")
  await expect(
    page.getByRole("button", { name: "Repeat recipe", exact: true })
  ).toBeEnabled()
  await page.getByRole("button", { name: "Repeat recipe", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "D-Flow / default", exact: true })
  ).toBeVisible()
  let writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.map((w: { path: string }) => w.path)).toEqual([
    "/api/v1/workflow",
  ])
  expect(Object.keys(writes[0].body)).toEqual(["profile", "context"])
  await page.getByRole("button", { name: "History", exact: true }).click()
  await page
    .getByRole("button", { name: /D-Flow \/ default.*annotated yield/ })
    .click()
  const download = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export saved shot", exact: true })
    .click()
  const file = await download
  expect(JSON.parse(await readFile((await file.path())!, "utf8"))).toEqual([
    original,
  ])
  await page.getByRole("button", { name: "Delete shot", exact: true }).click()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes.some((w: { method: string }) => w.method === "DELETE")).toBe(
    false
  )
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/shots/record" },
  })
  await page.getByRole("button", { name: "Delete shot", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(page.getByText(/500: Section write rejected/)).toBeVisible()
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  await page.getByRole("button", { name: "Delete shot", exact: true }).click()
  await page.getByRole("button", { name: "Confirm", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Shot history", exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("0 matching shots", { exact: false })
  ).toBeVisible()
})
test("history handles missing data and retains annotation drafts through physical-shot interruption", async ({
  page,
  request,
}) => {
  await page.goto("/?page=shot&shot=missing")
  await expect(
    page.getByText("404: Shot not found", { exact: true })
  ).toBeVisible()
  await page.goto("/?page=shot&shot=record")
  await page
    .getByLabel("Shot notes", { exact: true })
    .fill("Retained during brewing")
  await page
    .getByRole("button", { name: "Return to Home", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 4 },
  })
  await expect(
    page.getByRole("status", { name: "Group-head stop espresso", exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "targetWeight" },
  })
  const retained = await (
    await request.get(`${fixture}/api/v1/shots/record`)
  ).json()
  await request.post(`${fixture}/__test/state`, {
    data: {
      shots: [
        retained,
        {
          ...retained,
          id: "another",
          workflow: {
            ...retained.workflow,
            profile: { ...retained.workflow.profile, title: "Another shot" },
          },
        },
      ],
    },
  })
  await page.getByRole("button", { name: "History", exact: true }).click()
  await page
    .getByRole("button", { name: /Another shot.*annotated yield/ })
    .click()
  await expect(
    page.getByText(
      "Save or cancel annotations on the previous shot before opening another.",
      { exact: true }
    )
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Return to unsaved shot", exact: true })
    .click()
  await expect(page.getByLabel("Shot notes", { exact: true })).toHaveValue(
    "Retained during brewing"
  )
  await page
    .getByRole("button", { name: "Cancel annotations", exact: true })
    .click()
  const partial = {
    id: "partial",
    timestamp: "bad",
    workflow: { profile: { title: "Incomplete", steps: [] } },
    annotations: {},
    measurements: [],
  }
  await request.post(`${fixture}/__test/state`, { data: { shots: [partial] } })
  await page.goto("/?page=shot&shot=partial")
  await expect(
    page.getByText(
      "No usable recorded measurements are available. A recipe preview is not substituted.",
      { exact: true }
    )
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Repeat recipe", exact: true })
  ).toBeDisabled()
  await page.goto("/?page=history")
  await request.post(`${fixture}/__test/state`, {
    data: { failReadPath: "/api/v1/shots" },
  })
  await page
    .getByRole("button", { name: "Refresh history", exact: true })
    .click()
  await expect(
    page.getByText("503: Read unavailable", { exact: true })
  ).toBeVisible()
  await request.post(`${fixture}/__test/state`, {
    data: { failReadPath: null },
  })
  await page.getByRole("button", { name: "Retry history", exact: true }).click()
  await expect(
    page.getByText("1 matching shot", { exact: false })
  ).toBeVisible()
})
