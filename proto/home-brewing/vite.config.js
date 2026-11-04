import { mergeConfig } from "vite"
import base from "../../vite.config.ts"
import { fileURLToPath } from "node:url"
export default mergeConfig(base, {
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL("./index.html", import.meta.url)),
    },
  },
})
