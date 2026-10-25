import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Downloaded copies play from file:// in the fefe app's WebView, where
// <script type="module"> is blocked (module scripts need CORS, file:// has a
// null origin). Ship one classic, deferred IIFE script instead.
function classicScript(): Plugin {
  return {
    name: "classic-script",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/<script type="module" crossorigin/g, "<script defer").replace(/ crossorigin/g, "")
    },
  }
}

// base "./" so built URLs are relative — required by Fefe's bundle rules
// (index.html is served from …/play, assets from …/assets/<id>/).
export default defineConfig({
  base: "./",
  plugins: [react(), classicScript()],
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: { output: { format: "iife", inlineDynamicImports: true } },
  },
})
