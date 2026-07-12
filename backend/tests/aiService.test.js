import { describe, it, expect, vi } from 'vitest';

// Keep the module graph side-effect free (no real DB/Redis/pino connections).
vi.mock('../src/config/database.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../src/config/redis.js', () => ({ default: { get: vi.fn(), setex: vi.fn() }, isConnected: vi.fn() }));
vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../src/services/languageRegistry.js', () => ({
  getLanguage: vi.fn(() => ({ prompts: {} })),
}));

const { parseAIResponse } = await import('../src/services/aiService.js');

describe('parseAIResponse', () => {
  it('parses plain JSON', () => {
    const r = parseAIResponse('{"title":"x","theory":"y"}');
    expect(r.title).toBe('x');
    expect(r.theory).toBe('y');
  });

  it('extracts JSON from fenced code block', () => {
    const r = parseAIResponse('```json\n{"title":"a","theory":"b"}\n```');
    expect(r.title).toBe('a');
  });

  it('recovers truncated JSON (model hit token limit mid-string)', () => {
    const truncated = '{"title":"a","theory":"b"';
    const r = parseAIResponse(truncated);
    expect(r.title).toBe('a');
    expect(r.theory).toBe('b');
  });

  it('recovers JSON buried in prose', () => {
    const prose = 'Here you go: {"title":"t","theory":"explanation here"} hope that helps';
    const r = parseAIResponse(prose);
    expect(r.title).toBe('t');
  });

  it('throws on empty input', () => {
    expect(() => parseAIResponse('   ')).toThrow();
  });

  it('throws when no valid JSON can be found', () => {
    expect(() => parseAIResponse('this is just text with no json at all')).toThrow();
  });
});
