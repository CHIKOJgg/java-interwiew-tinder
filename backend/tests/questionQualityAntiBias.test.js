import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLanguage, LANGUAGES } from '../src/services/languageRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Question Quality & Anti-Length-Bias Tests', () => {
  it('curated modern questions dataset exists and is properly formatted', () => {
    const filePath = path.join(ROOT_DIR, 'data/curated-modern-questions.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(questions.length).toBeGreaterThanOrEqual(20);

    for (const q of questions) {
      expect(q.question).toBeDefined();
      expect(q.question.length).toBeGreaterThan(15);
      expect(q.short_answer).toBeDefined();
      expect(q.short_answer.length).toBeGreaterThan(15);
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBe(4);
      expect(q.language).toBeDefined();
      expect(q.framework).toBeDefined();
      expect(q.topic).toBeDefined();
      expect(['Junior', 'Middle', 'Senior']).toContain(q.difficulty);
      expect(q.is_top).toBe(true);
      expect(q.top_rank).toBeGreaterThan(0);
    }
  });

  it('curated modern questions have balanced option lengths with no giveaway length bias', () => {
    const filePath = path.join(ROOT_DIR, 'data/curated-modern-questions.json');
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let totalQuestions = 0;
    let ratios = [];

    for (const q of questions) {
      totalQuestions++;
      const lens = q.options.map(o => o.length);
      const max = Math.max(...lens);
      const min = Math.min(...lens);
      const ratio = max / (min || 1);
      ratios.push(ratio);

      // No individual question should have an option > 2.0x longer than its shortest option
      expect(ratio).toBeLessThanOrEqual(2.0);
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    // The average length ratio across all options should be very tight (< 1.3x)
    expect(avgRatio).toBeLessThan(1.3);
  });

  it('top-questions.json dataset has eliminated extreme length bias', () => {
    const filePath = path.join(ROOT_DIR, 'data/top-questions.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(questions.length).toBeGreaterThanOrEqual(100);

    let correctLongestCount = 0;
    let totalWithOptions = 0;

    for (const q of questions) {
      if (q.options && q.options.length >= 3) {
        totalWithOptions++;
        const lens = q.options.map(o => o.length);
        const correctLen = lens[0];
        const maxLen = Math.max(...lens);
        if (correctLen === maxLen) correctLongestCount++;
      }
    }

    const percentageLongest = (correctLongestCount / totalWithOptions) * 100;
    // Before fix: 98.5% of questions had correct answer as strictly longest.
    // After fix: should be below 30%, close to random distribution.
    expect(percentageLongest).toBeLessThan(35);
  });

  it('AI test prompt strictly enforces anti-length-bias rules', () => {
    const javaLang = getLanguage('Java');
    const prompt = javaLang.prompts.test('Sample question', 'Sample correct answer with 60 characters for length validation');
    expect(prompt.user).toContain('LENGTH-BIAS');
    expect(prompt.user).toContain('Длина каждого из 3 неверных вариантов');
  });
});
