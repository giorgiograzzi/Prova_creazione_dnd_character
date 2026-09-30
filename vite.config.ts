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
      // La scheda PDF (5 MB) non entra nell'installazione: si tiene in cache la prima volta che serve, poi funziona anche offline
      workbox: { runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.endsWith(".pdf"), handler: "CacheFirst", options: { cacheName: "forms", expiration: { maxEntries: 2 } } }] },
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
  // La pagina non va tenuta in cache: dopo ogni build i file hanno nomi nuovi e un index.html vecchio (PWA in Home su iOS) punterebbe a file spariti
  preview: { headers: { "Cache-Control": "no-cache, must-revalidate" } },
  server: { headers: { "Cache-Control": "no-cache, must-revalidate" } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
