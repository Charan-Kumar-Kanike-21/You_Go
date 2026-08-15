import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'NITK Cycle Sharing',
        short_name: 'Cycle Sharing',
        description: 'NITK Cycle Sharing Platform',

        theme_color: '#0a2e1f',
        background_color: '#061a12',

        display: 'standalone',

        start_url: '/',

        icons: [
          {
            src: '/icons/icon-192.png.jpeg',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png.jpeg',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})