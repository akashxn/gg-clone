import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Keep the panorama dataset and the viewer libraries in their own
        // chunks so an app-code change does not invalidate them in cache.
        manualChunks: {
          viewer: ['pannellum'],
          map: ['leaflet'],
        },
      },
    },
  },
});
