import { test, expect } from "@playwright/test"

const layout = () => {
  const header = document.querySelector(".candidate-header")!
  const [readouts, actions] = [...header.children].map((node) =>
    node.getBoundingClientRect()
  )
  const style = getComputedStyle(header)
  return {
    height: header.getBoundingClientRect().height,
    sameRow:
      Math.abs(
        (readouts.top + readouts.bottom) / 2 -
          (actions.top + actions.bottom) / 2
      ) < 1,
    contained:
      Math.max(readouts.bottom, actions.bottom) <=
      header.getBoundingClientRect().bottom,
    gap: actions.left - readouts.right,
    right: actions.right,
    required:
      readouts.width +
      actions.width +
      parseFloat(style.columnGap) +
      parseFloat(style.paddingLeft) +
      parseFloat(style.paddingRight),
    scroll: document.documentElement.scrollWidth,
  }
}

test("header wraps only at its intrinsic threshold, including the reported tablet viewport", async ({
  page,
}) => {
  await page.goto("/")
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1340, 1280, 1200, 1007]) {
    await page.setViewportSize({ width, height: width === 1007 ? 601 : 800 })
    const result = await page.evaluate(layout)
    expect(result.sameRow).toBe(true)
    expect(result.gap).toBeGreaterThanOrEqual(16)
    expect(result.scroll).toBe(width)
    expect(result.right).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: "artifacts/v032/home-1007.png" })
  const threshold = Math.ceil((await page.evaluate(layout)).required)
  const evidence = []
  for (const width of [threshold + 1, threshold, threshold - 1, 800]) {
    await page.setViewportSize({ width, height: 601 })
    const result = await page.evaluate(layout)
    evidence.push({ width, ...result })
    expect(result.sameRow).toBe(width >= threshold)
    expect(result.contained).toBe(true)
    expect(result.height).toBe(width >= threshold ? 72 : 96)
    expect(result.scroll).toBe(width)
    expect(result.right).toBeLessThanOrEqual(width)
  }
  console.log(JSON.stringify({ threshold, evidence }))
})

test("three regions share a timeline and reverse to the exact Home bounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(async () => {
    const surface = document.querySelector<HTMLElement>(".brew-chart-surface")!
    const left = document.querySelector<HTMLElement>(
      ".focus-body > aside:first-child"
    )!
    const right = document.querySelector<HTMLElement>(".focus-controls-panel")!
    const root = document.querySelector(".brew-preview")!
    const bounds = () =>
      [left, surface, right].map((node) => ({
        x: node.getBoundingClientRect().x,
        width: node.getBoundingClientRect().width,
      }))
    const initial = bounds()
    const phases: { phase: string | null; time: number }[] = []
    const observe = () => {
      const phase = root.getAttribute("data-phase")
      if (phases.at(-1)?.phase !== phase)
        phases.push({ phase, time: performance.now() })
    }
    const observer = new MutationObserver(observe)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-phase"],
    })
    const frames: ReturnType<typeof bounds>[] = []
    let timing: { start: number | null; duration: number | string }[] = []
    const sample = () => {
      frames.push(bounds())
      if (!timing.length)
        timing = [left, surface, right].flatMap((node) =>
          node.getAnimations().map((a) => ({
            start: a.startTime as number | null,
            duration: Number(a.effect!.getTiming().duration),
          }))
        )
      if (frames.length < 40) requestAnimationFrame(sample)
    }
    ;[...document.querySelectorAll("button")]
      .find((n) => n.textContent === "Simulate GHC brew")!
      .click()
    requestAnimationFrame(sample)
    await new Promise((r) => setTimeout(r, 1750))
    const expanded = bounds()
    ;[...document.querySelectorAll("button")]
      .find((n) => n.textContent === "Simulate GHC stop")!
      .click()
    await new Promise((r) => setTimeout(r, 2800))
    const hold = root.getAttribute("data-phase")
    const deadline = performance.now() + 12000
    while (
      root.getAttribute("data-phase") !== "home" &&
      performance.now() < deadline
    )
      await new Promise((r) => setTimeout(r, 50))
    observer.disconnect()
    return {
      phases,
      hidden: document.hidden,
      initial,
      expanded,
      frames,
      timing,
      hold,
      final: bounds(),
      phase: root.getAttribute("data-phase"),
      toast: document.querySelector(".brew-toast")!.textContent,
    }
  })
  console.log(
    JSON.stringify({
      phases: result.phases,
      hidden: result.hidden,
      phase: result.phase,
    })
  )
  expect(result.timing).toHaveLength(3)
  expect(new Set(result.timing.map((a) => a.start)).size).toBe(1)
  expect(result.timing.every((a) => a.duration === 500)).toBe(true)
  expect(
    result.frames.some(
      (f) =>
        f[0].x < 0 &&
        f[0].x > result.expanded[0].x &&
        f[1].width > result.initial[1].width &&
        f[1].width < result.expanded[1].width &&
        f[2].x > result.initial[2].x
    )
  ).toBe(true)
  expect(result.hold).toBe("complete")
  const complete = result.phases.find((p) => p.phase === "complete")!
  const returning = result.phases.find((p) => p.phase === "returning")!
  expect(returning.time - complete.time).toBeGreaterThanOrEqual(2900)
  expect(result.phase).toBe("home")
  expect(result.final).toEqual(result.initial)
  expect(result.toast).toBe("Shot stopped")
  await page.screenshot({ path: "artifacts/v032/returned-1007.png" })
})

test("long extraction zooms continuously while samples arrive and resets for a new shot", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") })
  await page.goto("/")
  await page.clock.pauseAt(new Date("2026-11-07T12:01:00Z"))
  await page
    .getByRole("button", { name: "Test scenarios" })
    .click({ force: true })
  await page
    .getByRole("combobox", { name: "Telemetry", exact: true })
    .selectOption("long")
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  await page.clock.runFor(31250)
  const chart = page.locator(".brew-chart-live .brew-chart")
  const measure = () =>
    chart.evaluate((node) => ({
      display: Number(node.getAttribute("data-displayed-duration")),
      target: Number(node.getAttribute("data-duration")),
      samples: Number(node.getAttribute("data-samples")),
    }))
  const first = await measure()
  await page.clock.runFor(100)
  const middle = await measure()
  await page.clock.runFor(500)
  const end = await measure()
  console.log(JSON.stringify({ first, middle, end }))
  expect(middle.display).toBeGreaterThan(30)
  expect(middle.display).toBeLessThan(40)
  expect(middle.samples).toBeGreaterThan(first.samples)
  expect(end.display).toBe(40)
  await expect(chart.locator("[data-series]")).toHaveCount(5)
  await page.screenshot({ path: "artifacts/v032/long-extraction.png" })
  await page
    .getByRole("button", { name: "Start new shot" })
    .click({ force: true })
  expect((await measure()).display).toBe(30)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.clock.runFor(31350)
  const reduced = await measure()
  expect(reduced.display).toBe(reduced.target)
  expect(
    await page
      .locator(".brew-chart-surface")
      .evaluate((n) => n.getAnimations().length)
  ).toBe(0)
})

test("restart during the return retargets from current bounds and navigation cancels motion", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Test scenarios" }).click()
  const result = await page.evaluate(async () => {
    const click = (text: string) =>
      [...document.querySelectorAll("button")]
        .find((n) => n.textContent === text)!
        .click()
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const surface = document.querySelector(".brew-chart-surface")!
    const root = document.querySelector(".brew-preview")!
    click("Start new shot")
    await wait(1700)
    click("Simulate GHC stop")
    const interruption = await new Promise<{
      phase: string | null
      before: number
      after: number
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        observer.disconnect()
        reject(new Error("Return did not begin"))
      }, 15000)
      let before: number | null = null
      const observer = new MutationObserver(() => {
        const phase = root.getAttribute("data-phase")
        if (phase === "returning" && before === null) {
          for (const node of [
            surface,
            ...document.querySelectorAll(".focus-body > aside"),
          ])
            for (const animation of node.getAnimations()) {
              animation.pause()
              animation.currentTime = 250
            }
          before = surface.getBoundingClientRect().width
          click("Start new shot")
        } else if (phase === "preparing" && before !== null) {
          clearTimeout(timeout)
          observer.disconnect()
          resolve({
            phase: "returning",
            before,
            after: surface.getBoundingClientRect().width,
          })
        }
      })
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["data-phase"],
      })
    })
    await wait(800)
    const settled = surface.getBoundingClientRect().width
    const toast = document.querySelector(".brew-toast")!.textContent
    click("Navigate away")
    await wait(100)
    return {
      ...interruption,
      settled,
      toast,
      detached: !surface.isConnected,
    }
  })
  expect(result.phase).toBe("returning")
  expect(Math.abs(result.after - result.before)).toBeLessThan(25)
  expect(result.settled).toBe(1284)
  expect(result.toast).toBe("")
  expect(result.detached).toBe(true)
  await expect(
    page.getByRole("heading", { name: "You’ve left the brewing view." })
  ).toBeVisible()
})
