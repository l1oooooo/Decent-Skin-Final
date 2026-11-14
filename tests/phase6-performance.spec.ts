import { mkdirSync, writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { fixtureOrigin } from "./fixture-origin.js"

test("records browser startup and idle work without changing machine state", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120000)
  await request.post(`${fixtureOrigin}/__test/reset`)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const requests: { url: string; ms: number; error?: string }[] = []
  const pending = new Map<object, number>()
  page.on("request", (r) => pending.set(r, performance.now()))
  page.on("requestfinished", (r) => {
    requests.push({ url: r.url(), ms: performance.now() - pending.get(r)! })
    pending.delete(r)
  })
  page.on("requestfailed", (r) => {
    requests.push({
      url: r.url(),
      ms: performance.now() - pending.get(r)!,
      error: r.failure()?.errorText,
    })
    pending.delete(r)
  })
  const cdp = await context.newCDPSession(page)
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.start")
  const start = performance.now()
  await page.goto("/")
  await expect(
    page.getByRole("button", { name: "Increase grind size", exact: true })
  ).toBeEnabled({ timeout: 90000 })
  const readyMs = performance.now() - start
  console.log(JSON.stringify({ readyMs }))
  await page.waitForTimeout(5000)
  const { profile } = await cdp.send("Profiler.stop")
  const report = {
    readyMs,
    requests,
    errors,
    body: await page.locator("body").innerText(),
  }
  mkdirSync("artifacts/phase6", { recursive: true })
  writeFileSync(
    "artifacts/phase6/browser-startup.json",
    JSON.stringify(report, null, 2)
  )
  writeFileSync("artifacts/phase6/startup.cpuprofile", JSON.stringify(profile))
  expect(errors).toEqual([])
})
