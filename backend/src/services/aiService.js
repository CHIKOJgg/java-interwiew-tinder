import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../config/database.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ─── Real OpenRouter free model IDs ──────────────────────────────────
// These are actual working free-tier models on OpenRouter as of 2025.
// Free models are slower (10–30s) — timeout is set accordingly.
const FAST_MODEL = process.env.OPENROUTER_FAST_MODEL || 'openrouter/free';
const QUALITY_MODEL = process.env.OPENROUTER_QUALITY_MODEL || 'openrouter/free';

// Fallback chain: if primary fails, try these in order
const FALLBACK_MODELS = [
  'openrouter/free',
  'openrouter/free',
];

const PROMPT_VERSION = 'v1';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '30000'); // 30s for free models

// ─── Helpers ─────────────────────────────────────────────────────────

function generateClusterId(text, language = 'Java') {
  const normalized = (language + ':' + text).toLowerCase().replace(/[^\w\sа-яё]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized || 'empty').digest('hex');
}

const parseAIResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/) ||
        content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      throw new Error('No JSON found in response');
    } catch {
      console.error('Failed to parse AI response:', content?.substring(0, 200));
      throw new Error('Failed to parse AI response');
    }
  }
};

// ─── Dedup & Cache ───────────────────────────────────────────────────

const pendingRequests = new Map();

export const checkCache = async (questionText, mode, model, language = 'Java') => {
  try {
    const clusterId = generateClusterId(questionText, language);
    const { rows } = await pool.query(
      'SELECT response FROM ai_cache WHERE cluster_id = $1 AND mode = $2 AND prompt_version = $3 AND language = $4',
      [clusterId, mode, PROMPT_VERSION, language]
    );
    return rows.length > 0 ? rows[0].response : null;
  } catch (err) {
    console.error('DB Cache read error:', err.message);
    return null;
  }
};

// ─── Single model call ───────────────────────────────────────────────

async function callModel(messages, modelId, maxTokens, temperature) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://github.com/java-interview-tinder',
        'X-Title': 'Java Interview Tinder',
      },
      body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenRouter ${response.status}: ${errBody.substring(0, 100)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from model');
    return content.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Core AI Call (cache → primary model → fallbacks) ───────────────

async function callAI(messages, context, maxTokens = 400, temperature = 0.7, isJson = false) {
  const { questionText, mode, model: primaryModel, fallbackTemplate, language = 'Java' } = context;

  const clusterId = generateClusterId(questionText, language);
  const cacheKey = `${clusterId}:${mode}:${language}`;

  // 1. Check DB Cache (model-agnostic — any model's answer is valid)
  try {
    const { rows } = await pool.query(
      'SELECT response FROM ai_cache WHERE cluster_id = $1 AND mode = $2 AND prompt_version = $3 AND language = $4',
      [clusterId, mode, PROMPT_VERSION, language]
    );
    if (rows.length > 0) {
      console.log(`✅ Cache hit: ${mode} ${language}`);
      return isJson ? parseAIResponse(rows[0].response) : rows[0].response;
    }
  } catch (err) {
    console.error('DB Cache read error:', err.message);
  }

  // 2. Deduplicate concurrent identical requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const aiPromise = (async () => {
    if (!OPENROUTER_API_KEY) {
      console.warn('⚠️  OPENROUTER_API_KEY not set — returning fallback');
      return fallbackTemplate;
    }

    const modelsToTry = [primaryModel, ...FALLBACK_MODELS];
    let lastError;

    for (const modelId of modelsToTry) {
      try {
        console.log(`🤖 Calling ${modelId} for ${mode}...`);
        const content = await callModel(messages, modelId, maxTokens, temperature);

        // 3. Store in DB Cache
        try {
          await pool.query(
            `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (cluster_id, mode, prompt_version, language) DO NOTHING`,
            [clusterId, mode, modelId, PROMPT_VERSION, language, content]
          );
        } catch (dbErr) {
          // Cache write failure is non-fatal
          console.error('DB Cache write error:', dbErr.message);
        }

        console.log(`✅ ${modelId} responded for ${mode}`);
        return isJson ? parseAIResponse(content) : content;
      } catch (err) {
        lastError = err;
        console.error(`❌ ${modelId} failed for ${mode}:`, err.message);
        // Try next model
      }
    }

    console.error('All models failed, using fallback. Last error:', lastError?.message);
    return fallbackTemplate;
  })();

  pendingRequests.set(cacheKey, aiPromise);
  try {
    return await aiPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export const generateExplanation = (questionText, shortAnswer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: lang.systemPrompt },
      { role: 'user', content: lang.prompts.explanation(questionText, shortAnswer) },
    ],
    { questionText, mode: 'explanation', model: QUALITY_MODEL, fallbackTemplate: 'Объяснение временно недоступно. Пожалуйста, попробуйте позже.', language },
    500, 0.7, false
  );
};

export const generateTestOptions = (questionText, correctAnswer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY a JSON array of 3 strings. No explanations, no markdown.' },
      { role: 'user', content: lang.prompts.test(questionText, correctAnswer) },
    ],
    { questionText, mode: 'test', model: FAST_MODEL, fallbackTemplate: ['Вариант A', 'Вариант B', 'Вариант C'], language },
    150, 0.5, true
  );
};

export const generateBuggyCode = (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY valid JSON. No markdown, no explanation.' },
      { role: 'user', content: lang.prompts.bug(questionText, topic) },
    ],
    { questionText, mode: 'bug', model: FAST_MODEL, fallbackTemplate: { code: '// Сервис временно недоступен', bug: 'N/A', options: ['N/A', 'N/A', 'N/A', 'N/A'] }, language },
    300, 0.6, true
  );
};

export const generateBlitzStatement = (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY valid JSON. No markdown, no explanation.' },
      { role: 'user', content: lang.prompts.blitz(questionText, topic) },
    ],
    { questionText, mode: 'blitz', model: FAST_MODEL, fallbackTemplate: { statement: 'Сервис временно недоступен.', isCorrect: false }, language },
    150, 0.7, true
  );
};

export const evaluateInterviewAnswer = (question, answer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY valid JSON. No markdown, no explanation.' },
      { role: 'user', content: lang.prompts.interview(question, answer) },
    ],
    { questionText: `${question}|${answer}`, mode: 'interview', model: QUALITY_MODEL, fallbackTemplate: { score: 5, feedback: 'Оценка временно недоступна.', correctVersion: 'N/A' }, language },
    200, 0.5, true
  );
};

export const generateCodeCompletion = (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY valid JSON. No markdown, no explanation.' },
      { role: 'user', content: lang.prompts.code(questionText, topic) },
    ],
    { questionText, mode: 'code', model: FAST_MODEL, fallbackTemplate: { snippet: '// Сервис временно недоступен', correctPart: 'N/A', options: ['N/A', 'N/A', 'N/A', 'N/A'] }, language },
    300, 0.6, true
  );
};

export const analyzeResume = (resumeText, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Return ONLY valid JSON. No markdown, no explanation.' },
      { role: 'user', content: lang.prompts.resume(resumeText) },
    ],
    { questionText: resumeText.substring(0, 200), mode: 'resume', model: QUALITY_MODEL, fallbackTemplate: { skills: [], experienceLevel: 'Unknown', strengths: [], improvementAreas: [], suggestedQuestions: [] }, language },
    500, 0.3, true
  );
};
