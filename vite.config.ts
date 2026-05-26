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
      workbox: {
        navigateFallback: '/index.html',
        // Иначе в браузере /api/*.php открывает SPA вместо PHP
        navigateFallbackDenylist: [/^\/api\//],
      },
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
        name: 'Хоккей',
        short_name: 'Хоккей',
        description: 'Собираемся на хоккей',
        theme_color: '#1E1E1E',
        background_color: '#1E1E1E',
        id: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
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
  server: {
    proxy: {
      '/api': {
        // Laragon: 127.0.0.1 + Host go_hockey.test (Node иногда не резолвит .test)
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          const host = process.env.VITE_API_HOST ?? 'go_hockey.test'
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Host', host)
          })
          proxy.on('error', (err, _req, res) => {
            console.error('[vite proxy /api]', err.message)
            if ('writeHead' in res && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `Прокси не достучался до Laragon (${host}). Start All в Laragon.`,
                }),
              )
            }
          })
        },
      },
    },
  },
})
