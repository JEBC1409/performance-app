import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // The 4 MB Bible isn't downloaded on install anymore (that made the first
        // visit heavy); it is cached the first time you read or open Hoy, then
        // works offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname === "/bible/rvr1909.json",
            handler: "CacheFirst",
            options: { cacheName: "bible-v1", expiration: { maxEntries: 2 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Without these, a new deployment's service worker installs but waits
        // for every open tab to close before taking over — so a plain reload
        // keeps serving the previous build's cached JS indefinitely.
        clientsClaim: true,
        skipWaiting: true,
        // Adds the notification-tap handler used by schedule reminders.
        importScripts: ["sw-notify.js"],
      },
      manifest: {
        name: "PERFORMANCE",
        short_name: "PERFORMANCE",
        description: "Tracker de hábitos, gimnasio, estudio y devocional.",
        // "/" alone serves the public landing page (App.tsx gates the real
        // app behind an explicit "?enter", so a bare "/" stays a marketing
        // page for browser visitors). The installed icon should skip that
        // and go straight to the app/login every time it's launched.
        start_url: "/?enter",
        scope: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        orientation: "portrait-primary",
        lang: "es",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
