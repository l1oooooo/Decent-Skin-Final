import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { posix, resolve } from "node:path"
import { validSkinVersion } from "./skin-version.mjs"

const fail = (message) => {
  throw new Error(message)
}
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"))
const expected = JSON.parse(readFileSync("public/manifest.json", "utf8"))
if (JSON.stringify(manifest) !== JSON.stringify(expected))
  fail("Stale manifest in dist")
if (!/^[a-z0-9-]+$/.test(manifest.id) || !validSkinVersion(manifest.version))
  fail("Invalid skin identity")
const archive = resolve(
  process.argv[2] ?? `artifacts/${manifest.id}-${manifest.version}.zip`
)
execFileSync("unzip", ["-tq", archive])
const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" })
  .trim()
  .split("\n")
if (new Set(entries).size !== entries.length) fail("Duplicate archive entries")
const allowed =
  /^(?:index\.html|manifest\.json|skin\.svg|assets\/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:js|css|woff2|jpg|png|svg))?)$/
for (const entry of entries)
  if (!allowed.test(entry)) fail(`Unexpected archive entry: ${entry}`)
const files = entries.filter((entry) => !entry.endsWith("/"))
const distFiles = []
function walk(directory, prefix = "") {
  for (const name of readdirSync(directory)) {
    const path = `${directory}/${name}`,
      relative = prefix + name,
      stat = lstatSync(path)
    if (stat.isSymbolicLink()) fail(`Symlink in dist: ${relative}`)
    if (stat.isDirectory()) walk(path, relative + "/")
    else if (stat.isFile()) distFiles.push(relative)
    else fail(`Non-file in dist: ${relative}`)
  }
}
walk("dist")
if (JSON.stringify([...files].sort()) !== JSON.stringify(distFiles.sort()))
  fail("Archive does not match dist file inventory")
for (const required of ["index.html", "manifest.json", "skin.svg"])
  if (!files.includes(required)) fail(`Missing ${required}`)
if (!files.some((f) => /geist.*\.woff2$/.test(f)))
  fail("Bundled Geist font missing")
for (const artwork of [
  "d-flow",
  "80s-espresso",
  "easy-blooming",
  "gentle-sweet",
  "rao-allonge",
])
  if (
    !files.some((f) => f.startsWith(`assets/${artwork}-`) && f.endsWith(".jpg"))
  )
    fail(`Missing artwork: ${artwork}`)
const textFiles = new Map()
for (const file of files) {
  const bytes = execFileSync("unzip", ["-p", archive, file], {
    maxBuffer: 16 * 1024 * 1024,
  })
  if (!bytes.equals(readFileSync(`dist/${file}`)))
    fail(`Archive differs from dist: ${file}`)
  if (/\.(?:html|js|css|json|svg)$/.test(file)) {
    const text = bytes.toString("utf8")
    if (
      /Simulate GHC|DesignSimulator|design-dock|Brewing simulator|__test\/|contract-fixture|fixture-only|\/@vite\/client|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|\bgh[pousr]_[A-Za-z0-9]{20,}/.test(
        text
      )
    )
      fail(`Test/development/credential marker in ${file}`)
    if (
      /(?:https?|wss?):\/\/(?:localhost|(?:\d{1,3}\.){3}\d{1,3})(?=[:/"'`\s])/.test(
        text
      )
    )
      fail(`Hard-coded local/device origin in ${file}`)
    textFiles.set(file, text)
  }
}
function asset(from, value) {
  if (value.startsWith("data:")) return
  if (/^(?:[a-z]+:|\/|#)/i.test(value))
    fail(`Non-relative asset in ${from}: ${value}`)
  const target = posix.normalize(
    posix.join(posix.dirname(from), value.split(/[?#]/)[0])
  )
  if (!files.includes(target))
    fail(`Missing asset referenced by ${from}: ${value}`)
}
const html = textFiles.get("index.html")
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g))
  asset("index.html", match[1])
if (!/<script[^>]+type="module"[^>]+src="\.\/assets\//.test(html))
  fail("Missing relative compiled entry script")
for (const [file, text] of textFiles)
  if (file.endsWith(".css"))
    for (const match of text.matchAll(/url\(["']?([^\s)"']+)["']?\)/g))
      asset(file, match[1])
const report = {
  status: "local-static-checks-passed",
  checkedAt: new Date().toISOString(),
  deviceAccepted: false,
  archive,
  bytes: lstatSync(archive).size,
  sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
  manifest,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  trackedChanges: execFileSync("git", ["diff", "HEAD", "--name-only"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean),
  files,
}
writeFileSync(
  "artifacts/skin-release.json",
  JSON.stringify(report, null, 2) + "\n"
)
console.log(
  `Verified ${files.length} files, ${report.bytes} bytes\nSHA-256 ${report.sha256}\nReport: artifacts/skin-release.json\nTablet acceptance: pending`
)
