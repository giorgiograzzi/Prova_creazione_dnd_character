/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configurazione base. Step 19 (PWA/Docker) rifinisce manifest, icone PNG e cache offline.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schede D&D',
        short_name: 'Schede D&D',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ECE9D8',
        theme_color: '#0A246A',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'node', // il motore è TypeScript puro, niente DOM
    include: ['src/**/*.test.ts'],
  },
})
