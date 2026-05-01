import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../config/database.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ─── openrouter/free randomly selects from all available free models on OpenRouter.
// It automatically filters for models that support the features your request needs.
// This is the correct model string for zero-cost inference with auto model selection.
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

const PROMPT_VERSION = 'v1';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '3000'); // free models ~20-40s

// Warn on startup if key is missing
if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set — all AI calls will fail');
}

// ─── Cache helpers ─────────────────────────────────────────────────────
function generateClusterId(text, language = 'Java') {
  const normalized = (language + ':' + text)
    .toLowerCase().replace(/[^\wа-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized || 'empty').digest('hex');
}

function parseAIResponse(content) {
  // 1. Try direct parse
  try { return JSON.parse(content); } catch { }
  // 2. Strip markdown fences
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { } }
  // 3. Extract first {...} or [...]
  const obj = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (obj) { try { return JSON.parse(obj[1]); } catch { } }
  throw new Error('No JSON found in AI response: ' + content.substring(0, 120));
}

async function readCache(clusterId, mode, language) {
  try {
    const { rows } = await pool.query(
      'SELECT response FROM ai_cache WHERE cluster_id=$1 AND mode=$2 AND prompt_version=$3 AND language=$4',
      [clusterId, mode, PROMPT_VERSION, language]
    );
    return rows.length > 0 ? rows[0].response : null;
  } catch (err) {
    console.error('Cache read error:', err.message);
    return null;
  }
}

async function writeCache(clusterId, mode, language, content) {
  try {
    await pool.query(
      `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cluster_id, mode, prompt_version, language) DO NOTHING`,
      [clusterId, mode, MODEL, PROMPT_VERSION, language, content]
    );
  } catch (err) {
    console.error('Cache write error:', err.message);
  }
}

// ─── Dedup in-flight requests ──────────────────────────────────────────
const pendingRequests = new Map();

// ─── Single OpenRouter call ────────────────────────────────────────────
async function callOpenRouter(messages, maxTokens = 500, temperature = 0.7) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://interview-tinder.app',
        'X-Title': 'Interview Tinder',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error('Empty response from OpenRouter');

  console.log(`✅ OpenRouter (${MODEL}) responded [${content.length} chars]`);
  return content.trim();
}

// ─── Core call with cache + dedup ──────────────────────────────────────
async function callAI(messages, { questionText, mode, language = 'Java', isJson = false, maxTokens = 500, temperature = 0.7 }) {
  const clusterId = generateClusterId(questionText, language);
  const dedupKey = `${clusterId}:${mode}:${language}`;

  // 1. DB cache
  const cached = await readCache(clusterId, mode, language);
  if (cached) {
    console.log(`✅ Cache hit [${mode}] ${language}`);
    return isJson ? parseAIResponse(cached) : cached;
  }

  // 2. Dedup concurrent identical requests
  if (pendingRequests.has(dedupKey)) {
    const result = await pendingRequests.get(dedupKey);
    return isJson ? parseAIResponse(typeof result === 'string' ? result : JSON.stringify(result)) : result;
  }

  const promise = (async () => {
    const content = await callOpenRouter(messages, maxTokens, temperature);
    await writeCache(clusterId, mode, language, content);
    return isJson ? parseAIResponse(content) : content;
  })();

  pendingRequests.set(dedupKey, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(dedupKey);
  }
}

// ─── Public API ────────────────────────────────────────────────────────
export const checkCache = (questionText, mode, _model, language = 'Java') =>
  readCache(generateClusterId(questionText, language), mode, language);

export function generateExplanation(questionText, shortAnswer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: lang.systemPrompt },
      { role: 'user', content: lang.prompts.explanation(questionText, shortAnswer) },
    ],
    { questionText, mode: 'explanation', language, isJson: false, maxTokens: 600, temperature: 0.7 }
  );
}

export function generateTestOptions(questionText, correctAnswer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО JSON массивом из 3 строк. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.test(questionText, correctAnswer) },
    ],
    { questionText, mode: 'test', language, isJson: true, maxTokens: 200, temperature: 0.5 }
  );
}

export function generateBuggyCode(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.bug(questionText, topic) },
    ],
    { questionText, mode: 'bug', language, isJson: true, maxTokens: 400, temperature: 0.6 }
  );
}

export function generateBlitzStatement(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.blitz(questionText, topic) },
    ],
    { questionText, mode: 'blitz', language, isJson: true, maxTokens: 150, temperature: 0.7 }
  );
}

export function evaluateInterviewAnswer(question, answer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.interview(question, answer) },
    ],
    { questionText: `${question}|${answer}`, mode: 'interview', language, isJson: true, maxTokens: 600, temperature: 0.5 }
  );
}

export function generateCodeCompletion(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.code(questionText, topic) },
    ],
    { questionText, mode: 'code', language, isJson: true, maxTokens: 600, temperature: 0.3 }
  );
}

export function analyzeResume(resumeText, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.resume(resumeText) },
    ],
    { questionText: resumeText.substring(0, 300), mode: 'resume', language, isJson: true, maxTokens: 600, temperature: 0.3 }
  );
}
