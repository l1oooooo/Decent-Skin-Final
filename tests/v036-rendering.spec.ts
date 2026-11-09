import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("setting updates retain rows and Sleep with stable paint and guarded pending actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  await expect(
    page.getByRole("button", { name: "Increase grind size", exact: true })
  ).toBeEnabled({ timeout: 90000 })
  await expect(
    page.locator('[aria-label="Favorite profiles"] button[aria-pressed="true"]')
  ).toHaveCount(1)
  await page.evaluate(() => {
    const selectors = [
      ".focus-stepper",
      ".focus-stepper > p",
      ".focus-stepper output",
      ".focus-stepper button",
      '[aria-label="Sleep machine"]',
      ".candidate-status",
      ".focus-profile-heading",
    ]
    const nodes = selectors.flatMap((s) => [
      ...document.querySelectorAll<HTMLElement>(s),
    ])
    const paint = (el: HTMLElement) => {
      const s = getComputedStyle(el)
      return [
        s.opacity,
        s.visibility,
        s.display,
        s.color,
        s.backgroundColor,
        s.transform,
      ].join("|")
    }
    const records = nodes.map((el) => ({
      el,
      label: el.getAttribute("aria-label") || el.textContent?.slice(0, 35),
      paints: new Set([paint(el)]),
      removed: false,
      animations: new Set<string>(),
    }))
    const audit = { records, stop: false, frames: 0 }
    Object.assign(window, { renderAudit: audit })
    const frame = () => {
      audit.frames++
      records.forEach((r) => {
        r.removed ||= !r.el.isConnected
        r.paints.add(paint(r.el))
        r.el
          .getAnimations()
          .forEach((a) =>
            r.animations.add(
              String(
                (a.effect as KeyframeEffect)
                  ?.getKeyframes()
                  .map((f) => Object.keys(f).join(","))
              )
            )
          )
      })
      if (!audit.stop) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  for (const name of [
    "Increase grind size",
    "Decrease grind size",
    "Increase dose",
    "Decrease dose",
    "Increase target yield",
    "Decrease target yield",
    "Increase temperature",
    "Decrease temperature",
  ]) {
    const button = page.getByRole("button", { name, exact: true })
    await button.click()
    await expect(button).toBeEnabled()
    await expect(
      page.locator(
        '[aria-label="Favorite profiles"] button[aria-pressed="true"]'
      )
    ).toHaveText("D-Flow")
  }
  await page
    .getByRole("button", { name: "Select 80's Espresso", exact: true })
    .click()
  const increase = page.getByRole("button", {
    name: "Increase grind size",
    exact: true,
  })
  await expect(increase).toBeEnabled()
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
  await increase.click()
  await expect.poll(() => !!release).toBe(true)
  await expect(
    page.getByRole("button", { name: "Sleep machine" })
  ).toBeDisabled()
  await expect(
    page.locator(
      '.focus-stepper button[data-slot="button"]:not([data-disabled])'
    )
  ).toHaveCount(0)
  await page.locator(".focus-stepper button").evaluateAll((nodes) =>
    nodes.forEach((node) => {
      const button = node as HTMLButtonElement
      button.click()
      button.click()
    })
  )
  expect(writes).toBe(1)
  release!()
  await expect(increase).toBeEnabled()
  await page.unroute("**/api/v1/workflow")
  const result = await page.evaluate(() => {
    const audit = (
      window as unknown as {
        renderAudit: {
          stop: boolean
          frames: number
          records: {
            label: string
            paints: Set<string>
            removed: boolean
            animations: Set<string>
          }[]
        }
      }
    ).renderAudit
    audit.stop = true
    return {
      frames: audit.frames,
      records: audit.records.map((r) => ({
        label: r.label,
        paints: [...r.paints],
        removed: r.removed,
        animations: [...r.animations],
      })),
    }
  })
  console.log(
    JSON.stringify({
      frames: result.frames,
      replacements: result.records.filter((r) => r.removed).length,
    })
  )
  for (const r of result.records) {
    expect(
      r.paints.every((p) => p.startsWith("1|visible|")),
      r.label
    ).toBe(true)
    expect(
      new Set(r.paints.map((p) => p.split("|")[3])).size,
      `${r.label} text color`
    ).toBe(1)
    expect(r.animations, r.label).toEqual([])
  }
  expect(result.records.filter((r) => r.removed)).toEqual([])
})
