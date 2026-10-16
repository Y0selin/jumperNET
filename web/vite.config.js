import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relativa: GitHub Pages sirve el sitio en /jumperNET/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", sourcemap: false },
});
