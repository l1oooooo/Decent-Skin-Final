import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("real fixture events drive five traces, a frozen completion and one automatic return", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await expect(page.getByLabel("Tank volume")).toContainText("2058")
  await expect(
    page.getByRole("button", { name: /Simulate|Test scenarios|Start brew/ })
  ).toHaveCount(0)
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "preparingForShot",
      shotId: "phase-five-one",
      elapsed: 1,
    },
  })
  await expect(page.locator(".rolling-window")).toHaveText("Preparing")
  await expect(page.locator(".rolling-status")).toHaveAttribute(
    "data-tone",
    "preparing"
  )
  await expect(page.locator(".candidate-status")).toHaveText("DE1Heating")
  await request.post(`${fixture}/__test/state`, {
    data: { elapsed: 8, substate: "preinfusion" },
  })
  await expect(page.locator(".rolling-status")).toHaveAttribute(
    "data-tone",
    "preinfusion"
  )
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await request.post(`${fixture}/__test/state`, {
    data: { elapsed: 12, substate: "pouring" },
  })
  const chart = page.locator(".brew-chart-surface")
  await expect(chart.locator("[data-series]")).toHaveCount(5)
  await expect(chart.locator("[data-area]")).toHaveCount(2)
  for (const key of [
    "pressure",
    "targetPressure",
    "flow",
    "groupTemperature",
    "weightFlow",
  ])
    await expect(chart.locator(`[data-series=${key}]`)).toHaveAttribute(
      "d",
      /M.+L/
    )
  await expect(page.locator(".rolling-window")).toHaveText("Extraction")
  await page.screenshot({
    path: "artifacts/phase-5/production-brewing-1340.png",
  })
  const completion = await page.evaluate(async (origin) => {
    const root = document.querySelector(".brew-preview")!
    const toast = document.querySelector(".brew-toast")!
    const chart = document.querySelector(".brew-chart-surface")!
    const phases: { phase: string; time: number }[] = []
    const toasts: string[] = []
    const traces = new Set<string>()
    let previousToast = ""
    const observe = () => {
      const phase = root.getAttribute("data-phase")!
      if (phases.at(-1)?.phase !== phase)
        phases.push({ phase, time: performance.now() })
      if (phase === "complete")
        traces.add(
          chart.querySelector("[data-series=pressure]")!.getAttribute("d")!
        )
      const text = toast.textContent ?? ""
      if (text && text !== previousToast) toasts.push(text)
      previousToast = text
    }
    const observer = new MutationObserver(observe)
    observer.observe(root, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    })
    observe()
    const update = (data: Record<string, unknown>) =>
      fetch(`${origin}/__test/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    try {
      await update({ state: "idle", elapsed: 30, reason: "targetWeight" })
      // Observe the entire short hold in the browser; test-driver round trips can
      // otherwise outlast the hold and compare paths after the chart resizes Home.
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(timer)
          reject(new Error("Completion did not return Home"))
        }, 15000)
        const timer = setInterval(() => {
          if (
            root.getAttribute("data-phase") === "home" &&
            toast.textContent === "Shot completed"
          ) {
            clearInterval(timer)
            clearTimeout(timeout)
            resolve()
          }
        }, 50)
      })
      await update({ elapsed: 31, reason: "targetWeight" })
      await new Promise((resolve) => setTimeout(resolve, 2700))
      observe()
      return {
        phases,
        toasts,
        traceCount: traces.size,
        finalToast: toast.textContent,
      }
    } finally {
      observer.disconnect()
    }
  }, fixture)
  expect(completion.phases.map((entry) => entry.phase)).toEqual([
    "active",
    "complete",
    "returning",
    "home",
  ])
  const finished = completion.phases.find(
    (entry) => entry.phase === "complete"
  )!
  const returning = completion.phases.find(
    (entry) => entry.phase === "returning"
  )!
  expect(returning.time - finished.time).toBeGreaterThanOrEqual(2800)
  expect(completion.traceCount).toBe(1)
  expect(completion.toasts).toEqual(["Shot completed"])
  expect(completion.finalToast).toBe("")
  await expect(
    page.getByRole("heading", { name: "D-Flow / default" })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("rapid restart cancels the old hold; missing scale and disconnect never invent readings", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 1, shotId: "first" },
  })
  await request.post(`${fixture}/__test/state`, { data: { elapsed: 2 } })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", elapsed: 3, reason: "apiStop" },
  })
  await expect(page.locator(".rolling-window")).toHaveText("Shot stopped")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", elapsed: 4, shotId: "second" },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await request.post(`${fixture}/__test/state`, {
    data: { elapsed: 12, scale: false },
  })
  await expect(page.locator(".brew-scale-note")).toBeVisible()
  await expect(page.locator(".brew-metrics")).toContainText("—g")
  await expect(page.locator(".brew-toast")).toHaveText("")
  await request.post(`${fixture}/__test/state`, { data: { connected: false } })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Disconnected")
  await expect(page.locator(".rolling-window")).toHaveText("Connection lost")
  await expect(
    page.getByLabel("Group temperature", { exact: true })
  ).toContainText("—")
  await expect(page.getByLabel("Tank volume")).toContainText("—")
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeDisabled()
  await request.post(`${fixture}/__test/state`, {
    data: { connected: true, state: "idle", scale: true },
  })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await expect(page.locator(".rolling-window")).toHaveText("Connection lost")
  await page.getByRole("button", { name: "Back to Home" }).click()
  await expect(
    page.getByRole("heading", { name: "D-Flow / default" })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})
