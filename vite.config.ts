import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        injectRegister: "inline",
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "masked-icon.svg",
        ],
        manifest: {
          id: "descubra-kyvra-pwa",
          name: "Kyvra",
          short_name: "Kyvra",
          description:
            "O Arquivista de Kyvra - Reprodutor de áudio imersivo de Kyvra",
          theme_color: "#0a0a0a",
          background_color: "#0a0a0a",
          display: "standalone",
          display_override: [
            "window-controls-overlay",
            "standalone",
            "minimal-ui",
          ],
          orientation: "portrait",
          start_url: "/",
          lang: "pt-BR",
          dir: "ltr",
          categories: ["music", "entertainment", "audio"],
          icons: [
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/1782392271638.jpg",
              sizes: "192x192",
              type: "image/jpeg",
              purpose: "any",
            },
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/1782392271638.jpg",
              sizes: "192x192",
              type: "image/jpeg",
              purpose: "maskable",
            },
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/1782392271638.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "any",
            },
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/1782392271638.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "maskable",
            },
          ],
          shortcuts: [
            {
              name: "Reprodutor de Áudio",
              short_name: "Player",
              description: "Acesse diretamente o reprodutor imersivo de Kyvra",
              url: "/",
              icons: [
                {
                  src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/1782392271638.jpg",
                  sizes: "192x192",
                  type: "image/jpeg",
                },
              ],
            },
          ],
          screenshots: [
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/Screenshot_20260625-090009.png",
              sizes: "1080x2400",
              type: "image/png",
              form_factor: "narrow",
              label: "Reprodutor imersivo Kyvra - Tela 1",
            },
            {
              src: "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/LOGOANDSCREENSHOOT/Screenshot_20260625-090023.png",
              sizes: "1080x2400",
              type: "image/png",
              form_factor: "narrow",
              label: "Reprodutor imersivo Kyvra - Tela 2",
            },
          ],
        },
        workbox: {
          importScripts: ["/sw-custom.js"],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern:
                /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "kyvra-audio-cache",
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
                rangeRequests: true,
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /(?:.*\/cdn\/frames\/.*|https:\/\/raw\.githubusercontent\.com\/davidbarroso999-spec\/Aleatoriedades\/main\/.*)/i,
              handler: "CacheFirst",
              options: {
                cacheName: "kyvra-frames-cache",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: {
        "/cdn/frames": {
          target: "https://raw.githubusercontent.com/davidbarroso999-spec/Aleatoriedades/main",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cdn\/frames/, ""),
        },
      },
    },
  };
});
