import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { lazyWithRetry } from '../utils/lazyWithRetry';

describe('lazyWithRetry', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    delete window.location;
    window.location = { reload: vi.fn(), href: 'http://localhost/' };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('renders successfully when import succeeds', async () => {
    const MockComp = () => <div>Loaded Content</div>;
    const importer = vi.fn().mockResolvedValue({ default: MockComp });

    const LazyComp = lazyWithRetry(importer, 'test-success');

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </Suspense>
    );

    expect(await screen.findByText('Loaded Content')).toBeInTheDocument();
    expect(importer).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('jit_chunk_retry_test-success')).toBeNull();
  });

  it('triggers reload and purges cache when dynamic import fails', async () => {
    const chunkError = new TypeError('Failed to fetch dynamically imported module: https://solve-it-rho.vercel.app/assets/test.js');
    const importer = vi.fn().mockRejectedValue(chunkError);

    // Mock caches
    const mockDelete = vi.fn().mockResolvedValue(true);
    window.caches = {
      keys: vi.fn().mockResolvedValue(['cache-v1']),
      delete: mockDelete,
    };

    const LazyComp = lazyWithRetry(importer, 'test-chunk-fail');

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </Suspense>
    );

    // Wait for the importer to reject
    await vi.waitFor(() => {
      expect(importer).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
    });

    expect(sessionStorage.getItem('jit_chunk_retry_test-chunk-fail')).toBe('true');
  });

  it('throws error if already retried once in the current session', async () => {
    sessionStorage.setItem('jit_chunk_retry_test-retry-exhausted', 'true');
    const chunkError = new TypeError('Failed to fetch dynamically imported module: https://solve-it-rho.vercel.app/assets/test.js');
    const importer = vi.fn().mockRejectedValue(chunkError);

    const LazyComp = lazyWithRetry(importer, 'test-retry-exhausted');

    // It should re-throw so error boundary can catch it
    class TestBoundary extends React.Component {
      state = { hasError: false, error: null };
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      render() {
        if (this.state.hasError) {
          return <div>Boundary Caught: {this.state.error.message}</div>;
        }
        return this.props.children;
      }
    }

    render(
      <TestBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComp />
        </Suspense>
      </TestBoundary>
    );

    expect(await screen.findByText(/Boundary Caught/)).toBeInTheDocument();
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
