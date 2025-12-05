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
          if (id.includes('node_modules')) {
            // group react, react-dom and antd together into a single vendor chunk
            if (id.includes('react') || id.includes('react-dom') || id.includes('antd')) return 'vendor.react';
            if (id.includes('html2canvas')) return 'vendor.html2canvas';
            if (id.includes('jspdf')) return 'vendor.jspdf';
            if (id.includes('xlsx')) return 'vendor.xlsx';
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
