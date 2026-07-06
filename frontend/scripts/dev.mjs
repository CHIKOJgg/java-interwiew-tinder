import { createServer } from 'vite';
import { createViteConfig } from './viteConfig.mjs';

const server = await createServer({
  ...createViteConfig(),
  mode: 'development',
  optimizeDeps: {
    noDiscovery: true,
  },
});

await server.listen();
server.printUrls();
