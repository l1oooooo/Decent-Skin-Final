import { expect, test, type Locator } from "@playwright/test"
import { fixtureOrigin as fixture } from "./fixture-origin.js"

async function enter(dialog: Locator, value: string) {
  await dialog.getByRole("button", { name: "Clear", exact: true }).click()
  for (const digit of value)
    await dialog
      .getByRole("button", {
        name: digit === "." ? "Decimal point" : digit,
        exact: true,
      })
      .click()
}

test("Home grind range persists through workflow, preferences, profile switching and reload", async ({
  page,
  request,
}) => {
  test.setTimeout(300000)
  await request.post(`${fixture}/__test/reset`)
  await page.setViewportSize({ width: 1007, height: 601 })
  await page.goto("/")
  const edit = page.getByRole("button", {
    name: "Edit grind size",
    exact: true,
  })
  await expect(edit).toBeEnabled({ timeout: 90000 })
  await expect(page.getByLabel("Recipe summary").locator("p.mb-3")).toHaveText([
    "Brew ratio",
    "Dose",
    "Drink",
  ])
  await expect(page.locator(".focus-stepper > p")).toHaveText([
    "Grind size",
    "Dose",
    "Drink",
    "Temperature",
  ])
  for (const value of [0, 20, 20.5, 35, 50]) {
    await edit.click()
    const dialog = page.getByRole("dialog", { name: "Grind size", exact: true })
    await expect(dialog.getByText("0–50", { exact: true })).toBeVisible()
    await enter(dialog, String(value))
    await dialog.getByRole("button", { name: "Save", exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.getByLabel("Grind size value", { exact: true })
    ).toHaveText(String(value))
    const workflow = await (
      await request.get(`${fixture}/api/v1/workflow`)
    ).json()
    const saved = await (
      await request.get(`${fixture}/api/v1/store/decent-skin-codex/recipes`)
    ).json()
    expect(workflow.context.grinderSetting).toBe(value.toFixed(1))
    expect(saved["profile:0"].grinderSetting).toBe(value.toFixed(1))
    if (value === 0)
      await expect(
        page.getByRole("button", { name: "Decrease grind size", exact: true })
      ).toBeDisabled()
    if (value === 50)
      await expect(
        page.getByRole("button", { name: "Increase grind size", exact: true })
      ).toBeDisabled()
  }
  await edit.click()
  const dialog = page.getByRole("dialog", { name: "Grind size", exact: true })
  const before = await (await request.get(`${fixture}/__test/requests`)).json()
  await enter(dialog, "50.1")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog.getByRole("alert")).toHaveText(
    "Enter a number from 0 to 50."
  )
  expect(
    await (await request.get(`${fixture}/__test/requests`)).json()
  ).toEqual(before)
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
  await page
    .getByRole("button", { name: "Select 80's Espresso", exact: true })
    .click()
  const original = page.getByRole("button", {
    name: "Select D-Flow / default",
    exact: true,
  })
  await expect(original).toBeEnabled()
  await original.click()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "50"
  )
  await page.reload()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "50",
    { timeout: 90000 }
  )
  await page
    .getByRole("button", { name: "Decrease grind size", exact: true })
    .click()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "49.9"
  )
  await expect(
    page.getByRole("button", { name: "Increase grind size", exact: true })
  ).toBeEnabled()
  await page
    .getByRole("button", { name: "Increase grind size", exact: true })
    .click()
  await expect(page.getByLabel("Grind size value", { exact: true })).toHaveText(
    "50"
  )
  const writes = await (await request.get(`${fixture}/__test/requests`)).json()
  expect(
    writes.every((r: { path: string }) =>
      ["/api/v1/workflow", "/api/v1/store/decent-skin-codex/recipes"].includes(
        r.path
      )
    )
  ).toBe(true)
  await expect(edit).toBeEnabled()
  const chart = page.locator(".brew-chart-preview .brew-chart")
  await expect(chart).not.toHaveAttribute("data-samples", "0")
  const geometry = await chart.evaluate((el) => ({
    samples: el.getAttribute("data-samples"),
    paths: [...el.querySelectorAll("path[data-series]")].map((p) => ({
      series: p.getAttribute("data-series"),
      d: p.getAttribute("d"),
    })),
    clip: el.querySelector("clipPath rect")?.outerHTML,
    bounds: el.getBoundingClientRect().toJSON(),
  }))
  console.log(JSON.stringify({ finalChart: geometry }))
  await page.screenshot({ path: "artifacts/v038/home-grind-50.png" })
})
