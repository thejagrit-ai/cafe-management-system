import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Every browser this app supports handles ES2020; targeting it avoids the
    // extra transpilation weight Vite's default `modules` target carries.
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // Chunks are split by route in App.tsx, so anything still large here is a
    // genuine vendor library rather than an accident.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Rollup otherwise folds very small generated chunks into whatever
        // chunk is handy, which repeatedly attached a stray shared helper to
        // `vendor-charts` and pulled all 400 kB of recharts into the initial
        // page load. Keeping small chunks separate costs a few extra requests
        // over HTTP/2 and saves far more bytes than it costs.
        experimentalMinChunkSize: 0,
        // Only the libraries shared across many routes are pinned to stable,
        // separately cacheable chunks. Everything else deliberately returns
        // undefined so Rollup keeps it with the lazy route that imports it —
        // a catch-all `vendor` bucket would drag admin-only packages (zod,
        // qrcode.react) into the chunk every visitor downloads first.
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          // Pinned before the chart rule on purpose. These few-hundred-byte
          // helpers are used by the app shell *and* by recharts; left
          // unassigned, Rollup folded them into `vendor-charts`, so the entry
          // ended up statically importing 400 kB of charting code just to get
          // `clsx`.
          if (
            id.includes('/clsx/') ||
            id.includes('tailwind-merge') ||
            id.includes('class-variance-authority')
          ) {
            return 'vendor-utils'
          }
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts'
          }
          if (id.includes('/three/') || id.includes('@react-three')) return 'vendor-three'
          if (id.includes('framer-motion') || id.includes('/gsap/')) return 'vendor-motion'
          if (id.includes('i18next')) return 'vendor-i18n'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
