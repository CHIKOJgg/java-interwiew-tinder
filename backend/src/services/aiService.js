import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../config/database.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const PROMPT_VERSION = 'v1';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set — all AI calls will fail');
}

function generateClusterId(text, language = 'Java', mode = '') {
  const raw = `${language}:${mode}:${text}`;
  return crypto.createHash('sha256').update(raw || 'empty').digest('hex');
}

function parseAIResponse(content) {
  if (typeof content !== 'string') {
    throw new Error('AI response is not a string');
  }

  try {
    return JSON.parse(content);
  } catch { }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch { }
  }

  const obj = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (obj) {
    try {
      return JSON.parse(obj[1]);
    } catch { }
  }

  throw new Error('No JSON found in AI response: ' + content.substring(0, 120));
}

function serializeCacheContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

async function readCache(clusterId, mode, model, language, isJson = false) {
  try {
    const { rows } = await pool.query(
      `SELECT response FROM ai_cache
       WHERE cluster_id=$1 AND mode=$2 AND model=$3 AND prompt_version=$4 AND language=$5`,
      [clusterId, mode, model, PROMPT_VERSION, language]
    );

    if (rows.length === 0) return null;

    const response = rows[0].response;
    if (!isJson) return response;

    try {
      return parseAIResponse(response);
    } catch (err) {
      console.error('Cached JSON parse error:', err.message);
      return response;
    }
  } catch (err) {
    console.error('Cache read error:', err.message);
    return null;
  }
}

async function writeCache(clusterId, mode, model, language, content) {
  try {
    const text = serializeCacheContent(content).trim();
    if (!text) {
      console.warn(`Skipping cache write [${mode}] ${language}: empty content`);
      return;
    }

    await pool.query(
      `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cluster_id, mode, model, prompt_version, language)
       DO UPDATE SET response = EXCLUDED.response`,
      [clusterId, mode, model, PROMPT_VERSION, language, text]
    );
  } catch (err) {
    console.error('Cache write error:', err.message);
  }
}

const pendingRequests = new Map();

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

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Empty response from OpenRouter');
  }

  console.log(`✅ OpenRouter (${MODEL}) responded [${content.length} chars]`);
  return content.trim();
}

async function callAI(messages, {
  questionText,
  mode,
  language = 'Java',
  isJson = false,
  maxTokens = 500,
  temperature = 0.7,
}) {
  const clusterId = generateClusterId(questionText, language, mode);
  const dedupKey = `${clusterId}:${mode}:${language}:${MODEL}:${isJson ? 'json' : 'text'}`;

  const cached = await readCache(clusterId, mode, MODEL, language, isJson);
  if (cached !== null && cached !== undefined) {
    console.log(`✅ Cache hit [${mode}] ${language}`);
    return cached;
  }

  if (pendingRequests.has(dedupKey)) {
    return pendingRequests.get(dedupKey);
  }

  const promise = (async () => {
    const content = await callOpenRouter(messages, maxTokens, temperature);
    await writeCache(clusterId, mode, MODEL, language, content);
    return isJson ? parseAIResponse(content) : content;
  })();

  pendingRequests.set(dedupKey, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(dedupKey);
  }
}

export const checkCache = (questionText, mode, _model, language = 'Java', isJson = false) =>
  readCache(generateClusterId(questionText, language, mode), mode, MODEL, language, isJson);

export function generateExplanation(questionText, shortAnswer, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: lang.systemPrompt },
      { role: 'user', content: lang.prompts.explanation(questionText, shortAnswer) },
    ],
    { questionText, mode: 'explanation', language, isJson: false, maxTokens: 300, temperature: 0.7 }
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
    { questionText, mode: 'bug', language, isJson: true, maxTokens: 300, temperature: 0.6 }
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
    { questionText, mode: 'code', language, isJson: true, maxTokens: 300, temperature: 0.3 }
  );
}

export function analyzeResume(resumeText, _userId, language = 'Java') {
  const lang = getLanguage(language);
  return callAI(
    [
      { role: 'system', content: 'Ответь ТОЛЬКО валидным JSON объектом. Никакого текста, никакого Markdown.' },
      { role: 'user', content: lang.prompts.resume(resumeText) },
    ],
    { questionText: resumeText.substring(0, 300), mode: 'resume', language, isJson: true, maxTokens: 400, temperature: 0.3 }
  );
}