import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'], // تأكد من توفر هذه الصور في مجلد public
      manifest: {
        name: 'مزرعتي | Mazraaty',
        short_name: 'مزرعتي',
        description: 'نظام الإدارة المتكامل لمزارع الدواجن',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone', // هذه الخاصية هي التي تخفي شريط المتصفح وتجعله تطبيق مستقل
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});