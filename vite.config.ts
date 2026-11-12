import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/solo-s.svg', 'icons/solo-s-180.png'],
      manifest: {
        // A stable identity, so an installed copy updates in place when the icons change.
        id: '/',
        name: 'Solo Books',
        short_name: 'Solo Books',
        description: 'One ledger for every business you run.',
        theme_color: '#0a0b0d',
        background_color: '#0a0b0d',
        display: 'standalone',
        start_url: '/',
        icons: [
          // The icon files carry the S in their NAME (solo-s-*): Chrome only re-downloads an installed
          // app's icon when its URL changes, so when the logo changes again, rename these (solo-s2-*...).
          { src: '/icons/solo-s-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/solo-s-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/solo-s-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Only precache the built app shell (JS/CSS/HTML/icons) -- no
      // runtimeCaching rules, so every Supabase API call still goes
      // straight to the network. This is a live financial ledger; caching
      // stale data would be actively wrong.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // The public site's screenshots (jpg) and nothing under landing/ belong
        // in the installed app's offline cache.
        globIgnores: ['landing/**'],
      },
    }),
  ],
})
