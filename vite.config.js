import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        privacy: resolve(__dirname, 'privacy.html')
      },
      output: {
        manualChunks: {
          three: ['three'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});

