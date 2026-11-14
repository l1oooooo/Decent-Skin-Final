import { mkdirSync, writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { fixtureOrigin } from "./fixture-origin.js"

type MotionSample = { phase: string; ms: number }
type MotionProbe = {
  phase: string
  frames: MotionSample[]
  longTasks: MotionSample[]
  stop: () => void
}
declare global {
  interface Window {
    focusMotionProbe: MotionProbe
  }
}

test("measures approved motion frame pacing without changing telemetry", async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await request.post(`${fixtureOrigin}/__test/reset`)
  await request.post(`${fixtureOrigin}/__test/state`, {
    data: {
      recipeStore: {
        recipes: {
          "profile:1": {
            targetDoseWeight: 19,
            targetYield: 42,
            grinderSetting: "2.4",
            temperature: 91,
          },
        },
      },
    },
  })
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(
    page.getByRole("button", { name: "Increase grind size", exact: true })
  ).toBeEnabled()
  await page.screenshot({ path: "artifacts/phase6/home-1007.png" })
  await page.evaluate(() => {
    let frame = 0
    let previous = performance.now()
    const probe: MotionProbe = {
      phase: "idle",
      frames: [],
      longTasks: [],
      stop: () => {},
    }
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        probe.longTasks.push({ phase: probe.phase, ms: entry.duration })
    })
    if (PerformanceObserver.supportedEntryTypes.includes("longtask"))
      observer.observe({ type: "longtask" })
    const tick = (now: number) => {
      probe.frames.push({ phase: probe.phase, ms: now - previous })
      previous = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    probe.stop = () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
    window.focusMotionProbe = probe
  })
  const phase = (name: string) =>
    page.evaluate((value) => {
      window.focusMotionProbe.phase = value
    }, name)
  const state = async (data: Record<string, unknown>) => {
    expect(
      (await request.post(`${fixtureOrigin}/__test/state`, { data })).ok()
    ).toBe(true)
  }
  await page.waitForTimeout(1500)
  await phase("profile-switch")
  await page.locator('[aria-label="Favorite profiles"] button').nth(1).click()
  await expect(
    page.locator('[aria-label="Favorite profiles"] button').nth(1)
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator('[data-counting="true"]')).toHaveCount(0)
  await phase("home-to-brewing")
  await state({
    state: "espresso",
    substate: "preinfusion",
    shotId: "motion-probe",
    elapsed: 0,
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await page.waitForTimeout(1000)
  await page.screenshot({ path: "artifacts/phase6/brewing-1007.png" })
  await phase("rolling-status")
  await state({ substate: "pouring", elapsed: 10 })
  await expect(page.locator(".rolling-window")).toHaveText("Extraction")
  await page.waitForTimeout(500)
  await phase("timeline-expansion")
  await state({ elapsed: 35 })
  await expect(page.locator(".brew-chart-live .brew-chart")).toHaveAttribute(
    "data-displayed-duration",
    "40"
  )
  await phase("completion-and-return")
  await state({ state: "idle", elapsed: 35, reason: "apiStop" })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home"
  )
  await page.waitForTimeout(700)
  const samples = await page.evaluate(() => {
    const probe = window.focusMotionProbe
    probe.stop()
    return { frames: probe.frames, longTasks: probe.longTasks }
  })
  const phases = [...new Set(samples.frames.map((f) => f.phase))].map(
    (name) => {
      const values = samples.frames
        .filter((f) => f.phase === name)
        .map((f) => f.ms)
        .sort((a, b) => a - b)
      return {
        name,
        count: values.length,
        medianMs: values[Math.floor(values.length / 2)],
        p95Ms: values[Math.floor(values.length * 0.95)],
        maxMs: values.at(-1),
        over32Ms: values.filter((v) => v > 32).length,
      }
    }
  )
  mkdirSync("artifacts/phase6", { recursive: true })
  writeFileSync(
    "artifacts/phase6/motion-performance.json",
    JSON.stringify(
      {
        browser: await page.context().browser()!.version(),
        viewport: page.viewportSize(),
        scope:
          "Desktop headless RAF intervals across each workflow, including fixture response and settling; not Android frame rate",
        phases,
        ...samples,
      },
      null,
      2
    )
  )
  expect(samples.frames.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
  const writes = await (
    await request.get(`${fixtureOrigin}/__test/requests`)
  ).json()
  expect(
    writes.every((w: { path: string }) =>
      ["/api/v1/workflow", "/api/v1/store/decent-skin-codex/recipes"].includes(
        w.path
      )
    )
  ).toBe(true)
})
