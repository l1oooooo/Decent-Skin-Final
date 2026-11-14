import { expect, test } from "@playwright/test"
import { fixtureOrigin } from "./fixture-origin.js"

for (const route of ["recipe", "edit"] as const)
  test(`${route} deep link initializes when its profile arrives after connection recovery`, async ({
    page,
    request,
  }) => {
    test.setTimeout(180000)
    await request.post(`${fixtureOrigin}/__test/reset`)
    let available = false
    let emptyReads = 0
    await page.route("**/api/v1/profiles?includeHidden=true", async (route) => {
      if (available) return route.continue()
      emptyReads++
      await route.fulfill({ json: [] })
    })
    await page.goto(`/?page=${route}&profile=profile%3A0`)
    const status = page.getByRole("status", {
      name: "Machine state",
      exact: true,
    })
    await expect(status).toHaveText("DE1Ready", { timeout: 90000 })
    await expect.poll(() => emptyReads).toBeGreaterThan(0)
    await expect(
      page.getByText(
        route === "recipe"
          ? "Recipe preferences unavailable. Reopen this page to retry."
          : "This profile is unavailable. Return to the library or retry loading it.",
        { exact: true }
      )
    ).toBeVisible()
    await request.post(`${fixtureOrigin}/__test/state`, {
      data: { failReadPath: "/api/v1/info" },
    })
    await expect(status).toContainText("Disconnected")
    available = true
    await request.post(`${fixtureOrigin}/__test/state`, {
      data: { failReadPath: null },
    })
    await expect(status).toHaveText("DE1Ready")
    if (route === "recipe")
      await expect(
        page.getByRole("button", { name: "Copy from Streamline", exact: true })
      ).toBeEnabled()
    else
      await expect(
        page.getByLabel("Stage 1 maximum time (s)", { exact: true })
      ).toHaveValue("7")
    await expect(page).toHaveURL(
      new RegExp(`page=${route}&profile=profile%3A0`)
    )
    expect(
      await (await request.get(`${fixtureOrigin}/__test/requests`)).json()
    ).toEqual([])
  })
