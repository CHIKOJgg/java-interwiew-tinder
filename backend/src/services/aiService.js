import crypto from 'crypto';
import pool from '../config/database.js';
import redis from '../config/redis.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const PROMPT_VERSION = 'v2'; // bump version so old bad-response cache entries are ignored
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '45000');

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set — all AI calls will fail');
}

// ─── Cluster ID ────────────────────────────────────────────────────────
function generateClusterId(text, language = 'Java') {
  const normalized = (language + ':' + text)
    .toLowerCase().replace(/[^\wа-яё\s]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized || 'empty').digest('hex');
}


// ─── JSON truncation repair ────────────────────────────────────────────
// Free-tier models often hit their token limit mid-string.
// This closes open strings / objects so partial JSON is still parseable.
function repairTruncatedJSON(raw) {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  const s = raw.slice(start);

  let depth = 0, inStr = false, esc = false;
  let i = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') {
        depth--;
        if (depth === 0) return s.slice(0, i + 1); // already complete
      }
    }
  }
  if (depth <= 0) return null; // something weird, skip repair

  // Truncated — patch it up
  let repaired = s.trimEnd();
  if (inStr) repaired += '"';           // close open string
  repaired = repaired.replace(/,\s*$/, ''); // remove trailing comma
  while (depth > 0) { repaired += '}'; depth--; }
  return repaired;
}

// ─── JSON parser — 5-stage recovery ───────────────────────────────────
export function parseAIResponse(content) {
  if (!content?.trim()) throw new Error('Empty AI response');
  const text = content.trim();

  try { return JSON.parse(text); } catch { }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { } }

  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch { } }

  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch { } }

  try {
    return JSON.parse(
      text.replace(/[\r\n]+/g, ' ').replace(/,\s*([}\]])/g, '$1')
    );
  } catch { }

  // Stage 6: try to repair truncated JSON (model hit token limit mid-string)
  const repaired = repairTruncatedJSON(text);
  if (repaired) {
    try { return JSON.parse(repaired); } catch { }
    try { return JSON.parse(repaired.replace(/[\r\n]+/g, ' ').replace(/,\s*([}\]])/g, '$1')); } catch { }
  }

  throw new Error('No valid JSON found: ' + text.substring(0, 200));
}

// ─── Validate parsed result has required fields ────────────────────────
const REQUIRED_FIELDS = {
  explanation: ['title', 'theory'],
  test: ['options'],
  bug: ['code', 'bug', 'options'],
  blitz: ['statement', 'isCorrect'],
  code: ['snippet', 'correctPart', 'options'],
  interview: ['score', 'feedback'],
  resume: ['skills', 'experienceLevel'],
};

function validateParsed(mode, parsed) {
  const required = REQUIRED_FIELDS[mode];
  if (!required) return true; // unknown mode — don't validate
  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing required field '${field}' for mode '${mode}'`);
    }
  }
  // Extra: options must be non-empty arrays for modes that use them
  if (['test', 'bug', 'code'].includes(mode) && !Array.isArray(parsed.options)) {
    throw new Error(`'options' must be an array for mode '${mode}'`);
  }
  return true;
}

// ─── Cache — read ─────────────────────────────────────────────────────
async function readCache(clusterId, mode, language) {
  const redisKey = `ai:${mode}:${language}:${clusterId}`;
  
  // 1. Check Redis first
  if (redis) {
    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        console.log(`🚀 Redis Cache hit [${mode}/${language}]`);
        return cached;
      }
    } catch (err) {
      console.warn('Redis cache read error:', err.message);
    }
  }

  // 2. Fallback to PostgreSQL
  try {
    const { rows } = await pool.query(
      `SELECT response FROM ai_cache
       WHERE cluster_id=$1 AND mode=$2 AND prompt_version=$3 AND language=$4
       ORDER BY created_at DESC LIMIT 1`,
      [clusterId, mode, PROMPT_VERSION, language]
    );
    const result = rows.length > 0 ? rows[0].response : null;
    
    // Backfill Redis if found in DB
    if (result && redis) {
      redis.setex(redisKey, 2592000, result).catch(() => {}); // 30 days
    }
    
    return result;
  } catch (err) {
    console.error('Cache read error:', err.message);
    return null;
  }
}

// ─── Cache — write (only valid responses) ─────────────────────────────
async function writeCache(clusterId, mode, language, content, isJson) {
  // CRITICAL: For JSON modes, validate before caching.
  // Bad responses (prose, schema descriptions) must NOT enter the cache.
  if (isJson) {
    try {
      const parsed = parseAIResponse(content);
      validateParsed(mode, parsed);
    } catch (err) {
      console.error(`❌ NOT caching invalid JSON for mode='${mode}': ${err.message}`);
      return; // skip cache write
    }
  }

  try {
    // 1. Write to PostgreSQL (permanent)
    await pool.query(
      `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cluster_id, mode, model, prompt_version, language) DO UPDATE
         SET response=EXCLUDED.response, created_at=CURRENT_TIMESTAMP`,
      [clusterId, mode, MODEL, PROMPT_VERSION, language, content]
    );

    // 2. Write to Redis (fast, 30 days TTL)
    if (redis) {
      const redisKey = `ai:${mode}:${language}:${clusterId}`;
      await redis.setex(redisKey, 2592000, content);
    }
  } catch (err) {
    console.error('Cache write error:', err.message);
  }
}

// ─── Public cache check ────────────────────────────────────────────────
export const checkCache = (questionText, mode, _model, language = 'Java') =>
  readCache(generateClusterId(questionText, language), mode, language);

// ─── In-flight dedup ──────────────────────────────────────────────────
const pendingRequests = new Map();

// ─── OpenRouter HTTP call ─────────────────────────────────────────────
async function callOpenRouter(systemPrompt, userPrompt, maxTokens, temperature) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
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

  const usedModel = data.model || MODEL;
  console.log(`✅ OpenRouter [${usedModel}] → ${content.length} chars`);
  return content.trim();
}

// ─── Core: cache → dedup → AI → validate → write ──────────────────────
async function callAI({ questionText, mode, language = 'Java', isJson, maxTokens, temperature, systemPrompt, userPrompt }) {
  const clusterId = generateClusterId(questionText, language);
  const dedupKey = `${clusterId}:${mode}:${language}`;

  // 1. DB cache hit
  const cached = await readCache(clusterId, mode, language);
  if (cached) {
    console.log(`📦 Cache hit [${mode}/${language}]`);
    if (isJson) {
      try {
        const parsed = parseAIResponse(cached);
        validateParsed(mode, parsed);
        return parsed;
      } catch (err) {
        // Cached response is invalid (old bad entry) — log and re-generate
        console.error(`Cached JSON invalid for [${mode}], regenerating: ${err.message}`);
        // Delete the bad cache entry so it doesn't block future good responses
        const cid = generateClusterId(questionText, language);
        pool.query(
          `DELETE FROM ai_cache WHERE cluster_id=$1 AND mode=$2 AND prompt_version=$3 AND language=$4`,
          [cid, mode, PROMPT_VERSION, language]
        ).catch(() => { });
      }
    } else {
      return cached;
    }
  }

  // 2. Dedup concurrent identical requests
  // Local dedup (same instance)
  if (pendingRequests.has(dedupKey)) {
    console.log(`⏳ Joining in-flight [${mode}/${language}] (local)`);
    return pendingRequests.get(dedupKey);
  }

  // Distributed dedup hint (other instances)
  // We use a short-lived key in Redis to signal that this is being generated
  if (redis) {
    const lockKey = `lock:${dedupKey}`;
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
       console.log(`⏳ Joining in-flight [${mode}/${language}] (distributed wait)`);
       // Poll for result for 3 seconds max, then fall through to generate if still missing
       for (let i = 0; i < 6; i++) {
         await new Promise(r => setTimeout(r, 500));
         const result = await readCache(clusterId, mode, language);
         if (result) return isJson ? parseAIResponse(result) : result;
       }
    }
    // Set lock for 60s
    redis.setex(lockKey, 60, '1').catch(() => {});
  }

  // 3. Call AI, validate, cache
  const promise = (async () => {
    const content = await callOpenRouter(systemPrompt, userPrompt, maxTokens, temperature);
    await writeCache(clusterId, mode, language, content, isJson);
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
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.explanation(questionText, shortAnswer);
  return callAI({ questionText, mode: 'explanation', language, isJson: false, maxTokens: 900, temperature: 0.4, systemPrompt: system, userPrompt: user });
}

export function generateTestOptions(questionText, correctAnswer, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.test(questionText, correctAnswer);
  return callAI({ questionText, mode: 'test', language, isJson: true, maxTokens: 400, temperature: 0.4, systemPrompt: system, userPrompt: user });
}

export function generateBuggyCode(questionText, topic, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.bug(questionText, topic || 'General');
  return callAI({ questionText, mode: 'bug', language, isJson: true, maxTokens: 800, temperature: 0.5, systemPrompt: system, userPrompt: user });
}

export function generateBlitzStatement(questionText, topic, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.blitz(questionText, topic || 'General');
  return callAI({ questionText, mode: 'blitz', language, isJson: true, maxTokens: 150, temperature: 0.6, systemPrompt: system, userPrompt: user });
}

export function evaluateInterviewAnswer(question, answer, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.interview(question, answer);
  return callAI({ questionText: `${question}|${answer}`, mode: 'interview', language, isJson: true, maxTokens: 350, temperature: 0.4, systemPrompt: system, userPrompt: user });
}

export function generateCodeCompletion(questionText, topic, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.code(questionText, topic || 'General');
  return callAI({ questionText, mode: 'code', language, isJson: true, maxTokens: 800, temperature: 0.5, systemPrompt: system, userPrompt: user });
}

export function analyzeResume(resumeText, _userId, language = 'Java') {
  const { prompts } = getLanguage(language);
  const { system, user } = prompts.resume(resumeText);
  return callAI({ questionText: resumeText.substring(0, 300), mode: 'resume', language, isJson: true, maxTokens: 600, temperature: 0.3, systemPrompt: system, userPrompt: user });
}