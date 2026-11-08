import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("Medium readouts fit the tablet and disconnected text opens explicit scale selection", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1007, height: 601 })
  await request.post(`${fixture}/__test/state`, { data: { scale: false } })
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
  const scale = page.getByRole("button", {
    name: "Scale disconnected. Open Connections to reconnect",
  })
  await expect(scale).toHaveText("Disconnected")
  const geometry = await page.evaluate(() => {
    const left = document.querySelector(".candidate-readouts")!
    const right = document.querySelector(".candidate-actions")!
    const button = document.querySelector(".scale-connection-action")!
    const rect = button.getBoundingClientRect()
    return {
      weights: [...left.querySelectorAll("span,strong,button")].map(
        (el) => getComputedStyle(el).fontWeight
      ),
      rightWeight: getComputedStyle(right.querySelector("button")!).fontWeight,
      gap:
        right.getBoundingClientRect().left - left.getBoundingClientRect().right,
      row: Math.abs(
        left.getBoundingClientRect().top +
          left.getBoundingClientRect().height / 2 -
          right.getBoundingClientRect().top -
          right.getBoundingClientRect().height / 2
      ),
      hit: [-21, 21].every(
        (dy) =>
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2 + dy
          ) === button
      ),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }
  })
  expect(new Set(geometry.weights)).toEqual(new Set(["500"]))
  expect(geometry.rightWeight).toBe("400")
  expect(geometry.row).toBeLessThan(1)
  expect(geometry.gap).toBeGreaterThanOrEqual(16)
  expect(geometry.hit).toBe(true)
  expect(geometry.overflow).toBe(false)
  await page.screenshot({ path: "artifacts/v033/home-disconnected-1007.png" })
  await scale.focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("heading", { name: "Connections", exact: true })
  ).toBeVisible()
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
  const connect = page.getByRole("button", { name: "Connect", exact: true })
  let attempts = 0
  await page.route("**/api/v1/devices/connect", async (route) => {
    attempts++
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.continue()
  })
  await connect.evaluate((node: HTMLButtonElement) => {
    node.click()
    node.click()
    node.click()
  })
  await expect(
    page.getByText("Connection confirmed.", { exact: true })
  ).toBeVisible()
  expect(attempts).toBe(1)
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toEqual([
    {
      path: "/api/v1/devices/connect",
      method: "PUT",
      body: { deviceId: "scale-fixture" },
    },
  ])
  await page.getByRole("button", { name: "Home", exact: true }).click()
  await expect(page.getByLabel("Scale weight 0.0 grams")).toBeVisible()
  await expect(scale).toHaveCount(0)
  await page.screenshot({ path: "artifacts/v033/home-connected-1007.png" })
})

test("a rejected scale connection remains disconnected and is never retried", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__test/state`, {
    data: { scale: false, failPath: "/api/v1/devices/connect" },
  })
  await page.goto("/", { waitUntil: "networkidle" })
  await page
    .getByRole("button", {
      name: "Scale disconnected. Open Connections to reconnect",
    })
    .click()
  await page.getByRole("button", { name: "Connect", exact: true }).click()
  await expect(
    page.getByText("Section write rejected", { exact: false })
  ).toBeVisible()
  await page.getByRole("button", { name: "Home", exact: true }).click()
  await expect(page.locator(".scale-connection-action")).toHaveText(
    "Disconnected"
  )
  const calls = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    calls.filter((c: { path: string }) => c.path === "/api/v1/devices/connect")
  ).toHaveLength(1)
})

test("shared heating toast clears when Ready", async ({ page, request }) => {
  await request.post(`${fixture}/__test/state`, { data: { state: "heating" } })
  await page.goto("/", { waitUntil: "networkidle" })
  const notice = page.locator('[data-notification-key="machine-heating"]')
  await expect(notice).toContainText("Heating to your brew temperature")
  await expect(
    page.locator(
      '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
    )
  ).toHaveCount(0)
  await page.screenshot({ path: "artifacts/v033/heating-notice-1340.png" })
  await request.post(`${fixture}/__test/state`, {
    data: { state: "idle", elapsed: 1 },
  })
  await expect(notice).toHaveCount(0)
})

for (const [reason, substate, toast] of [
  ["machineEnded", "preinfusion", "Shot ended"],
  ["apiStop", "pouring", "Shot stopped manually"],
] as const) {
  test(`${reason} in ${substate} holds the trace, returns once and preserves Home`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1007, height: 601 })
    await page.goto("/", { waitUntil: "networkidle" })
    await expect(page.locator(".candidate-status")).toHaveText("DE1Ready")
    const title = await page.locator(".focus-profile-heading h1").textContent()
    const result = await page.evaluate(
      async ({ fixture, reason, substate, toast }) => {
        const root = document.querySelector(".brew-preview")!
        const toastNode = () =>
          document.querySelector(
            '[data-notification-key^="shot-result-"] [data-slot="toast-title"]'
          )?.textContent ?? ""
        const phases: { name: string | null; time: number }[] = []
        const toasts: string[] = []
        const traces = new Set<string>()
        let lastToast = ""
        const observe = () => {
          const name = root.getAttribute("data-phase")
          if (phases.at(-1)?.name !== name)
            phases.push({ name, time: performance.now() })
          const text = toastNode() ?? ""
          if (text && text !== lastToast) toasts.push(text)
          lastToast = text
          if (name === "complete")
            traces.add(
              document
                .querySelector('.brew-chart-live [data-series="pressure"]')
                ?.getAttribute("d") ?? ""
            )
        }
        const observer = new MutationObserver(observe)
        observer.observe(document.body, {
          subtree: true,
          attributes: true,
          childList: true,
          characterData: true,
        })
        const update = (data: Record<string, unknown>) =>
          fetch(`${fixture}/__test/state`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
        const until = async (predicate: () => boolean) => {
          const deadline = performance.now() + 15000
          while (!predicate()) {
            if (performance.now() > deadline)
              throw new Error(
                `Timed out: ${root.getAttribute("data-phase")} / ${toastNode()}`
              )
            await new Promise((resolve) => setTimeout(resolve, 20))
          }
        }
        try {
          await update({
            state: "espresso",
            substate,
            elapsed: 0,
            shotId: "v033-shot",
          })
          await until(() => root.getAttribute("data-phase") === "active")
          await update({ elapsed: 1 })
          await update({ state: "idle", elapsed: 2, reason })
          await until(() => toastNode() === toast)
          await update({ elapsed: 3, reason })
          await until(() => toastNode() === "")
          observe()
          return { phases, toasts, traces: traces.size }
        } finally {
          observer.disconnect()
        }
      },
      { fixture, reason, substate, toast }
    )
    const complete = result.phases.find((p) => p.name === "complete")!
    const returning = result.phases.find((p) => p.name === "returning")!
    expect(returning.time - complete.time).toBeGreaterThanOrEqual(2900)
    expect(result.phases.filter((p) => p.name === "returning")).toHaveLength(1)
    expect(result.traces).toBe(1)
    expect(result.toasts).toEqual([toast])
    await expect(page.locator(".focus-profile-heading h1")).toHaveText(title!)
    await expect(page.locator(".brew-preview")).toHaveAttribute(
      "data-phase",
      "home"
    )
  })
}
