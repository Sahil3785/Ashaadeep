import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/* ============================================================
   Build config for the Windows staff app.

   Like vite.config.app.js, a separate build so the program ships
   only the staff dashboard. Output goes to dist-desktop/, which
   electron-builder packs into the installer.

     npm run dev:desktop     open it on this computer
     npm run exe             build the Windows installer
   ============================================================ */
const projectDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command, mode }) => {
  // Same rule as the APK: a release must talk to the real database.
  const env = loadEnv(mode, projectDir, 'VITE_');
  const configured = Boolean(env.VITE_SUPABASE_URL?.startsWith('http') && env.VITE_SUPABASE_ANON_KEY);
  if (command === 'build' && !configured && process.env.ALLOW_DEMO_BUILD !== '1') {
    throw new Error('\n\n  The Windows app cannot be built without the school database keys in .env.\n');
  }

  return {
    root: 'desktop',
    plugins: [react()],
    envDir: projectDir,
    cacheDir: fileURLToPath(new URL('./node_modules/.vite-desktop', import.meta.url)),
    // Loaded from file:// inside the program, so asset paths must be relative.
    base: './',
    resolve: {
      alias: [{ find: /^\/src\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
    },
    server: { port: 3200 },
    build: {
      outDir: '../dist-desktop',
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], icons: ['lucide-react'] } },
      },
    },
  };
});
