import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Phase 5 scope only: cache the app shell so the frame (login page,
      // dashboards, layout) loads with zero internet. This does NOT cache
      // API responses or make submissions/messages work offline — that's
      // Phase 6 (IndexedDB queue + background sync), built on top of this.
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'AttachTrack',
        short_name: 'AttachTrack',
        description: 'Industrial Attachment Tracking System',
        start_url: '/login',
        display: 'standalone',
        background_color: '#f6f4ec', // --paper
        theme_color: '#1c2333', // --ink
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Precache the built app shell (JS/CSS/HTML) — this is what makes
        // the frame load offline. No runtimeCaching for /api/* yet: live
        // data still requires a real connection until Phase 6.
        globPatterns: ['**/*.{js,css,html,ico,svg,png}'],
      },
      devOptions: {
        // Lets you test the Service Worker during `npm run dev`, not just
        // in a production build — otherwise it only activates after `vite build`.
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173,
//   },
// });
