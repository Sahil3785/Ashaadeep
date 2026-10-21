import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/* ============================================================
   Build config for the Android faculty app.

   Separate from vite.config.js so the APK contains ONLY the
   faculty experience — none of the public website's pages,
   images or PDF libraries ship inside it.

     npm run dev:app     preview it in a desktop browser
     npm run build:app   emit dist-app/, which Capacitor packages
   ============================================================ */
const projectDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command, mode }) => {
  // The APK must talk to the real database. Without these two keys the app
  // silently falls back to the shared demo PIN, which is how a demo-only APK
  // once got shipped to teachers — so a release build without them stops here.
  // (ALLOW_DEMO_BUILD=1 npm run build:app still makes a demo build on purpose.)
  const env = loadEnv(mode, projectDir, 'VITE_');
  const configured = Boolean(env.VITE_SUPABASE_URL?.startsWith('http') && env.VITE_SUPABASE_ANON_KEY);
  if (command === 'build' && !configured && process.env.ALLOW_DEMO_BUILD !== '1') {
    throw new Error(
      '\n\n  The faculty app cannot be built without the school database keys.\n' +
      '  Copy .env.example to .env and fill in VITE_SUPABASE_URL and\n' +
      '  VITE_SUPABASE_ANON_KEY from Supabase → Project Settings → API.\n'
    );
  }

  return {
  root: 'appshell',
  plugins: [react()],

  // root is appshell/, and Vite looks for .env in root by default — so the
  // APK never saw the keys in the project's .env and always ran in demo mode.
  envDir: projectDir,

  // Its own dependency cache: sharing node_modules/.vite with the website's
  // dev server made each one invalidate the other's pre-bundled files, and the
  // page loaded blank with "504 Outdated Optimize Dep".
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-app', import.meta.url)),

  // Relative asset URLs: the Android web view serves from a local
  // origin where absolute "/assets/..." paths do not resolve.
  base: './',

  // The dev server resolves the entry's "../src/..." against root as
  // "/src/...", which does not exist inside appshell/. Point it back.
  resolve: {
    alias: [{ find: /^\/src\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },

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
  };
});
