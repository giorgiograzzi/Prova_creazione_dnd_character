/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Config base: manifest e offline completo si rifiniscono allo step 19
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Personaggi D&D",
        short_name: "D&D PG",
        lang: "it",
        display: "standalone",
        background_color: "#ece9d8",
        theme_color: "#0a3fb5",
      },
    }),
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
