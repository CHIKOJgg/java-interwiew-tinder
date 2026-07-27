import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAvailableLanguages, getLanguage, getCategories } from '../src/services/languageRegistry.js';

describe('languageRegistry — Sprint 3 additions', () => {
  it('getAvailableLanguages includes Go, Rust, React, Kotlin', () => {
    const langs = getAvailableLanguages();
    expect(langs).toContain('Go');
    expect(langs).toContain('Rust');
    expect(langs).toContain('React');
    expect(langs).toContain('Kotlin');
    expect(langs).toContain('Java');
    expect(langs).toContain('Python');
    expect(langs).toContain('TypeScript');
  });

  it('getLanguage returns valid structure for Go', () => {
    const go = getLanguage('Go');
    expect(go).toBeDefined();
    expect(go.id).toBe('Go');
    expect(go.categories).toBeInstanceOf(Array);
    expect(go.categories.length).toBeGreaterThan(0);
    expect(go.prompts).toBeDefined();
    expect(Object.keys(go.prompts)).toEqual([
      'explanation', 'test', 'bug', 'blitz', 'code', 'interview', 'resume',
    ]);
    expect(typeof go.codeLanguage).toBe('string');
    expect(typeof go.systemPrompt).toBe('string');
  });

  it('getLanguage returns valid structure for Rust', () => {
    const rust = getLanguage('Rust');
    expect(rust.id).toBe('Rust');
    expect(rust.categories).toContain('Ownership');
    expect(rust.codeLanguage).toBe('rust');
  });

  it('getLanguage returns valid structure for React', () => {
    const react = getLanguage('React');
    expect(react.id).toBe('React');
    expect(react.categories).toContain('React Core');
    expect(react.categories).toContain('Hooks');
    expect(react.codeLanguage).toBe('javascript');
  });

  it('getLanguage returns valid structure for Kotlin', () => {
    const kt = getLanguage('Kotlin');
    expect(kt.id).toBe('Kotlin');
    expect(kt.categories).toContain('Coroutines');
    expect(kt.codeLanguage).toBe('kotlin');
  });

  it('getLanguage falls back to Java for unknown id', () => {
    expect(getLanguage('FooBar')).toBe(getLanguage('Java'));
  });

  it('getCategories returns array for new languages', () => {
    expect(getCategories('Go')).toBeInstanceOf(Array);
    expect(getCategories('Rust')).toBeInstanceOf(Array);
    expect(getCategories('React')).toBeInstanceOf(Array);
    expect(getCategories('Kotlin')).toBeInstanceOf(Array);
  });
});