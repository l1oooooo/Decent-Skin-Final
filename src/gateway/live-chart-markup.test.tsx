import { expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { BrewingChart } from "../skin/brewing/chart"
import type { Reading } from "../skin/brewing/model"

it("preserves the approved live chart markup while refining Home", async () => {
  const samples: Reading[] = [0, 1, 2].map((elapsed) => ({
    elapsed,
    pressure: 3 + elapsed,
    targetPressure: 9,
    flow: 2,
    groupTemperature: 88,
    weightFlow: elapsed === 1 ? null : 1.5,
    beverageWeight: elapsed * 2,
    frame: 0,
    stage: "Extraction",
  }))
  for (const temperatureUnit of ["C", "F"] as const) {
    const markup = renderToStaticMarkup(
      <BrewingChart
        samples={samples}
        width={1284}
        height={484}
        temperatureUnit={temperatureUnit}
      />
    )
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(markup)
    )
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("")
    expect(hash).toMatchSnapshot()
  }
})
