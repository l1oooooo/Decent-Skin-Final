// Stable and numbered release-candidate builds share the same archive checks.
export const validSkinVersion = (value) =>
  typeof value === "string" &&
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-rc\.[1-9]\d*)?$/.test(
    value
  )
