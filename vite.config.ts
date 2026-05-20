import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      includeAssets: [
        'apple-touch-icon.png',
        'icons/ios/icon-180.png',
        'icons/ios/icon-167.png',
        'icons/ios/icon-152.png',
        'icons/ios/icon-120.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/emblem-screen.png',
      ],
      manifest: {
        name: 'Время хоккея',
        short_name: 'Хоккей',
        description: 'Собираемся на хоккей',
        theme_color: '#1E1E1E',
        background_color: '#1E1E1E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
