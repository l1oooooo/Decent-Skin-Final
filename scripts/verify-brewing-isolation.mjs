import { build } from "vite"

const forbidden = /(?:design-shot-|Simulate GHC|Brewing simulator|design-dock|DesignSimulator)/
let checked = 0
await build({
  configFile: "vite.config.ts",
  build: { outDir: "artifacts/brewing-production-audit" },
  plugins: [{
    name: "verify-brewing-preview-isolation",
    generateBundle(_options, bundle) {
      for (const id of this.getModuleIds()) {
        checked++
        if (id.replaceAll("\\", "/").includes("/design/brewing/"))
          throw new Error(`Design-preview module entered the production graph: ${id}`)
      }
      for (const [name, output] of Object.entries(bundle)) {
        const content = output.type === "chunk" ? output.code : String(output.source)
        if (forbidden.test(content)) throw new Error(`Simulation content found in ${name}`)
      }
    },
  }],
})
console.log(`Production isolation passed: ${checked} modules checked; no brewing-preview modules or simulation content.`)
