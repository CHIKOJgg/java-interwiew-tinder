import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const manualChunks = (id) => {
  if (id.includes('node_modules')) {
    if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
      return 'react-vendor';
    }
    if (id.includes('lucide-react') || id.includes('zustand')) return 'ui';
    if (id.includes('/@react-spring/') || id.includes('/react-tinder-card')) return 'spring-tinder';
  }

  if (id.includes('/src/components/ExplanationModal')) {
    return 'ai';
  }

  return undefined;
};

export function createViteConfig() {
  const apiTarget = process.env.VITE_BACKEND_URL || 'https://java-interwiew-tinder-production.up.railway.app';
  return {
    configFile: false,
    root,
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
}
