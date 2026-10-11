import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  base: '/reps/',
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('index.html', import.meta.url)),
        app: fileURLToPath(new URL('app/index.html', import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/reps/app/',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/reps/',
        start_url: '/reps/app/',
        scope: '/reps/app/',
        name: 'Reps',
        short_name: 'Reps',
        description: 'Apunta tus series y la próxima vez sabrás cuánto levantaste.',
        lang: 'es',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['index.html', 'assets/landing-*', 'assets/big-shoulders-*', 'assets/barlow-semi-*'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'app/index.html',
        navigateFallbackAllowlist: [/^\/reps\/app\//],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
