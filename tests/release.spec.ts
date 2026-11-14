import { createServer } from "node:http"
import { readFileSync, readdirSync } from "node:fs"
import { extname } from "node:path"
import { test, expect } from "@playwright/test"

test("production assets load below a nested skin path without an API or fallback readings", async ({
  page,
}) => {
  test.setTimeout(300000)
  const assets = new Map<string, Buffer>()
  for (const file of readdirSync("dist", {
    recursive: true,
    withFileTypes: true,
  }))
    if (file.isFile()) {
      const path = `${file.parentPath}/${file.name}`
      assets.set(path.replace(/^dist\//, ""), readFileSync(path))
    }
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".woff2": "font/woff2",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  }
  const missing: string[] = []
  const server = createServer((req, res) => {
    const pathname = new URL(req.url!, "http://fixture.invalid").pathname
    const name = pathname.startsWith("/skins/focus/")
      ? pathname.slice(13) || "index.html"
      : ""
    const bytes = assets.get(name)
    if (!bytes) missing.push(pathname)
    res.writeHead(bytes ? 200 : 404, {
      "Content-Type": types[extname(name)] ?? "application/octet-stream",
    })
    res.end(bytes)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Missing static test port")
  const origin = `http://127.0.0.1:${address.port}`
  const blocked: string[] = [],
    errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  // These interceptors are installed before navigation: no request can reach a machine.
  await page.route("**/*", (route) => {
    if (
      route
        .request()
        .url()
        .startsWith(origin + "/")
    )
      return route.continue()
    blocked.push(route.request().url())
    return route.abort("connectionrefused")
  })
  await page.routeWebSocket("**/*", (socket) => socket.close())
  try {
    await page.goto(`${origin}/skins/focus/`, { waitUntil: "networkidle" })
    await expect(page.locator(".candidate-status")).toBeVisible()
    await expect(
      page.getByRole("status", { name: "Machine state", exact: true })
    ).toHaveAttribute("data-ready", "false")
    await expect(page.getByLabel("Tank volume", { exact: true })).toHaveText(
      "Tank— ml"
    )
    await expect.poll(() => blocked.length).toBeGreaterThan(0)
    expect(
      blocked.every((url) => new URL(url).origin === "http://127.0.0.1:8080")
    ).toBe(true)
    const framing = await page.evaluate(async () => {
      await document.fonts.ready
      return {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        font: [...document.fonts].some(
          (face) =>
            face.family.replace(/["']/g, "") === "Geist Variable" &&
            face.status === "loaded"
        ),
        styles: [...document.styleSheets].some((sheet) =>
          sheet.href?.includes("/skins/focus/assets/")
        ),
      }
    })
    expect(framing).toEqual({
      width: 1340,
      height: 800,
      font: true,
      styles: true,
    })
    await page.goto(`${origin}/skins/focus/?page=settings&category=help`, {
      waitUntil: "networkidle",
    })
    await expect(
      page.getByRole("heading", { name: "System and help", exact: true })
    ).toBeVisible({ timeout: 90000 })
    await page.reload({ waitUntil: "networkidle" })
    await expect(
      page.getByRole("heading", { name: "System and help", exact: true })
    ).toBeVisible({ timeout: 90000 })
    expect(missing).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await page.close()
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
  }
})
