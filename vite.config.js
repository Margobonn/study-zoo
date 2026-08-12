import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.jsx, gated on NOT running inside the
      // Capacitor native shell — a service worker intercepting fetches
      // inside the packaged app's WebView has no benefit (assets are
      // already bundled locally) and risks serving stale cached content
      // after a native update.
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Study Zoo — Pomodoro Gamificado',
        short_name: 'Study Zoo',
        description: 'Temporizador Pomodoro con un zoológico coleccionable que se desbloquea estudiando.',
        start_url: '/',
        lang: 'es',
        display: 'standalone',
        background_color: '#0f1720',
        theme_color: '#ff8a5c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell so the timer keeps working offline
        // once it's been opened at least once.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Without these, a new service worker sits in "waiting" until every
        // open tab/PWA instance of the site is fully closed — reloading
        // isn't enough, so a deploy can look "stuck" on the old version for
        // a long time. skipWaiting activates it immediately; clientsClaim
        // hands it control of already-open pages right away, so autoUpdate
        // registration (main.jsx) actually detects the update and reloads.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Firebase (auth+firestore+app) and React rarely change alongside
        // app code, so splitting them into their own chunks means a
        // deploy that only touches src/App.jsx doesn't force a re-download
        // of ~800kB of vendor code the browser already has cached.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
