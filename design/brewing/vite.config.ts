import { resolve } from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "../../src") } },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: { outDir: "../../artifacts/brewing-preview", emptyOutDir: true },
})
