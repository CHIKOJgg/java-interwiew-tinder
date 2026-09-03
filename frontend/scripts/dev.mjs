import { createServer } from 'vite';
import { createViteConfig } from './viteConfig.mjs';

const server = await createServer({
  ...createViteConfig(),
  mode: 'development',
  optimizeDeps: {
    // NOTE: noDiscovery:true broke dev boot (react-i18next → html-parse-stringify
    // → void-elements is CJS and must be pre-bundled). Keep default discovery.
    include: ['react', 'react-dom', 'react-i18next', 'html-parse-stringify', 'void-elements'],
  },
});

await server.listen();
server.printUrls();
