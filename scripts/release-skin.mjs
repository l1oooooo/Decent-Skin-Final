import { execFileSync } from "node:child_process"
import { loadEnv } from "vite"

const env = loadEnv("production", process.cwd(), "VITE_")
if (env.VITE_DECAID_URL)
  throw new Error(
    "Tablet packaging requires no VITE_DECAID_URL override. Remove it from the shell and Vite environment files, then rebuild."
  )

execFileSync("npm", ["run", "build"], { stdio: "inherit" })
execFileSync(process.execPath, ["scripts/package-skin.mjs"], {
  stdio: "inherit",
})
execFileSync(process.execPath, ["scripts/verify-skin.mjs"], {
  stdio: "inherit",
})
