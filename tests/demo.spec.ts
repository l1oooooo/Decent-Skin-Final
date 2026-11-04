import { test, expect } from "@playwright/test"

test("all scenarios stay local, start/stop works, and the tablet layout fits", async ({
  page,
}) => {
  const requests: string[] = [],
    sockets: string[] = [],
    errors: string[] = []
  page.on("request", (request) => requests.push(request.url()))
  page.on("websocket", (socket) => sockets.push(socket.url()))
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Ready", exact: true })
  ).toBeVisible()
  for (const scenario of ["heating", "disconnected", "error"]) {
    await page.getByLabel("Demo scenario").selectOption(scenario)
    await expect(
      page.getByRole("button", { name: "Start demo shot" })
    ).toBeDisabled()
  }
  await page.getByRole("button", { name: "Reset demo" }).click()
  await page.getByRole("button", { name: "Start demo shot" }).click()
  await page.getByRole("button", { name: "Pause demo" }).click()
  const time = await page.getByTestId("metric-time").innerText()
  await page.waitForTimeout(500)
  await expect(page.getByTestId("metric-time")).toHaveText(time)
  await page.getByRole("button", { name: "Advance 5 seconds" }).click()
  await page.getByRole("button", { name: "Stop demo shot" }).click()
  await expect(
    page.getByRole("heading", { name: "Completed", exact: true })
  ).toBeVisible()
  await page.getByLabel("Demo scenario").selectOption("completed")
  await expect(page.getByTestId("metric-yield")).toHaveText("36.0 g")
  await page.getByRole("button", { name: "Use dark theme" }).click()
  await expect(page.locator("html")).toHaveClass("dark")
  await page.reload()
  await expect(page.locator("html")).toHaveClass("dark")
  await page.getByRole("button", { name: "Use light theme" }).click()
  for (const scenario of [
    "ready",
    "heating",
    "brewing",
    "completed",
    "disconnected",
    "error",
  ]) {
    await page.getByLabel("Demo scenario").selectOption(scenario)
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewport: [innerWidth, innerHeight],
    }))
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport[0])
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewport[1])
  }
  const targets = await page
    .locator("button, select, a")
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => ({
          text: element.textContent,
          height: element.getBoundingClientRect().height,
          width: element.getBoundingClientRect().width,
        }))
    )
  expect(
    targets.filter((target) => target.height < 48 || target.width < 48)
  ).toEqual([])
  expect(
    requests.filter(
      (url) =>
        new URL(url).origin !== "http://127.0.0.1:4173" ||
        /\/api\/|\/ws\//.test(url)
    )
  ).toEqual([])
  expect(sockets).toEqual([])
  expect(errors).toEqual([])
  await page.getByLabel("Demo scenario").selectOption("completed")
  await page.screenshot({ path: "artifacts/brewing-1340x800.png" })
  await page.getByRole("button", { name: "Reset demo" }).click()
  await page.screenshot({ path: "artifacts/home-1340x800.png" })
})

test("scaled preview owns its painted bounds and responsive view fits smaller widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 750 })
  await page.goto("/?preview=tablet")
  await page.getByLabel("Demo scenario").selectOption("brewing")
  const frame = page.getByTestId("tablet-frame")
  await expect(frame).toBeVisible()
  const bounds = await frame.evaluate((element) => {
    const frameRect = element.getBoundingClientRect()
    const contentRect = element.querySelector("main")!.getBoundingClientRect()
    return {
      frameBottom: frameRect.bottom,
      contentBottom: contentRect.bottom,
      right: frameRect.right,
      width: innerWidth,
    }
  })
  // Transforms retain fractions that layout boxes round to subpixels.
  expect(bounds.contentBottom).toBeLessThanOrEqual(bounds.frameBottom + 0.1)
  expect(bounds.right).toBeLessThanOrEqual(bounds.width)
  await page.screenshot({ path: "artifacts/tablet-preview.png" })
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto("/")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.keyboard.press("Tab")
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY"
  )
})
