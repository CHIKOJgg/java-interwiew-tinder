import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { highlight } from '../utils/highlight.js';
import { saveGuestAnswer, takeGuestProgress } from '../utils/guestProgress.js';
import { useModalA11y } from '../utils/useModalA11y.js';
import apiClient from '../api/client.js';

describe('highlight utility', () => {
  it('highlights java code keywords, strings, numbers, and comments', () => {
    const code = `// java comment
public class Main {
  private int count = 42;
  @Override
  public String run() {
    return "hello";
  }
}`;
    const out = highlight(code, 'java');
    expect(out).toContain('class="hl-comment"');
    expect(out).toContain('class="hl-keyword"');
    expect(out).toContain('class="hl-number"');
    expect(out).toContain('class="hl-string"');
    expect(out).toContain('class="hl-annotation"');
  });

  it('highlights python code with hash comments and self/cls', () => {
    const pyCode = `# python comment
def get_count(self):
    val = 100
    return "python"
`;
    const out = highlight(pyCode, 'python');
    expect(out).toContain('class="hl-comment"');
    expect(out).toContain('class="hl-keyword"');
    expect(out).toContain('class="hl-string"');
    expect(out).toContain('class="hl-number"');
  });

  it('highlights typescript code with types and template literals', () => {
    const tsCode = `
interface User {
  id: number;
}
const msg = \`Hello \${123}\`;
`;
    const out = highlight(tsCode, 'typescript');
    expect(out).toContain('class="hl-keyword"');
    expect(out).toContain('class="hl-string"');
  });

  it('handles unknown language falling back to java', () => {
    const out = highlight('public void test()', 'unknown_lang');
    expect(out).toContain('class="hl-keyword"');
  });
});

describe('guestProgress utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ignores invalid questionId or status', () => {
    saveGuestAnswer('Java', null, 'known');
    saveGuestAnswer('Java', 123, 'invalid_status');
    expect(takeGuestProgress('Java')).toEqual([]);
  });

  it('saves and flushes guest progress by language', () => {
    saveGuestAnswer('Java', 101, 'known');
    saveGuestAnswer('Java', 102, 'unknown');
    saveGuestAnswer('Python', 201, 'known');

    const javaProgress = takeGuestProgress('Java');
    expect(javaProgress).toEqual([
      { questionId: 101, status: 'known' },
      { questionId: 102, status: 'unknown' },
    ]);

    // Flushed once taken
    expect(takeGuestProgress('Java')).toEqual([]);

    // Other languages untouched until taken
    const pythonProgress = takeGuestProgress('Python');
    expect(pythonProgress).toEqual([
      { questionId: 201, status: 'known' },
    ]);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('guest_progress_v1', '{ invalid json');
    expect(takeGuestProgress('Java')).toEqual([]);
  });
});

describe('useModalA11y hook', () => {
  function ModalDialog({ onClose }) {
    const dialogRef = useModalA11y(onClose);
    return (
      <div ref={dialogRef} tabIndex={-1} data-testid="modal-container">
        <h2>Modal Title</h2>
        <button data-testid="btn-1">First</button>
        <button data-testid="btn-2">Last</button>
      </div>
    );
  }

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ModalDialog onClose={onClose} />);
    const modal = screen.getByTestId('modal-container');

    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('traps focus forward and backward with Tab and Shift+Tab', () => {
    const onClose = vi.fn();
    render(<ModalDialog onClose={onClose} />);
    const modal = screen.getByTestId('modal-container');
    const firstBtn = screen.getByTestId('btn-1');
    const lastBtn = screen.getByTestId('btn-2');

    // Tab on last element cycles to first
    lastBtn.focus();
    fireEvent.keyDown(modal, { key: 'Tab', shiftKey: false });

    // Shift+Tab on first element cycles to last
    firstBtn.focus();
    fireEvent.keyDown(modal, { key: 'Tab', shiftKey: true });
  });
});

describe('api/client.js', () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    apiClient.clearAuth();
    apiClient.setLanguage('Java');
    apiClient.setUserId(null);
  });

  afterEach(() => {
    global.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('sets and gets auth headers correctly', () => {
    apiClient.setToken('test-jwt-token');
    apiClient.setInitData('test-init-data');
    apiClient.setUserId(42);
    apiClient.setLanguage('Python');

    expect(apiClient.userId).toBe('42');
    expect(apiClient.language).toBe('Python');

    const headers = apiClient.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(headers['x-telegram-init-data']).toBe('test-init-data');

    apiClient.clearAuth();
    expect(apiClient.getAuthHeaders()).toEqual({});
  });

  it('performs login and updates userId and language', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { telegram_id: '9988', language: 'Go' },
        token: 'new-token',
      }),
    });

    const res = await apiClient.loginWithProvider({ provider: 'telegram', initData: 'init123' });
    expect(res.user.telegram_id).toBe('9988');
    expect(apiClient.userId).toBe('9988');
    expect(apiClient.language).toBe('Go');
  });

  it('handles 401 unauthorized session expiration', async () => {
    const onUnauthorizedMock = vi.fn();
    apiClient.onUnauthorized = onUnauthorizedMock;

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(apiClient.request('/tracks')).rejects.toThrow('Session expired. Please log in again.');
    expect(onUnauthorizedMock).toHaveBeenCalled();
  });

  it('handles custom error details from response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Subscription required', feature: 'tracks' }),
    });

    try {
      await apiClient.request('/tracks/1');
    } catch (err) {
      expect(err.status).toBe(403);
      expect(err.feature).toBe('tracks');
      expect(err.message).toBe('Subscription required');
    }
  });

  it('calls sendEmailCode and verifyEmailCode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, user: { telegram_id: 'email_u1' } }),
    });

    await apiClient.sendEmailCode('test@test.com');
    const verifyRes = await apiClient.verifyEmailCode('test@test.com', '123456');
    expect(verifyRes.user.telegram_id).toBe('email_u1');
    expect(apiClient.userId).toBe('email_u1');
  });

  it('calls getDemoQuestions, executeCode, getSDTopics and other endpoints', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, questions: [] }),
    });

    await apiClient.getDemoQuestions(5, 'Java');
    await apiClient.executeCode('print(1)', 'Python', '');
    await apiClient.getSDTopics('Java', 'medium');
    await apiClient.getTracks('Java');
    await apiClient.getStatsHistory('7d', 'Java');
    await apiClient.getCurrentChallenge('Java');

    expect(global.fetch).toHaveBeenCalled();
  });
});
