import { mkdirSync, readFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { validSkinVersion } from "./skin-version.mjs"
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"))
if (!/^[a-z0-9-]+$/.test(manifest.id) || !validSkinVersion(manifest.version))
  throw new Error("Invalid skin id or version")
mkdirSync("artifacts", { recursive: true })
const archive = resolve("artifacts", `${manifest.id}-${manifest.version}.zip`)
rmSync(archive, { force: true })
execFileSync("zip", ["-qr", archive, "."], { cwd: "dist" })
console.log(archive)
