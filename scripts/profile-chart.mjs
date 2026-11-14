import { mkdirSync, writeFileSync } from "node:fs"
import { createServer } from "vite"

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
})
try {
  const { domains, paths, series } = await server.ssrLoadModule(
    "/src/skin/brewing/chart.tsx"
  )
  const results = []
  for (const count of [1, 1200, 3600]) {
    const samples = Array.from({ length: count }, (_, i) => ({
      elapsed: i / 10,
      pressure: 9,
      flow: 2,
      targetPressure: 9,
      groupTemperature: 88,
      weightFlow: i % 31 === 0 ? null : 2.1,
      beverageWeight: i / 5,
      frame: Math.floor(i / 300),
      stage: "Extraction",
    }))
    const timings = []
    let bytes = 0
    for (let run = 0; run < 120; run++) {
      const start = performance.now()
      const range = domains(samples)
      bytes = 0
      for (const spec of series) {
        const drawing = paths(
          samples,
          spec.key,
          (n) => 36 + (n / range.duration) * 923,
          (n) => 400 - n * 10,
          400
        )
        bytes += drawing.line.length + drawing.area.length
      }
      if (run >= 20) timings.push(performance.now() - start)
    }
    timings.sort((a, b) => a - b)
    results.push({
      count,
      iterations: timings.length,
      medianMs: timings[50],
      p95Ms: timings[95],
      pathCharacters: bytes,
    })
  }
  const report = {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    scope:
      "Warmed Node pure domain and five-series path generation; excludes React, browser layout, paint and Android",
    results,
  }
  mkdirSync("artifacts/phase6", { recursive: true })
  writeFileSync(
    "artifacts/phase6/chart-cpu.json",
    JSON.stringify(report, null, 2)
  )
  console.log(JSON.stringify(report, null, 2))
} finally {
  await server.close()
}
