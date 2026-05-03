import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../config/database.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// openrouter/free = zero-cost auto-routing to any available free model
const MODEL         = process.env.OPENROUTER_MODEL || 'openrouter/free';
const PROMPT_VERSION = 'v1';
const AI_TIMEOUT_MS  = parseInt(process.env.AI_TIMEOUT_MS || '45000');

// Force raw JSON output — no markdown, no prose, no fences
const JSON_SYSTEM = [
  'You are a JSON API endpoint.',
  'RULES: Output ONLY raw JSON. No markdown. No code fences. No explanations.',
  'Your response must start with { or [ and be valid JSON.',
].join(' ');

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set — all AI calls will fail');
}

// ─── Cluster ID ────────────────────────────────────────────────────────
function generateClusterId(text, language = 'Java') {
  const normalized = (language + ':' + text)
    .toLowerCase()
    .replace(/[^\wа-яё\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized || 'empty').digest('hex');
}

// ─── JSON parser — 5-stage recovery ───────────────────────────────────
function parseAIResponse(content) {
  if (!content?.trim()) throw new Error('Empty AI response');
  const text = content.trim();

  // Stage 1: direct
  try { return JSON.parse(text); } catch {}

  // Stage 2: strip ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }

  // Stage 3: first {...} block (model added prose before/after)
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }

  // Stage 4: first [...] array
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }

  // Stage 5: flatten newlines + remove trailing commas
  try {
    return JSON.parse(
      text.replace(/[\r\n]+/g, ' ').replace(/,\s*([}\]])/g, '$1')
    );
  } catch {}

  throw new Error('No valid JSON found: ' + text.substring(0, 120));
}

// ─── Cache — read ─────────────────────────────────────────────────────
// Intentionally does NOT filter by model so any model's cached response is reused.
async function readCache(clusterId, mode, language) {
  try {
    const { rows } = await pool.query(
      `SELECT response FROM ai_cache
       WHERE cluster_id=$1 AND mode=$2 AND prompt_version=$3 AND language=$4
       ORDER BY created_at DESC LIMIT 1`,
      [clusterId, mode, PROMPT_VERSION, language]
    );
    return rows.length > 0 ? rows[0].response : null;
  } catch (err) {
    console.error('Cache read error:', err.message);
    return null;
  }
}

// ─── Cache — write ────────────────────────────────────────────────────
// ON CONFLICT must list ALL 5 columns of the UNIQUE constraint:
//   UNIQUE(cluster_id, mode, model, prompt_version, language)
async function writeCache(clusterId, mode, language, content) {
  try {
    await pool.query(
      `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cluster_id, mode, model, prompt_version, language) DO UPDATE
         SET response = EXCLUDED.response,
             created_at = CURRENT_TIMESTAMP`,
      [clusterId, mode, MODEL, PROMPT_VERSION, language, content]
    );
  } catch (err) {
    console.error('Cache write error:', err.message);
  }
}

// ─── Public cache helpers ─────────────────────────────────────────────
// Returns the raw TEXT string (caller decides whether to parse as JSON).
export const readCachePublic = (questionText, mode, language = 'Java') =>
  readCache(generateClusterId(questionText, language), mode, language);

// Alias used by server.js
export const checkCache = readCachePublic;

// ─── In-flight dedup ──────────────────────────────────────────────────
const pendingRequests = new Map();

// ─── OpenRouter HTTP call ─────────────────────────────────────────────
async function callOpenRouter(messages, maxTokens, temperature) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.APP_URL || 'https://interview-tinder.app',
        'X-Title':       'Interview Tinder',
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.substring(0, 200)}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error('Empty response from OpenRouter');

  const usedModel = data.model || MODEL;
  console.log(`✅ OpenRouter [${usedModel}] → ${content.length} chars [mode will be cached]`);
  return content.trim();
}

// ─── Core: cache → dedup → AI → write ────────────────────────────────
async function callAI(messages, {
  questionText,
  mode,
  language   = 'Java',
  isJson     = false,
  maxTokens  = 500,
  temperature = 0.7,
}) {
  const clusterId = generateClusterId(questionText, language);
  const dedupKey  = `${clusterId}:${mode}:${language}`;

  // 1. DB cache hit
  const cached = await readCache(clusterId, mode, language);
  if (cached) {
    console.log(`📦 Cache hit [${mode}/${language}]`);
    return isJson ? parseAIResponse(cached) : cached;
  }

  // 2. Dedup concurrent identical requests
  if (pendingRequests.has(dedupKey)) {
    console.log(`⏳ Waiting for in-flight [${mode}/${language}]`);
    const result = await pendingRequests.get(dedupKey);
    if (isJson && typeof result === 'string') return parseAIResponse(result);
    return result;
  }

  // 3. Call AI, cache result
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

// ─── Public generators ─────────────────────────────────────────────────

export function generateExplanation(questionText, shortAnswer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: lang.systemPrompt },
      { role: 'user',   content: lang.prompts.explanation(questionText, shortAnswer) },
    ],
    { questionText, mode: 'explanation', language, isJson: false, maxTokens: 600, temperature: 0.7 }
  );
}

export function generateTestOptions(questionText, correctAnswer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.test(questionText, correctAnswer) },
    ],
    { questionText, mode: 'test', language, isJson: true, maxTokens: 200, temperature: 0.5 }
  );
}

export function generateBuggyCode(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.bug(questionText, topic) },
    ],
    { questionText, mode: 'bug', language, isJson: true, maxTokens: 400, temperature: 0.6 }
  );
}

export function generateBlitzStatement(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.blitz(questionText, topic) },
    ],
    { questionText, mode: 'blitz', language, isJson: true, maxTokens: 150, temperature: 0.7 }
  );
}

export function evaluateInterviewAnswer(question, answer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.interview(question, answer) },
    ],
    { questionText: `${question}|${answer}`, mode: 'interview', language, isJson: true, maxTokens: 300, temperature: 0.5 }
  );
}

export function generateCodeCompletion(questionText, topic, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.code(questionText, topic) },
    ],
    { questionText, mode: 'code', language, isJson: true, maxTokens: 400, temperature: 0.6 }
  );
}

export function analyzeResume(resumeText, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user',   content: lang.prompts.resume(resumeText) },
    ],
    { questionText: resumeText.substring(0, 300), mode: 'resume', language, isJson: true, maxTokens: 600, temperature: 0.3 }
  );
}
