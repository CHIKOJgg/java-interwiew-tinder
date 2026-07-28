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
  return {
    configFile: false,
    root,
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
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
