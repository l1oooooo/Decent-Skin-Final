import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test("live domain retargeting keeps telemetry, ticks and stage positions coherent", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/reset`)
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await request.post(`${fixture}/__test/state`, {
    data: { state: "espresso", shotId: "motion-one", elapsed: 0 },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await expect
    .poll(() =>
      page
        .locator(".brew-chart-surface")
        .evaluate((el) => el.getAnimations().length)
    )
    .toBe(0)
  await request.post(`${fixture}/__test/state`, { data: { elapsed: 34 } })
  await expect(
    page.locator(".brew-metrics > div").first().locator("p")
  ).toHaveText("00:34")
  const evidence = await page.evaluate(async (origin) => {
    const chart = document.querySelector(".brew-chart-live .brew-chart")!
    const frames: {
      display: number
      target: number
      samples: number
      aligned: boolean
    }[] = []
    const update = async (data: Record<string, unknown>) => {
      await fetch(`${origin}/__test/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    }
    let running = true
    const sample = () => {
      const display = Number(chart.getAttribute("data-displayed-duration"))
      const rect = chart.querySelector("clipPath rect")!
      const left = Number(rect.getAttribute("x")),
        width = Number(rect.getAttribute("width"))
      const tick = chart.querySelector<SVGTextElement>('text[data-time="10"]')!
      frames.push({
        display,
        target: Number(chart.getAttribute("data-duration")),
        samples: Number(chart.getAttribute("data-samples")),
        aligned:
          Math.abs(
            Number(tick.getAttribute("x")) - (left + (10 / display) * width)
          ) < 0.001,
      })
      if (running) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    await update({ elapsed: 35.1 })
    await new Promise((r) => setTimeout(r, 140))
    await update({ elapsed: 35.2 })
    await new Promise((r) => setTimeout(r, 90))
    await update({ elapsed: 40.1 })
    const deadline = performance.now() + 15000
    while (
      (chart.getAttribute("data-duration") !== "50" ||
        chart.getAttribute("data-displayed-duration") !== "50") &&
      performance.now() < deadline
    )
      await new Promise((r) => setTimeout(r, 50))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    running = false
    return {
      hidden: document.hidden,
      phase: document
        .querySelector(".brew-preview")!
        .getAttribute("data-phase"),
      frames,
      pressure: chart
        .querySelector('[data-series="pressure"]')!
        .getAttribute("d"),
    }
  }, fixture)
  console.log(
    JSON.stringify({
      hidden: evidence.hidden,
      phase: evidence.phase,
      frames: evidence.frames.length,
      first: evidence.frames[0],
      last: evidence.frames.at(-1),
    })
  )
  expect(evidence.frames.some((f) => f.display > 35 && f.display < 40)).toBe(
    true
  )
  expect(evidence.frames.some((f) => f.target === 50 && f.display < 50)).toBe(
    true
  )
  expect(evidence.frames.every((f) => f.aligned)).toBe(true)
  const end = evidence.frames.at(-1)!
  expect(end.display).toBe(50)
  expect(end.samples).toBeGreaterThan(evidence.frames[0].samples)
  expect(evidence.pressure).toMatch(/M.+L/)
  for (let i = 1; i < evidence.frames.length; i++)
    expect(evidence.frames[i].display).toBeGreaterThanOrEqual(
      evidence.frames[i - 1].display
    )
  await page.emulateMedia({ reducedMotion: "reduce" })
  await request.post(`${fixture}/__test/state`, { data: { elapsed: 50.1 } })
  await expect(page.locator(".brew-chart-live .brew-chart")).toHaveAttribute(
    "data-displayed-duration",
    "60"
  )
  await page.screenshot({ path: "artifacts/v032/production-long-1007.png" })
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})
