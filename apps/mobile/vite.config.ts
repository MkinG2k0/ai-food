import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'apple-touch-icon.png',
        'screenshot-home.png',
        'screenshot-meal.png',
        'screenshot-stats.png',
      ],
      manifest: {
        name: 'AI Food',
        short_name: 'AI Food',
        description: 'Дневник питания',
        lang: 'ru',
        display: 'standalone',
        start_url: '/',
        theme_color: '#30ad54',
        background_color: '#ffffff',
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
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshot-home.png',
            sizes: '473x1024',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Главный экран — дневник и КБЖУ',
          },
          {
            src: 'screenshot-meal.png',
            sizes: '475x1024',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Детали приёма пищи',
          },
          {
            src: 'screenshot-stats.png',
            sizes: '475x1024',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Статистика за неделю',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
