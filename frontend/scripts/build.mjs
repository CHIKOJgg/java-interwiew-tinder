import { build } from 'vite';
import { createViteConfig } from './viteConfig.mjs';
import { generateSeoPages } from '../../scripts/build-seo-pages.mjs';

try {
  await generateSeoPages();
} catch (err) {
  console.warn('SEO page generation error (continuing build):', err.message);
}

await build(createViteConfig());
