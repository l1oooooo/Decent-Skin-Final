import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("shot heading retains its captured profile and DOM through stage updates and a new shot", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { profileTitle: "Londinium V2" },
  })
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(page.locator(".focus-profile-heading h1")).toHaveText(
    "Londinium V2"
  )
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "preinfusion",
      shotId: "title-first",
      elapsed: 0,
    },
  })
  const title = page.locator(".brew-profile-name")
  await expect(
    page.getByRole("heading", { name: "Londinium V2", exact: true })
  ).toBeVisible()
  await expect(page.locator(".rolling-status")).toHaveAttribute(
    "data-tone",
    "preinfusion"
  )
  await expect
    .poll(() =>
      page
        .locator(".candidate-header")
        .evaluate((element) => element.getBoundingClientRect().bottom)
    )
    .toBeLessThanOrEqual(0)
  const original = await title.elementHandle()
  const before = await title.boundingBox()
  await page.evaluate(() => {
    const node = document.querySelector(".brew-profile-name")!
    const changes: string[] = []
    new MutationObserver(() => changes.push(node.textContent ?? "")).observe(
      node,
      { childList: true, characterData: true, subtree: true }
    )
    Object.assign(window, { titleChanges: changes })
  })
  await request.post(`${fixture}/__test/state`, {
    data: {
      profileTitle: "Updated for the next shot",
      substate: "pouring",
      elapsed: 12,
    },
  })
  await expect(page.locator(".focus-profile-heading h1")).toHaveText(
    "Updated for the next shot"
  )
  await expect(page.locator(".rolling-status")).toHaveAttribute(
    "data-tone",
    "pouring"
  )
  await expect(page.locator(".rolling-window")).not.toHaveText("Preinfusion")
  await expect(title).toHaveText("Londinium V2")
  expect(await title.evaluate((node, old) => node === old, original)).toBe(true)
  expect(await title.boundingBox()).toEqual(before)
  expect(await title.evaluate((node) => node.getAnimations().length)).toBe(0)
  expect(
    await page.evaluate(
      () => (window as unknown as { titleChanges: string[] }).titleChanges
    )
  ).toEqual([])
  await expect(page.locator(".brew-metrics > div > span")).toHaveText([
    "Time",
    "In the cup",
    "Temperature",
    "Pressure",
    "Flow",
  ])
  await expect(page.locator(".brew-chart-live [data-series]")).toHaveCount(5)
  await page.screenshot({ path: "artifacts/v037/brewing-1007.png" })
  const lifecycle = await page.evaluate(async (origin) => {
    const root = document.querySelector(".brew-preview")!
    const title = document.querySelector(".brew-profile-name")!
    const update = (data: Record<string, unknown>) =>
      fetch(`${origin}/__test/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    const until = async (condition: () => boolean) => {
      const deadline = performance.now() + 15000
      while (!condition()) {
        if (performance.now() > deadline)
          throw new Error(`State stalled: ${root.getAttribute("data-phase")}`)
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    await update({ state: "idle", reason: "apiStop", elapsed: 25 })
    await until(() => root.getAttribute("data-phase") === "complete")
    const heldTitle = title.textContent
    await update({
      state: "espresso",
      substate: "preinfusion",
      shotId: "title-second",
      elapsed: 26,
    })
    await until(() => root.getAttribute("data-phase") === "active")
    return {
      heldTitle,
      newTitle: title.textContent,
      sameNode: title === document.querySelector(".brew-profile-name"),
    }
  }, fixture)
  expect(lifecycle).toEqual({
    heldTitle: "Londinium V2",
    newTitle: "Updated for the next shot",
    sameNode: true,
  })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "targetWeight", elapsed: 30 },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home"
  )
  await expect(page.locator(".brew-live")).toHaveAttribute(
    "aria-hidden",
    "true"
  )
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeEnabled()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("long and unbroken shot titles preserve metric and chart spacing at reference and tablet sizes", async ({
  page,
  request,
}) => {
  const name =
    "Londinium V2 — Light roast, extended preinfusion — " +
    "SingleOriginExperimentalRoast".repeat(5)
  await request.post(`${fixture}/__test/state`, {
    data: { profileTitle: name },
  })
  await page.goto("/")
  await expect(page.locator(".focus-profile-heading h1")).toHaveText(name, {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "preinfusion",
      shotId: "title-long",
      elapsed: 0,
    },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await expect
    .poll(() =>
      page
        .locator(".candidate-header")
        .evaluate((element) => element.getBoundingClientRect().bottom)
    )
    .toBeLessThanOrEqual(0)
  for (const size of [
    { width: 1340, height: 800 },
    { width: 1007, height: 601 },
    { width: 800, height: 480 },
  ]) {
    await page.setViewportSize(size)
    await expect(page.locator(".candidate-header")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    const bounds = await page.evaluate(() => {
      const title = document.querySelector<HTMLElement>(".brew-profile-name")!
      const anchor = document
        .querySelector<HTMLElement>(".brew-live-chart-anchor")!
        .getBoundingClientRect()
      const data = document.querySelector(".brew-data")!.getBoundingClientRect()
      const status = document
        .querySelector(".brew-title")!
        .getBoundingClientRect()
      const metrics = document
        .querySelector(".brew-metrics")!
        .getBoundingClientRect()
      const chart = document
        .querySelector(".brew-chart-surface")!
        .getBoundingClientRect()
      const svg = document
        .querySelector(".brew-chart-live svg")!
        .getBoundingClientRect()
      const rect = title.getBoundingClientRect()
      return {
        text: title.textContent,
        fullTitle: title.title,
        titleX: rect.x,
        statusX: status.x,
        titleBottom: rect.bottom,
        statusY: status.y,
        statusBottom: status.bottom,
        metricsY: metrics.y,
        height: rect.height,
        lineHeight: parseFloat(getComputedStyle(title).lineHeight),
        chartTop: chart.top,
        expectedTop: anchor.top,
        titleTop: rect.top,
        dataTop: data.top,
        svgTop: svg.top,
        metricsBottom: metrics.bottom,
        overflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
        titleOverflow: title.scrollWidth > title.clientWidth,
        headerBottom: document
          .querySelector(".candidate-header")!
          .getBoundingClientRect().bottom,
        chartBottom: chart.bottom,
        viewportHeight: innerHeight,
      }
    })
    expect(bounds.text).toBe(name)
    expect(bounds.fullTitle).toBe(name)
    expect(bounds.titleX).toBe(bounds.statusX)
    expect(bounds.height).toBe(bounds.lineHeight * 2)
    expect(bounds.titleTop - bounds.statusBottom).toBe(16)
    expect(bounds.dataTop - bounds.titleBottom).toBe(
      bounds.titleTop - bounds.statusBottom
    )
    expect(bounds.statusY).toBe(bounds.viewportHeight - bounds.chartBottom)
    expect(bounds.statusY).toBe(32)
    expect(bounds.metricsY).toBeGreaterThanOrEqual(bounds.titleBottom)
    expect(bounds.chartTop).toBe(bounds.expectedTop)
    expect(bounds.svgTop).toBeGreaterThanOrEqual(bounds.metricsBottom)
    expect(bounds.chartBottom).toBeLessThanOrEqual(bounds.viewportHeight)
    expect(bounds.headerBottom).toBeLessThanOrEqual(0)
    expect(bounds.overflow).toBe(false)
    expect(bounds.titleOverflow).toBe(false)
    await page.screenshot({
      path: `artifacts/v037/long-title-${size.width}.png`,
    })
  }
})
