import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function productsUrlPattern(apiBaseUrl) {
  try {
    const url = new URL(apiBaseUrl);
    const basePath = url.pathname.replace(/\/$/, '');
    return new RegExp(`^${escapeRegExp(`${url.origin}${basePath}`)}/products`);
  } catch (_error) {
    return /\/api\/v1\/products/;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          // The app shell is precached, so client-side routes keep working
          // offline. /offline.html remains available as a static fallback page.
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: productsUrlPattern(apiBaseUrl),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'nextgen-products',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nextgen-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'NextGen Builds - AI-Enhanced PC Parts Store',
          short_name: 'NextGen Builds',
          description:
            'Premium PC hardware e-commerce with AI-powered build recommendations',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'en',
          categories: ['shopping', 'productivity'],
          theme_color: '#101827',
          background_color: '#F8FAFC',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
