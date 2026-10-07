import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
  build: {
    // Split the heavy, rarely-used libraries out of the main bundle so the
    // first load stays small. jsPDF and html2canvas are only fetched when a
    // visitor actually exports a marksheet or receipt.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
