import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    delete window.location;
    window.location = { reload: vi.fn(), href: 'http://localhost/', pathname: '/' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>All Good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('All Good')).toBeInTheDocument();
  });

  it('auto-reloads when chunk loading error occurs for the first time', () => {
    const ChunkErrorComp = () => {
      throw new TypeError('Failed to fetch dynamically imported module: https://solve-it-rho.vercel.app/assets/some-chunk.js');
    };

    render(
      <ErrorBoundary>
        <ChunkErrorComp />
      </ErrorBoundary>
    );

    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('jit_chunk_eb_reload')).toBeTruthy();
  });

  it('shows friendly update UI if chunk reload was already attempted recently', () => {
    // Set cooldown within 15 seconds
    sessionStorage.setItem('jit_chunk_eb_reload', String(Date.now()));

    const ChunkErrorComp = () => {
      throw new TypeError('Failed to fetch dynamically imported module: https://solve-it-rho.vercel.app/assets/some-chunk.js');
    };

    render(
      <ErrorBoundary>
        <ChunkErrorComp />
      </ErrorBoundary>
    );

    expect(screen.getByText('App Update Available')).toBeInTheDocument();
    expect(screen.getByText('Update & Refresh')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update & Refresh'));
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('shows standard Runtime Error for non-chunk errors', () => {
    const StandardErrorComp = () => {
      throw new Error('Something went wrong in application logic');
    };

    render(
      <ErrorBoundary>
        <StandardErrorComp />
      </ErrorBoundary>
    );

    expect(screen.getByText('Runtime Error')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong in application logic/)).toBeInTheDocument();
  });
});
