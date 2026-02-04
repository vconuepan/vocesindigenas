/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from '@prerenderer/rollup-plugin'
import { routePaths } from './src/routes'
import { BRAND } from './src/config'
import path from 'path'

// Plugin to inject preconnect for cross-origin API and brand copy
function htmlTransformPlugin(): Plugin {
  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      // Inject brand description
      html = html.replace('__BRAND_DESCRIPTION__', `${BRAND.claim} ${BRAND.claimSupport}`)

      // Inject preconnect for cross-origin API
      const apiUrl = process.env.VITE_API_URL
      if (apiUrl) {
        const origin = new URL(apiUrl).origin
        const preconnectTags = `
    <link rel="preconnect" href="${origin}" crossorigin />
    <link rel="dns-prefetch" href="${origin}" />`
        html = html.replace('<head>', '<head>' + preconnectTags)
      }

      return html
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  plugins: [
    htmlTransformPlugin(),
    react(),
    prerender({
      routes: routePaths,
      renderer: '@prerenderer/renderer-puppeteer',
      rendererOptions: {
        maxConcurrentRoutes: 1,
        renderAfterDocumentEvent: 'render-complete',
      },
      postProcess(renderedRoute) {
        if (!renderedRoute.html.startsWith('<!DOCTYPE')) {
          renderedRoute.html = '<!DOCTYPE html>' + renderedRoute.html
        }

        // Preload homepage API data to avoid JS→API chain
        const apiUrl = process.env.VITE_API_URL
        if (renderedRoute.route === '/' && apiUrl) {
          const preloadTag = `<link rel="preload" href="${apiUrl}/api/homepage" as="fetch" crossorigin />`
          renderedRoute.html = renderedRoute.html.replace('</head>', preloadTag + '\n</head>')
        }

        return renderedRoute
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
rollupOptions: {
      output: {
        // Let Rollup handle chunking automatically. Admin code will be
        // code-split via React.lazy() dynamic imports in App.tsx.
        // No manualChunks needed - this avoids the React internals issue
        // where admin-vendor would pull in shared React code.
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
