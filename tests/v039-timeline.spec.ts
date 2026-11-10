import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

for (const [width, height] of [
  [1007, 601],
  [1340, 800],
  [800, 480],
]) {
  test(`forty-second live timeline preserves geometry and telemetry at ${width}x${height}`, async ({
    page,
    request,
  }) => {
    test.setTimeout(240000)
    await request.post(`${fixture}/__test/reset`)
    await page.setViewportSize({ width, height })
    await page.goto("/")
    await expect(
      page.locator(
        '[aria-label="Favorite profiles"] button[aria-pressed="true"]'
      )
    ).toHaveCount(1, { timeout: 90000 })
    const preview = page.locator(".brew-chart-preview .brew-chart")
    const home = await preview.evaluate((el) => ({
      duration: el.getAttribute("data-duration"),
      paths: [...el.querySelectorAll("path")].map((p) => p.getAttribute("d")),
      bounds: el.getBoundingClientRect().toJSON(),
    }))
    const state = async (data: Record<string, unknown>) =>
      request.post(`${fixture}/__test/state`, { data })
    await state({ state: "espresso", shotId: "timeline", elapsed: 0 })
    const root = page.locator(".brew-preview")
    const chart = page.locator(".brew-chart-live .brew-chart")
    await expect(root).toHaveAttribute("data-phase", "active")
    await expect(chart).toHaveAttribute("data-displayed-duration", "40")
    await expect
      .poll(() =>
        page
          .locator(".brew-chart-surface")
          .evaluate((el) => el.getAnimations().length)
      )
      .toBe(0)
    const bounds = await chart.boundingBox()
    const svg = await chart.elementHandle()
    const checkpoints = [25, 35, 39, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120]
    let previousSamples = 0
    for (const elapsed of checkpoints) {
      await state({ elapsed })
      await expect(
        page.locator(".brew-metrics > div").first().locator("p")
      ).toHaveText(
        `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
      )
      const target = Math.max(40, (Math.floor(elapsed / 10) + 1) * 10)
      await expect(chart).toHaveAttribute("data-duration", String(target))
      await expect(chart).toHaveAttribute(
        "data-displayed-duration",
        String(target)
      )
      const data = await chart.evaluate((el) => {
        const clip = el.querySelector("clipPath rect")!
        const d = el
          .querySelector('[data-series="pressure"]')!
          .getAttribute("d")!
        const coordinates = [...d.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(
          (m) => [Number(m[1]), Number(m[2])]
        )
        return {
          samples: Number(el.getAttribute("data-samples")),
          left: Number(clip.getAttribute("x")),
          right:
            Number(clip.getAttribute("x")) + Number(clip.getAttribute("width")),
          top: Number(clip.getAttribute("y")),
          bottom:
            Number(clip.getAttribute("y")) +
            Number(clip.getAttribute("height")),
          coordinates,
          series: [...el.querySelectorAll("[data-series]")].map((p) =>
            p.getAttribute("d")
          ),
        }
      })
      expect(await chart.boundingBox()).toEqual(bounds)
      expect(await chart.evaluate((el, original) => el === original, svg)).toBe(
        true
      )
      expect(data.samples).toBeGreaterThan(previousSamples)
      previousSamples = data.samples
      expect(data.series).toHaveLength(5)
      expect(data.series.every((d) => !!d && !/NaN|Infinity/.test(d))).toBe(
        true
      )
      const last = data.coordinates.at(-1)!
      expect(last[0]).toBeCloseTo(
        data.left + (elapsed / target) * (data.right - data.left),
        1
      )
      expect(last[0]).toBeLessThan(data.right)
      expect(last[1]).toBeCloseTo(
        data.bottom - (9 / 12) * (data.bottom - data.top),
        1
      )
      await expect(
        page.locator(".brew-metrics > div").nth(3).locator("p")
      ).toHaveText("9.0bar")
    }
    await page.screenshot({ path: `artifacts/v039/live-120-${width}.png` })
    await state({ state: "idle", reason: "targetWeight", elapsed: 120 })
    await expect(root).toHaveAttribute("data-phase", "home")
    const returned = await preview.evaluate((el) => ({
      duration: el.getAttribute("data-duration"),
      paths: [...el.querySelectorAll("path")].map((p) => p.getAttribute("d")),
      bounds: el.getBoundingClientRect().toJSON(),
    }))
    expect(returned).toEqual(home)
    await state({ state: "espresso", shotId: "timeline-next", elapsed: 121 })
    await expect(root).toHaveAttribute("data-phase", "active")
    await expect(chart).toHaveAttribute("data-displayed-duration", "40")
    expect(
      await (await request.get(`${fixture}/__test/requests`)).json()
    ).toEqual([])
  })
}
