import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const files = [
  'questions-data.json',
  'top-questions.json',
  'curated-modern-questions.json'
];

const BANNED_OPTION = /^(i come on|don't know|dont know|know|not sure|maybe|не знаю|знаю|не уверен|возможно|yes|no|да|нет|true|false)$/i;
const STUB_OPTION = [
  /^alternative approach$/i,
  /^common misconception$/i,
  /^i don'?t know$/i,
  /^i know$/i,
  /^other$/i,
  /^all of the above$/i,
  /^none of the above$/i,
];

const normText = (s) => (s || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const hasCyrillic = (s) => /[\u0400-\u04FF]/.test(s || '');

const report = {};

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) continue;

  const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const fileReport = {
    total: questions.length,
    languages: {},
    difficulties: {},
    categories: {},
    issues: {
      missingQuestion: [],
      missingAnswer: [],
      shortQuestion: [],
      shortAnswer: [],
      notEnoughOptions: [],
      duplicateOptions: [],
      stubOnlyOptions: [],
      bannedOptions: [],
      extremeLengthBias: [],
      correctLongestCount: 0,
      totalWithOptions: 0,
      duplicateQuestions: [],
      mixedLanguageQnA: [],
      nonAsciiInEnglish: [] // english questions with em-dash, curly quotes that trip [^ -~]
    }
  };

  const seen = new Map();

  questions.forEach((q, idx) => {
    const qText = (q.question_text || q.question || '').trim();
    const aText = (q.short_answer || q.answer || '').trim();
    const lang = q.language || 'Unknown';
    const diff = q.difficulty || 'Unknown';
    const cat = q.category || 'Unknown';

    fileReport.languages[lang] = (fileReport.languages[lang] || 0) + 1;
    fileReport.difficulties[diff] = (fileReport.difficulties[diff] || 0) + 1;
    fileReport.categories[cat] = (fileReport.categories[cat] || 0) + 1;

    // Checks
    if (!qText) fileReport.issues.missingQuestion.push(idx);
    if (!aText) fileReport.issues.missingAnswer.push(idx);
    if (qText.length > 0 && qText.length < 10) fileReport.issues.shortQuestion.push({ idx, text: qText });
    if (aText.length > 0 && aText.length < 8) fileReport.issues.shortAnswer.push({ idx, text: aText });

    // Options
    const opts = Array.isArray(q.options) ? q.options.filter(o => typeof o === 'string').map(o => o.trim()) : [];
    if (opts.length > 0) {
      fileReport.issues.totalWithOptions++;
      if (opts.length < 3) {
        fileReport.issues.notEnoughOptions.push({ idx, count: opts.length });
      }

      const lowerOpts = opts.map(o => o.toLowerCase());
      if (new Set(lowerOpts).size !== lowerOpts.length) {
        fileReport.issues.duplicateOptions.push({ idx, opts });
      }

      if (opts.every(opt => STUB_OPTION.some(re => re.test(opt)))) {
        fileReport.issues.stubOnlyOptions.push({ idx, opts });
      }

      if (opts.some(opt => BANNED_OPTION.test(opt))) {
        fileReport.issues.bannedOptions.push({ idx, opts });
      }

      // Length bias analysis
      const lens = opts.map(o => o.length);
      const correctLen = lens[0];
      const maxLen = Math.max(...lens);
      if (correctLen === maxLen) {
        fileReport.issues.correctLongestCount++;
      }

      const distractorLens = lens.slice(1);
      const avgDistractor = distractorLens.length > 0 ? (distractorLens.reduce((a, b) => a + b, 0) / distractorLens.length) : 0;
      if (avgDistractor > 0 && correctLen > 2.2 * avgDistractor && (correctLen - avgDistractor > 35)) {
        fileReport.issues.extremeLengthBias.push({
          idx,
          question: qText.slice(0, 60),
          correctLen,
          avgDistractor: Math.round(avgDistractor),
          correctOpt: opts[0],
          distractors: opts.slice(1)
        });
      }
    }

    // Duplicate question text
    const key = `${lang}::${normText(qText)}`;
    if (seen.has(key)) {
      fileReport.issues.duplicateQuestions.push({
        idx,
        originalIdx: seen.get(key),
        text: qText.slice(0, 70),
        language: lang
      });
    } else {
      seen.set(key, idx);
    }

    // Language mix check
    const qCyr = hasCyrillic(qText);
    const aCyr = hasCyrillic(aText);
    if (qText && aText && qCyr !== aCyr) {
      fileReport.issues.mixedLanguageQnA.push({
        idx,
        qCyr,
        aCyr,
        q: qText.slice(0, 60),
        a: aText.slice(0, 60)
      });
    }

    // Non-ASCII check in English questions (em dash, smart quotes, etc.)
    if (lang !== 'Russian' && !qCyr) {
      const hasNonAscii = /[^ -~]/.test(qText) || /[^ -~]/.test(aText);
      if (hasNonAscii) {
        fileReport.issues.nonAsciiInEnglish.push({
          idx,
          q: qText.slice(0, 60),
          nonAsciiChars: [...new Set((qText + aText).match(/[^ -~]/g) || [])]
        });
      }
    }
  });

  report[file] = {
    total: fileReport.total,
    languages: fileReport.languages,
    difficulties: fileReport.difficulties,
    categoriesCount: Object.keys(fileReport.categories).length,
    issuesCount: {
      missingQuestion: fileReport.issues.missingQuestion.length,
      missingAnswer: fileReport.issues.missingAnswer.length,
      shortQuestion: fileReport.issues.shortQuestion.length,
      shortAnswer: fileReport.issues.shortAnswer.length,
      notEnoughOptions: fileReport.issues.notEnoughOptions.length,
      duplicateOptions: fileReport.issues.duplicateOptions.length,
      stubOnlyOptions: fileReport.issues.stubOnlyOptions.length,
      bannedOptions: fileReport.issues.bannedOptions.length,
      extremeLengthBias: fileReport.issues.extremeLengthBias.length,
      correctLongestRatio: fileReport.issues.totalWithOptions > 0
        ? ((fileReport.issues.correctLongestCount / fileReport.issues.totalWithOptions) * 100).toFixed(1) + '%'
        : 'N/A',
      duplicateQuestions: fileReport.issues.duplicateQuestions.length,
      mixedLanguageQnA: fileReport.issues.mixedLanguageQnA.length,
      nonAsciiInEnglish: fileReport.issues.nonAsciiInEnglish.length
    },
    sampleIssues: {
      extremeLengthBias: fileReport.issues.extremeLengthBias.slice(0, 3),
      duplicates: fileReport.issues.duplicateQuestions.slice(0, 5),
      mixedLanguage: fileReport.issues.mixedLanguageQnA.slice(0, 3),
      nonAsciiInEnglish: fileReport.issues.nonAsciiInEnglish.slice(0, 5)
    }
  };
}

console.log(JSON.stringify(report, null, 2));
