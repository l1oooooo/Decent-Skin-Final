import assert from "node:assert/strict"
import { test } from "node:test"
import { validSkinVersion } from "./skin-version.mjs"

test("accept stable and numbered release candidates", () => {
  for (const version of ["0.3.9", "0.3.10-rc.1", "1.0.0-rc.12"])
    assert.equal(validSkinVersion(version), true, version)
})

test("reject malformed versions and archive path characters", () => {
  for (const version of [
    undefined,
    null,
    3,
    "",
    "v0.3.10",
    "01.3.10",
    "0.3",
    "0.3.10-rc.0",
    "0.3.10-rc.01",
    "0.3.10-rc.1/../x",
    "0.3.10\n",
    "0.3.10-rc.1+local",
  ])
    assert.equal(validSkinVersion(version), false, String(version))
})
