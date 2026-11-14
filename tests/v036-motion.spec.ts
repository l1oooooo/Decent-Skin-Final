import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("four regions share a reversible clock, hidden navigation frees space and survives shot holds", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(
    page.locator('[aria-label="Favorite profiles"] button[aria-pressed="true"]')
  ).toHaveCount(1, { timeout: 90000 })
  const header = await page.locator(".candidate-header").elementHandle()
  const homeBounds = await page.locator(".brew-chart-surface").boundingBox()
  await page.evaluate(() => {
    const root = document.querySelector(".brew-preview")!
    const clocks: unknown[] = []
    Object.assign(window, { brewClocks: clocks })
    new MutationObserver(() => {
      const phase = root.getAttribute("data-phase")
      const entries = document.getAnimations().flatMap((a) => {
        const effect = a.effect as KeyframeEffect
        const node = effect?.target as HTMLElement | null
        if (
          !node ||
          !node.matches(
            '.candidate-header, .brew-chart-surface, .focus-controls-panel, [aria-label="Profile selection"]'
          )
        )
          return []
        return [
          {
            target: node.className,
            start: a.startTime,
            duration: effect.getTiming().duration,
          },
        ]
      })
      if (entries.length) clocks.push({ phase, entries })
    }).observe(root, { attributes: true, attributeFilter: ["data-phase"] })
  })
  const state = async (data: Record<string, unknown>) =>
    request.post(`${fixture}/__test/state`, { data })
  await state({
    state: "espresso",
    substate: "pouring",
    shotId: "v036-first",
    elapsed: 0,
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await expect
    .poll(() =>
      page
        .locator(".candidate-header")
        .evaluate((el) => el.getBoundingClientRect().bottom)
    )
    .toBeLessThanOrEqual(0)
  expect(
    await page
      .locator(".candidate-header")
      .evaluate((el) => (el as HTMLElement).inert)
  ).toBe(true)
  await expect(page.locator(".brew-metrics > div > span")).toHaveText([
    "Time",
    "In the cup",
    "Temperature",
    "Pressure",
    "Flow",
  ])
  const chartBounds = await page.locator(".brew-chart-surface").boundingBox()
  expect(chartBounds).toEqual(
    await page.locator(".brew-live-chart-anchor").boundingBox()
  )
  await page.screenshot({ path: "artifacts/v036/brewing-1007.png" })
  await state({ state: "idle", reason: "apiStop", elapsed: 25 })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "complete"
  )
  await state({
    state: "espresso",
    substate: "pouring",
    shotId: "v036-second",
    elapsed: 26,
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await state({ state: "idle", reason: "targetWeight", elapsed: 30 })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home",
    { timeout: 15000 }
  )
  expect(
    await page
      .locator(".candidate-header")
      .evaluate((el, old) => el === old, header)
  ).toBe(true)
  expect(
    await page
      .locator(".candidate-header")
      .evaluate((el) => el.getBoundingClientRect().top)
  ).toBe(0)
  expect(await page.locator(".brew-chart-surface").boundingBox()).toEqual(
    homeBounds
  )
  const clocks = await page.evaluate(
    () =>
      (
        window as unknown as {
          brewClocks: {
            phase: string
            entries: { start: number; duration: number }[]
          }[]
        }
      ).brewClocks
  )
  for (const phase of ["active", "returning"]) {
    const clock = clocks.find(
      (c) => c.phase === phase && c.entries.length === 4
    )
    expect(clock, JSON.stringify(clocks)).toBeTruthy()
    expect(new Set(clock!.entries.map((e) => e.start)).size).toBe(1)
    expect(clock!.entries.every((e) => e.duration === 600)).toBe(true)
  }
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeEnabled()
  await page.screenshot({ path: "artifacts/v036/home-1007.png" })
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true })
  ).toBeVisible()
  expect(
    await page
      .locator(".candidate-header")
      .evaluate((el, old) => el === old, header)
  ).toBe(true)
  expect(
    await page
      .locator(".candidate-header")
      .evaluate((el) => (el as HTMLElement).inert)
  ).toBe(false)
})

test("profile counters animate only acknowledged profile changes and never write intermediate values", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: {
      recipeStore: {
        recipes: {
          "profile:1": {
            targetDoseWeight: 20,
            targetYield: 40,
            grinderSetting: "2.4",
            temperature: 94,
          },
          "profile:2": {
            targetDoseWeight: 20,
            targetYield: 40,
            grinderSetting: "2.4",
            temperature: 94,
          },
          "profile:3": {
            targetDoseWeight: 18,
            targetYield: 0,
            grinderSetting: "Fine",
            temperature: 88,
          },
          "profile:4": {
            targetDoseWeight: 16,
            targetYield: 36,
            grinderSetting: "1.2",
            temperature: 90,
          },
        },
      },
    },
  })
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(
    page.locator('[aria-label="Favorite profiles"] button[aria-pressed="true"]')
  ).toHaveCount(1, { timeout: 90000 })
  const summaryNumbers = page.locator(
    '[aria-label="Recipe summary"] .profile-number'
  )
  for (const number of await summaryNumbers.all()) {
    await expect(number).toHaveCSS("font-size", "28px")
    await expect(number).toHaveCSS("margin-left", "0px")
  }
  const rows = await page.locator(".focus-stepper").elementHandles()
  const writes: unknown[] = []
  page.on("request", (req) => {
    if (req.method() === "PUT" && req.url().endsWith("/api/v1/workflow"))
      writes.push(req.postDataJSON())
  })
  const sampleSwitch = async (index: number, reverse = false) => {
    await expect(
      page.locator('[aria-label="Favorite profiles"] button').nth(index)
    ).toBeEnabled()
    return page.evaluate(
      async ({ index, reverse }) => {
        const nodes = [
          ...document.querySelectorAll<HTMLElement>("[data-profile-number]"),
        ]
        const samples: {
          text: string[]
          counting: boolean[]
          widths: number[]
          connected: boolean
        }[] = []
        const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[aria-label="Favorite profiles"] button'
          ),
        ]
        buttons[index].click()
        const start = performance.now()
        let switchedAgain = false
        await new Promise<void>((resolve, reject) => {
          const tick = () => {
            samples.push({
              text: nodes.map((n) => n.textContent!),
              counting: nodes.map((n) => n.dataset.counting === "true"),
              widths: nodes.map((n) => n.getBoundingClientRect().width),
              connected: nodes.every((n) => n.isConnected),
            })
            if (
              reverse &&
              !switchedAgain &&
              samples.at(-1)!.counting.some(Boolean) &&
              !buttons[4].disabled
            ) {
              buttons[4].click()
              switchedAgain = true
            }
            if (
              performance.now() - start > 1200 &&
              (!reverse || switchedAgain) &&
              buttons[reverse ? 4 : index].getAttribute("aria-pressed") ===
                "true" &&
              !nodes.some((n) => n.dataset.counting === "true") &&
              !buttons[index].disabled
            )
              return resolve()
            if (performance.now() - start > 10000)
              return reject(new Error("Profile switch did not settle"))
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        })
        return {
          samples,
          targets: nodes.map((n) => n.dataset.target),
          switchedAgain,
        }
      },
      { index, reverse }
    )
  }
  const first = await sampleSwitch(1)
  expect(first.samples.every((s) => s.connected)).toBe(true)
  expect(first.targets).toEqual([
    "2.0",
    "20.0",
    "40.0",
    "2.4",
    "20.0",
    "40",
    "94",
  ])
  for (let i = 0; i < 7; i++) {
    const animated = first.samples.filter((s) => s.counting[i])
    expect(animated.length).toBeGreaterThan(1)
    const endpoints = [
      Number(first.samples[0].text[i]),
      Number(first.targets[i]),
    ]
    for (const sample of animated) {
      expect(Number(sample.text[i])).toBeGreaterThanOrEqual(
        Math.min(...endpoints)
      )
      expect(Number(sample.text[i])).toBeLessThanOrEqual(Math.max(...endpoints))
    }
    expect(
      new Set(animated.map((s) => s.widths[i])).size,
      JSON.stringify({
        i,
        widths: [...new Set(animated.map((s) => s.widths[i]))],
        text: [...new Set(animated.map((s) => s.text[i]))],
      })
    ).toBe(1)
    expect(
      new Set(animated.map((s) => s.text[i])).size,
      JSON.stringify({
        i,
        frames: animated.length,
        text: animated.map((s) => s.text[i]),
      })
    ).toBeGreaterThan(1)
  }
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({
    context: { targetDoseWeight: 20, targetYield: 40, grinderSetting: "2.4" },
  })
  const identical = await sampleSwitch(2)
  expect(identical.samples.some((s) => s.counting.some(Boolean))).toBe(false)
  await page
    .getByRole("button", { name: "Increase grind size", exact: true })
    .click()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "2.5"
  )
  await expect(page.locator('[data-counting="true"]')).toHaveCount(0)
  const rapid = await sampleSwitch(1, true)
  expect(rapid.switchedAgain).toBe(true)
  expect(rapid.targets).toEqual([
    "2.3",
    "16.0",
    "36.0",
    "1.2",
    "16.0",
    "36",
    "90",
  ])
  const missing = await sampleSwitch(3)
  expect(missing.targets[3]).toBe("Fine")
  expect(missing.targets[5]).toBe("Off")
  expect(missing.samples.every((s) => !s.counting[3] && !s.counting[5])).toBe(
    true
  )
  for (let i = 0; i < rows.length; i++)
    expect(
      await page
        .locator(".focus-stepper")
        .nth(i)
        .evaluate((el, old) => el === old, rows[i])
    ).toBe(true)
  await page.emulateMedia({ reducedMotion: "reduce" })
  const reduced = await sampleSwitch(1)
  expect(reduced.samples.some((s) => s.counting.some(Boolean))).toBe(false)
  await page.screenshot({ path: "artifacts/v036/profile-switch-1007.png" })
})
