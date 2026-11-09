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
  const chart = page.locator(".brew-chart-live")
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
    const toast = () =>
      document.querySelector(
        '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
      )?.textContent ?? ""
    const chart = document.querySelector(".brew-chart-live")!
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
      const text = toast() ?? ""
      if (text && text !== previousToast) toasts.push(text)
      previousToast = text
    }
    const observer = new MutationObserver(observe)
    observer.observe(document.body, {
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
            toast() === "Shot completed"
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
        finalToast: toast(),
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
  page.on("requestfailed", (request) =>
    console.log("Failed request", request.url(), request.failure())
  )
  page.on("response", (response) => {
    if (response.status() >= 400)
      console.log("HTTP error", response.status(), response.url())
  })
  page.on("websocket", (socket) =>
    socket.on("close", () => console.log("Socket closed", socket.url()))
  )
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  const restart = await page.evaluate(async (origin) => {
    const root = document.querySelector(".brew-preview")!
    const status = document.querySelector(".rolling-window")!
    const update = async (data: Record<string, unknown>) => {
      const response = await fetch(`${origin}/__test/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Fixture state update failed")
    }
    const until = async (predicate: () => boolean) => {
      const deadline = performance.now() + 12000
      while (!predicate()) {
        if (performance.now() > deadline)
          throw new Error(
            `Fixture transition stalled: ${root.getAttribute("data-phase")} / ${status.textContent}`
          )
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
    }
    await update({ state: "espresso", elapsed: 1, shotId: "first" })
    await update({ elapsed: 2 })
    await until(() => root.getAttribute("data-phase") === "active")
    await update({ state: "idle", elapsed: 3, reason: "apiStop" })
    await until(() => status.textContent === "Shot stopped manually")
    const stopped = status.textContent
    const stopTime = performance.now()
    await update({ state: "espresso", elapsed: 4, shotId: "second" })
    await until(() => root.getAttribute("data-phase") === "active")
    return { stopped, restartDelay: performance.now() - stopTime }
  }, fixture)
  expect(restart.stopped).toBe("Shot stopped manually")
  expect(restart.restartDelay).toBeLessThan(3000)
  await request.post(`${fixture}/__test/state`, {
    data: { elapsed: 12, scale: false },
  })
  await expect(
    page.locator('[data-notification-key="shot-scale"]')
  ).toBeVisible()
  await expect(page.locator(".brew-metrics")).toContainText("—g")
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveCount(0)
  await request.post(`${fixture}/__test/state`, { data: { connected: false } })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Disconnected")
  await expect(page.locator(".rolling-window")).toHaveText("Connection lost")
  await expect(
    page.getByLabel("Group temperature", { exact: true })
  ).toContainText("—")
  await expect(page.getByLabel("Tank volume")).toContainText("—")
  await expect(
    page.getByRole("button", { name: "Sleep machine", includeHidden: true })
  ).toBeDisabled()
  await request.post(`${fixture}/__test/state`, {
    data: { connected: true, state: "idle", scale: true },
  })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await expect(page.locator(".rolling-window")).toHaveText("Connection lost")
  await page.keyboard.press("F6")
  await page.getByRole("button", { name: "Back to Home" }).click()
  await expect(
    page.getByRole("heading", { name: "D-Flow / default" })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})
