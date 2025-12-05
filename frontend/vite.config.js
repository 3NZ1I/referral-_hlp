import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['html2canvas', 'jspdf']
  },
  build: {
    commonjsOptions: {
      include: [/html2canvas/, /jspdf/, /node_modules/]
    }
    ,
    // Improve chunking to split large vendor bundles
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put all third-party libs in a single vendor chunk to avoid inter-chunk runtime import issues
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // in KB - reduce noisy warnings
  },
  preview: {
    allowedHosts: ['hlp.bessar.work']
  }
})
