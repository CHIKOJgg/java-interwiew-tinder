import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

describe('languageRegistry', () => {
  let LANGUAGES;
  let getLanguage;
  let getAvailableLanguages;
  let getCategories;

  beforeAll(async () => {
    const mod = await import('../src/services/languageRegistry.js');
    LANGUAGES = mod.LANGUAGES;
    getLanguage = mod.getLanguage;
    getAvailableLanguages = mod.getAvailableLanguages;
    getCategories = mod.getCategories;
  });

  beforeEach(() => {});

  it('exports LANGUAGES', () => {
    expect(LANGUAGES).toBeDefined();
    expect(LANGUAGES.Java).toBeDefined();
    expect(LANGUAGES.Python).toBeDefined();
    expect(LANGUAGES.TypeScript).toBeDefined();
  });

  it('getLanguage returns object with all 7 modes for Java/Python/TypeScript', () => {
    for (const id of ['Java', 'Python', 'TypeScript']) {
      const lang = getLanguage(id);
      expect(lang).toBeDefined();
      expect(lang.prompts).toBeDefined();
      expect(Object.keys(lang.prompts)).toEqual(
        expect.arrayContaining(['explanation', 'test', 'bug', 'blitz', 'code', 'interview', 'resume'])
      );
    }
  });

  it('getLanguage falls back to Java for unknown id', () => {
    expect(getLanguage('Nope')).toBe(LANGUAGES.Java);
  });

  it('getAvailableLanguages returns all three', () => {
    expect(getAvailableLanguages()).toEqual(['Java', 'Python', 'TypeScript']);
  });

  it('getCategories returns array for Java', () => {
    expect(Array.isArray(getCategories('Java'))).toBe(true);
    expect(getCategories('Java').length).toBeGreaterThan(0);
  });

  it('getCategories falls back to Java categories for unknown', () => {
    expect(getCategories('Nope')).toEqual(getCategories('Java'));
  });

  it('every mode prompt returns {system,user} with non-empty user', () => {
    const modes = ['explanation', 'test', 'bug', 'blitz', 'code', 'interview', 'resume'];
    for (const id of ['Java', 'Python', 'TypeScript']) {
      const lang = getLanguage(id);
      for (const mode of modes) {
        const args = mode === 'resume' ? ['', 'some text'] : ['question?', 'answer'];
        const p = lang.prompts[mode](...args);
        expect(p).toHaveProperty('system');
        expect(p).toHaveProperty('user');
        expect(typeof p.system).toBe('string');
        expect(typeof p.user).toBe('string');
        expect(p.user.length).toBeGreaterThan(0);
        if (mode !== 'bug') {
          expect(p.system).toContain('JSON API');
        }
      }
    }
  });

  it('has codeLanguage and systemPrompt', () => {
    for (const id of ['Java', 'Python', 'TypeScript']) {
      const lang = getLanguage(id);
      expect(lang.codeLanguage).toBeDefined();
      expect(typeof lang.systemPrompt).toBe('string');
      expect(lang.systemPrompt.length).toBeGreaterThan(0);
    }
  });

  it('resume mode user comes from resume(text)', () => {
    const p = getLanguage('Java').prompts.resume('my resume text');
    expect(p.user).toContain('my resume text');
  });
});
