import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("one persistent, centered header across every route and tablet/reference sizes", async ({
  page,
  request,
}) => {
  let sockets = 0
  page.on("websocket", () => sockets++)
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  const header = await page.locator(".candidate-header").elementHandle()
  const routes = [
    "settings",
    "library",
    "favorites",
    "profile&profile=profile%3A0",
    "edit&profile=profile%3A0",
    "recipe&profile=profile%3A0",
    "inventory",
    "history",
    "shot&shot=shot-1",
    ...[
      "profiles",
      "inventory",
      "connections",
      "brew",
      "machine",
      "display",
      "calibration",
      "maintenance",
      "updates",
      "extensions",
      "help",
    ].map((c) => `settings&category=${c}`),
    "home",
  ]
  for (const route of routes) {
    await page.evaluate((route) => {
      history.pushState(
        { focusIndex: (history.state?.focusIndex ?? 0) + 1 },
        "",
        route === "home" ? "/" : `/?page=${route}`
      )
      dispatchEvent(new PopStateEvent("popstate"))
    }, route)
    if (route === "home")
      await expect(page.locator(".focus-profile-heading")).toBeVisible()
    else {
      const titles: Record<string, string> = {
        settings: "Settings",
        library: "Profile library",
        favorites: "Manage favorites",
        profile: "D-Flow / default",
        edit: "Profile editor",
        recipe: "Recipe preferences",
        inventory: "Coffee and equipment",
        history: "Shot history",
        shot: "Shot details",
        profiles: "Profiles and favorites",
        connections: "Connections",
        brew: "Brew and utilities",
        machine: "Machine and power",
        display: "Display and presence",
        calibration: "Calibration",
        maintenance: "Maintenance",
        updates: "Updates and data",
        extensions: "Extensions",
        help: "System and help",
      }
      const category = new URLSearchParams(route).get("category")
      await expect(page.locator(".focus-page h1")).toHaveText(
        titles[category ?? route.split("&")[0]]
      )
    }
    await expect(
      page.locator(".candidate-header, .focus-page > header")
    ).toHaveCount(1)
    expect(
      await page
        .locator(".candidate-header")
        .evaluate((node, old) => node === old, header)
    ).toBe(true)
    const g = await page.evaluate(() => {
      const header = document
        .querySelector(".candidate-header")!
        .getBoundingClientRect()
      const left = document
        .querySelector(".candidate-readouts")!
        .getBoundingClientRect()
      const right = document
        .querySelector(".candidate-actions")!
        .getBoundingClientRect()
      return {
        height: header.height,
        left: left.y + left.height / 2,
        right: right.y + right.height / 2,
        center: header.y + (header.height - 1) / 2,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(g.height).toBe(72)
    expect(Math.abs(g.left - g.center)).toBeLessThan(1)
    expect(Math.abs(g.right - g.center)).toBeLessThan(1)
    expect(g.overflow).toBe(false)
  }
  expect(sockets).toBe(5)
  await page
    .locator(".candidate-actions")
    .getByRole("button", { name: "Settings", exact: true })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  await page.goBack()
  await expect(page.locator(".focus-profile-heading")).toBeVisible()
  for (const size of [
    { width: 1007, height: 601 },
    { width: 1340, height: 800 },
    { width: 800, height: 480 },
  ]) {
    await page.setViewportSize(size)
    await expect(page.locator(".focus-controls-panel")).toBeVisible()
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight
      )
    ).toBe(true)
    await page.screenshot({ path: `artifacts/v035/home-${size.width}.png` })
  }
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("recipe taps preserve DOM, chart, focus and persistence; rapid pending taps do not replay", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  const increase = page.getByRole("button", {
    name: "Increase grind size",
    exact: true,
  })
  await expect(increase).toBeEnabled({ timeout: 90000 })
  const home = await page.locator(".brew-preview").elementHandle()
  const chart = await page.locator(".planned-chart svg").elementHandle()
  const before = await page.locator(".brew-chart-surface").boundingBox()
  await page.evaluate(() => {
    const root = document.querySelector(".brew-preview")!
    const chart = document.querySelector(".planned-chart svg")!
    const observations = {
      chartChanges: 0,
      removed: false,
      hidden: false,
      frames: 0,
      stop: false,
    }
    Object.assign(window, { observations })
    new MutationObserver((records) => {
      observations.chartChanges += records.length
    }).observe(chart, { attributes: true, childList: true, subtree: true })
    function frame() {
      observations.frames++
      observations.removed ||= !root.isConnected || !chart.isConnected
      observations.hidden ||=
        getComputedStyle(root).opacity === "0" ||
        getComputedStyle(chart.parentElement!).opacity === "0"
      if (!observations.stop) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  let release: (() => void) | undefined
  let writes = 0
  await page.route("**/api/v1/workflow", async (route) => {
    if (route.request().method() !== "PUT") return route.continue()
    writes++
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.continue()
  })
  await increase.focus()
  await page.keyboard.press("Enter")
  await expect.poll(() => !!release).toBe(true)
  await expect(increase).toBeDisabled()
  await expect(increase).toBeFocused()
  await increase.evaluate((node: HTMLButtonElement) => {
    node.click()
    node.click()
    node.click()
  })
  expect(writes).toBe(1)
  release!()
  await expect(increase).toBeEnabled()
  await expect(increase).toBeFocused()
  await page.unroute("**/api/v1/workflow")
  for (const name of [
    "Increase grind size",
    "Decrease grind size",
    "Increase drink",
    "Decrease drink",
    "Increase dose",
  ]) {
    const button = page.getByRole("button", { name, exact: true })
    await button.click()
    await expect(button).toBeEnabled()
  }
  expect(
    await page
      .locator(".brew-preview")
      .evaluate((node, old) => node === old, home)
  ).toBe(true)
  expect(
    await page
      .locator(".planned-chart svg")
      .evaluate((node, old) => node === old, chart)
  ).toBe(true)
  expect(await page.locator(".brew-chart-surface").boundingBox()).toEqual(
    before
  )
  const observations = await page.evaluate(() => {
    const o = (
      window as unknown as {
        observations: {
          stop: boolean
          chartChanges: number
          removed: boolean
          hidden: boolean
          frames: number
        }
      }
    ).observations
    o.stop = true
    return o
  })
  expect(observations.removed).toBe(false)
  expect(observations.hidden).toBe(false)
  expect(observations.chartChanges).toBe(0)
  expect(observations.frames).toBeGreaterThan(0)
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0)
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "1.9"
  )
  await expect(page.getByLabel("Drink value", { exact: true })).toHaveText(
    "50g"
  )
  await expect(
    page.getByLabel("Temperature value", { exact: true })
  ).toHaveText("88°C")
  await page
    .getByRole("button", { name: "Increase temperature", exact: true })
    .click()
  await expect(
    page.getByLabel("Temperature value", { exact: true })
  ).toHaveText("88.5°C")
  await page.reload()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "1.9",
    { timeout: 90000 }
  )
  await expect(
    page.getByLabel("Temperature value", { exact: true })
  ).toHaveText("88.5°C")
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/workflow" },
  })
  await page
    .getByRole("button", { name: "Increase drink", exact: true })
    .click()
  await expect(
    page.locator('[data-slot="toast"][data-type="error"]')
  ).toContainText("Section write rejected")
  await expect(page.getByLabel("Drink value", { exact: true })).toHaveText(
    "50g"
  )
})

test("brewing uses actual MM:SS and cup-second metrics; normal Sleep and Wake stay quiet", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready", {
    timeout: 90000,
  })
  await request.post(`${fixture}/__test/state`, {
    data: {
      state: "espresso",
      substate: "pouring",
      shotId: "v035-metrics",
      elapsed: 0,
    },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "active"
  )
  await request.post(`${fixture}/__test/state`, { data: { elapsed: 65 } })
  await expect(page.locator(".brew-metrics > div > span")).toHaveText([
    "Time",
    "In the cup",
    "Temperature",
    "Pressure",
    "Flow",
  ])
  await expect(
    page.locator(".brew-metrics > div").first().locator("p")
  ).toHaveText("01:05")
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await expect(
    page.locator(".candidate-header, .focus-page > header")
  ).toHaveCount(1)
  await page.screenshot({ path: "artifacts/v035/brewing-1007.png" })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", reason: "targetWeight", elapsed: 66 },
  })
  await expect(page.locator(".brew-preview")).toHaveAttribute(
    "data-phase",
    "home",
    { timeout: 20000 }
  )
  await page.getByRole("button", { name: "Sleep machine", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Sleeping", exact: true })
  ).toBeVisible()
  await expect(
    page.locator(".candidate-header, .focus-page > header")
  ).toHaveCount(0)
  await expect(
    page.locator(
      '[data-notification-key="machine-gate"], [data-notification-key^="skin-action-"]'
    )
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Wake machine", exact: true }).click()
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  await expect(
    page.locator('[data-notification-key^="skin-action-"]')
  ).toHaveCount(0)
})
