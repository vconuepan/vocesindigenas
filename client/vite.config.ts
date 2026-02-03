/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from '@prerenderer/rollup-plugin'
import { routePaths } from './src/routes'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  plugins: [
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
        // Isolate admin UI libs (@headlessui, @heroicons, their deps) into a
        // separate chunk. Public visitors still download it (Rollup creates a
        // shared dependency reference) but it loads in parallel with the main
        // bundle and doesn't block initial render.
        manualChunks(id) {
          if (
            id.includes('node_modules/@headlessui/') ||
            id.includes('node_modules/@heroicons/') ||
            id.includes('node_modules/@react-aria/') ||
            id.includes('node_modules/@react-stately/') ||
            id.includes('node_modules/@floating-ui/') ||
            id.includes('node_modules/@internationalized/')
          ) {
            return 'admin-vendor'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
