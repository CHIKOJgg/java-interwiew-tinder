import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const manualChunks = (id) => {
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
    if (id.includes('lucide-react') || id.includes('zustand')) return 'ui';
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
