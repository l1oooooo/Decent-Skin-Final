import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.setTimeout(240000)
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

for (const profile of ["D-Flow", "80's Espresso"])
  test(`Home profile controls retain paint and identity during recipe saves: ${profile}`, async ({
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
    const selected = page.locator(
      '[aria-label="Favorite profiles"] button[aria-pressed="true"]'
    )
    await expect(selected).toHaveCount(1)
    if (profile !== "D-Flow") {
      let finishLoad: (() => void) | undefined
      let loads = 0
      await page.route("**/api/v1/workflow", async (route) => {
        if (route.request().method() !== "PUT") return route.continue()
        loads++
        await new Promise<void>((resolve) => {
          finishLoad = resolve
        })
        await route.continue()
      })
      await page
        .getByRole("button", { name: `Select ${profile}`, exact: true })
        .click()
      await expect.poll(() => !!finishLoad).toBe(true)
      await page
        .locator(".focus-stepper button")
        .evaluateAll((nodes) =>
          nodes.forEach((node) => (node as HTMLButtonElement).click())
        )
      expect(loads).toBe(1)
      finishLoad!()
      await expect(increase).toBeEnabled()
      await expect(selected).toHaveText(profile)
      await page.unroute("**/api/v1/workflow")
    }
    await page.evaluate(() => {
      const nodes = [
        document.querySelector<HTMLElement>(".focus-profile-heading button")!,
        document.querySelector<HTMLElement>(
          '[aria-label="Favorite profiles"] button[aria-pressed="true"]'
        )!,
        document.querySelector<HTMLElement>(
          '[aria-label="Favorite profiles"] button[aria-pressed="true"] > span'
        )!,
        document.querySelector<HTMLElement>(".focus-stepper output")!,
        document.querySelector<HTMLElement>(".candidate-status")!,
      ]
      const paint = (el: HTMLElement) => {
        const s = getComputedStyle(el)
        return [
          s.color,
          s.borderColor,
          s.backgroundColor,
          s.opacity,
          s.visibility,
          s.display,
          s.transform,
          s.boxShadow,
        ].join("|")
      }
      const records = nodes.map((el) => ({
        el,
        name: el.textContent,
        initial: paint(el),
        paints: new Set([paint(el)]),
        removed: false,
        animations: new Set<string>(),
        bounds: JSON.stringify(el.getBoundingClientRect().toJSON()),
      }))
      const audit = {
        records,
        stop: false,
        frames: 0,
        variables: new Set<string>(),
      }
      Object.assign(window, { profilePaintAudit: audit })
      const frame = () => {
        audit.frames++
        const root = getComputedStyle(document.documentElement)
        audit.variables.add(
          ["--surface-tone", "--foreground", "--border"]
            .map((p) => root.getPropertyValue(p))
            .join("|")
        )
        for (const r of records) {
          r.removed ||= !r.el.isConnected
          r.paints.add(paint(r.el))
          r.el
            .getAnimations()
            .forEach((a) =>
              r.animations.add(
                String((a as CSSTransition).transitionProperty || a.id)
              )
            )
        }
        if (!audit.stop) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    for (const name of [
      "Increase grind size",
      "Decrease grind size",
      "Increase dose",
      "Decrease dose",
      "Increase drink",
      "Decrease drink",
      "Increase temperature",
      "Decrease temperature",
    ]) {
      const button = page.getByRole("button", { name, exact: true })
      await button.click()
      await expect(button).toBeEnabled()
      await expect(selected).toHaveText(profile)
    }
    let release: (() => void) | undefined
    let writes = 0
    const heldPath =
      profile === "D-Flow"
        ? "**/api/v1/workflow"
        : "**/api/v1/store/decent-skin-codex/recipes"
    await page.route(heldPath, async (route) => {
      if (route.request().method() === "GET") return route.continue()
      writes++
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.continue()
    })
    await increase.click()
    await expect.poll(() => !!release).toBe(true)
    await expect(selected).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true })
    ).toBeDisabled()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now()
          const tick = () =>
            performance.now() - start >= 250
              ? resolve()
              : requestAnimationFrame(tick)
          requestAnimationFrame(tick)
        })
    )
    await page.screenshot({ path: "artifacts/v038/held-save.png" })
    await page
      .locator(
        '.focus-stepper button, .focus-profile-heading button, [aria-label="Favorite profiles"] button'
      )
      .evaluateAll((nodes) =>
        nodes.forEach((node) => {
          ;(node as HTMLButtonElement).click()
          ;(node as HTMLButtonElement).click()
        })
      )
    expect(writes).toBe(1)
    release!()
    await expect(increase).toBeEnabled()
    await page.unroute(heldPath)
    const result = await page.evaluate(() => {
      const audit = (
        window as unknown as {
          profilePaintAudit: {
            stop: boolean
            frames: number
            variables: Set<string>
            records: {
              el: HTMLElement
              name: string
              initial: string
              paints: Set<string>
              removed: boolean
              animations: Set<string>
              bounds: string
            }[]
          }
        }
      ).profilePaintAudit
      audit.stop = true
      return {
        frames: audit.frames,
        variables: [...audit.variables],
        records: audit.records.map((r) => ({
          name: r.name,
          initial: r.initial,
          paints: [...r.paints],
          removed: r.removed,
          animations: [...r.animations],
          moved:
            r.bounds !== JSON.stringify(r.el.getBoundingClientRect().toJSON()),
        })),
      }
    })
    console.log(JSON.stringify(result))
    const workflow = await (
      await request.get(`${fixture}/api/v1/workflow`)
    ).json()
    const recipes = await (
      await request.get(`${fixture}/api/v1/store/decent-skin-codex/recipes`)
    ).json()
    expect(workflow.context.grinderSetting).toBe("1.9")
    expect(
      recipes[profile === "D-Flow" ? "profile:0" : "profile:1"].grinderSetting
    ).toBe("1.9")
    expect(result.frames).toBeGreaterThan(2)
    expect(result.variables).toHaveLength(1)
    for (const r of result.records) {
      expect(r.removed, r.name).toBe(false)
      expect(r.moved, r.name).toBe(false)
      expect(r.paints, r.name).toEqual([r.initial])
      expect(r.animations, r.name).toEqual([])
    }
    await request.post(`${fixture}/__test/state`, {
      data: { connected: false },
    })
    await expect(selected).toBeDisabled()
    await expect(selected).toHaveAttribute("data-pending", "false")
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true })
    ).toBeDisabled()
    await expect
      .poll(() => selected.evaluate((el) => getComputedStyle(el).color))
      .not.toBe(result.records[1].initial.split("|")[0])
  })
