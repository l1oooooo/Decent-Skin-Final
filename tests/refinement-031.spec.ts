import { expect, test } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/reset`)
})

test("Machine Setting tabs are read-only, anchored, touchable and keyboard accessible", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.getByRole("button", { name: "Sleep machine" })).toBeEnabled(
    { timeout: 90000 }
  )
  const nav = page.getByRole("navigation", { name: "Machine navigation" })
  await expect(nav.getByRole("button")).toHaveCount(4)
  await expect(nav).toHaveText("Machine SettingShot historySettingsSleep")
  const trigger = nav.getByRole("button", {
    name: "Machine Setting",
    exact: true,
  })
  await trigger.click()
  const dialog = page.getByRole("dialog", {
    name: "Machine Setting",
    exact: true,
  })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(12)
  expect(box!.x + box!.width).toBeLessThanOrEqual(1328)
  expect(box!.y + box!.height).toBeLessThanOrEqual(788)
  const steam = page.getByRole("tab", { name: "Steam", exact: true })
  await steam.focus()
  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("tab", { name: "Hot Water", exact: true })
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("tab", { name: "Hot Water", exact: true })
  ).toHaveAttribute("aria-selected", "true")
  await expect(
    page.getByRole("button", { name: "Edit water temperature", exact: true })
  ).toBeVisible()
  for (const name of ["Flush", "Steam", "Hot Water", "Steam"]) {
    const tab = page.getByRole("tab", { name, exact: true })
    await tab.click()
    await expect(tab).toHaveAttribute("aria-selected", "true")
    expect(await dialog.boundingBox()).toEqual(box)
    const target = await tab.boundingBox()
    expect(target!.height).toBeGreaterThanOrEqual(44)
  }
  const toggle = page.getByRole("switch", { name: "Enable steam" })
  const target = await toggle.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const hit = getComputedStyle(element, "::after")
    return {
      width: bounds.width - parseFloat(hit.left) - parseFloat(hit.right),
      height: bounds.height - parseFloat(hit.top) - parseFloat(hit.bottom),
    }
  })
  expect(target.width).toBeGreaterThanOrEqual(44)
  expect(target.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({
    path: "artifacts/refinement-031/machine-setting.png",
  })
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.locator(".focus-profile-heading h1").click()
  await expect(dialog).toBeHidden()
  await trigger.click()
  await trigger.click()
  await expect(dialog).toBeHidden()
  await page.emulateMedia({ reducedMotion: "reduce" })
  await trigger.click()
  await expect(dialog).toBeVisible()
  const motion = await dialog.evaluate((element) => ({
    animation: getComputedStyle(element).animationName,
    transition: getComputedStyle(element).transitionDuration,
    indicator: getComputedStyle(
      element.querySelector('[data-slot="tabs-trigger"]')!,
      "::after"
    ).transitionDuration,
  }))
  expect(motion).toEqual({
    animation: "none",
    transition: "0s",
    indicator: "0s",
  })
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual([])
})

test("Steam switch follows acknowledged settings, rejects failures and blocks duplicate or offline writes", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.getByRole("button", { name: "Sleep machine" })).toBeEnabled(
    { timeout: 90000 }
  )
  const trigger = page.getByRole("button", {
    name: "Machine Setting",
    exact: true,
  })
  await trigger.click()
  const toggle = page.getByRole("switch", { name: "Enable steam" })
  await expect(toggle).toBeChecked()
  await request.post(`${fixture}/__test/state`, {
    data: { failPath: "/api/v1/workflow" },
  })
  await toggle.click()
  await expect(
    page
      .getByRole("dialog", { name: "Machine Setting", exact: true })
      .getByRole("alert")
  ).toContainText("Section write rejected")
  await expect(toggle).toBeChecked()
  await expect(toggle).toBeEnabled()
  await request.post(`${fixture}/__test/state`, { data: { failPath: null } })
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/v1/workflow", async (route) => {
    if (route.request().method() === "PUT") await pending
    await route.continue()
  })
  await toggle.click()
  await expect(toggle).toBeDisabled()
  await expect(toggle).toBeChecked()
  // Attempt a second event while disabled; Base UI and the gateway must both gate it.
  await toggle.dispatchEvent("click")
  release()
  await expect(toggle).not.toBeChecked()
  await expect(toggle).toBeEnabled()
  await page.reload({ waitUntil: "networkidle" })
  await trigger.click()
  await expect(toggle).toBeEnabled({ timeout: 90000 })
  await expect(toggle).not.toBeChecked()
  await request.post(`${fixture}/__test/state`, { data: { connected: false } })
  await expect(toggle).toBeDisabled()
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(writes).toHaveLength(2)
  for (const write of writes) {
    expect(write.path).toBe("/api/v1/workflow")
    expect(write.body.steamSettings.targetTemperature).toBe(0)
  }
})
