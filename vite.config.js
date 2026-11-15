import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev, /api vai para o Django. O navegador só enxerga o seu próprio backend.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: { sourcemap: false },
});
