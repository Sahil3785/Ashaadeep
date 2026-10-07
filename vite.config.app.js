import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* ============================================================
   Build config for the Android faculty app.

   Separate from vite.config.js so the APK contains ONLY the
   faculty experience — none of the public website's pages,
   images or PDF libraries ship inside it.

     npm run dev:app     preview it in a desktop browser
     npm run build:app   emit dist-app/, which Capacitor packages
   ============================================================ */
export default defineConfig({
  root: 'appshell',
  plugins: [react()],

  // Relative asset URLs: the Android web view serves from a local
  // origin where absolute "/assets/..." paths do not resolve.
  base: './',

  server: { port: 3100, open: true },

  build: {
    outDir: '../dist-app',
    emptyOutDir: true,
    target: 'es2020',          // matches the Chrome web view on Android 8+
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
