import { lazy } from 'react';

/**
 * Wraps React.lazy with automatic reload & cache purging when a dynamic chunk
 * fails to load (typically after a deployment when old chunk hashes are purged).
 *
 * @param {() => Promise<{ default: any }>} componentImport
 * @param {string} [name='component']
 */
export function lazyWithRetry(componentImport, name = 'component') {
  return lazy(async () => {
    const retryKey = `jit_chunk_retry_${name}`;
    const hasRetried = sessionStorage.getItem(retryKey);

    try {
      const module = await componentImport();
      // On success, reset the retry tracker
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error) {
      const msg = error?.message || String(error || '');
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !hasRetried) {
        sessionStorage.setItem(retryKey, 'true');

        // Clear all Service Worker / CacheStorage caches so fresh shell is pulled
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {
            // Best effort cache purge
          }
        }

        // Unregister service worker if active so reload gets fresh assets directly
        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          } catch {
            // Best effort SW unregister
          }
        }

        // Force reload page to grab updated index.html with new asset manifest
        window.location.reload();

        // Return a promise that never resolves so Suspense stays in fallback
        // instead of crashing to the ErrorBoundary while the page refreshes
        return new Promise(() => {});
      }

      // If already retried or not a chunk error, re-throw to allow ErrorBoundary to capture
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });
}

export default lazyWithRetry;
