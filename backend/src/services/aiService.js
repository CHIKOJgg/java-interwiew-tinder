import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../config/database.js';
import { getLanguage } from './languageRegistry.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FAST_MODEL = "openrouter/free";
const QUALITY_MODEL = "openrouter/free";
const PROMPT_VERSION = "v1";

// ─── Helpers ─────────────────────────────────────────────────────────

function generateClusterId(text, language = 'Java') {
  const normalized = (language + ':' + text).toLowerCase().replace(/[^\w\sа-яё]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized || 'empty').digest('hex');
}

const parseAIResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch (e) {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/) ||
        content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      throw new Error('No JSON found in response');
    } catch (innerError) {
      console.error('Failed to parse AI response:', content?.substring(0, 200));
      throw innerError;
    }
  }
};

// ─── Dedup & Cache ───────────────────────────────────────────────────

const pendingRequests = new Map();

export const checkCache = async (questionText, mode, model, language = 'Java') => {
  try {
    const clusterId = generateClusterId(questionText, language);
    const { rows } = await pool.query(
      'SELECT response FROM ai_cache WHERE cluster_id = $1 AND mode = $2 AND model = $3 AND prompt_version = $4 AND language = $5',
      [clusterId, mode, model, PROMPT_VERSION, language]
    );
    return rows.length > 0 ? rows[0].response : null;
  } catch (err) {
    console.error('DB Cache read error:', err.message);
    return null;
  }
};

// ─── Core AI Call ────────────────────────────────────────────────────

async function callAI(options, context, isJson = false) {
  const { questionText, mode, model: targetModel, fallbackTemplate, language = 'Java' } = context;

  options.model = targetModel;

  const clusterId = generateClusterId(questionText, language);
  const cacheKey = `${clusterId}:${mode}:${targetModel}:${PROMPT_VERSION}:${language}`;

  // 1. Check DB Cache
  try {
    const { rows } = await pool.query(
      'SELECT response FROM ai_cache WHERE cluster_id = $1 AND mode = $2 AND model = $3 AND prompt_version = $4 AND language = $5',
      [clusterId, mode, targetModel, PROMPT_VERSION, language]
    );
    if (rows.length > 0) {
      return isJson ? parseAIResponse(rows[0].response) : rows[0].response;
    }
  } catch (err) {
    console.error('DB Cache read error (ignoring):', err.message);
  }

  // 2. Prevent duplicate generation
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const aiPromise = (async () => {
    if (!OPENROUTER_API_KEY) {
      console.warn('⚠️ OpenRouter API key not set, returning fallback');
      return fallbackTemplate;
    }

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/java-interview-tinder',
            'X-Title': 'Java Interview Tinder',
            'X-Prompt-Version': PROMPT_VERSION
          },
          body: JSON.stringify(options),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content');

        const finalResult = content.trim();

        // 3. Store in DB Cache
        try {
          await pool.query(
            `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (cluster_id, mode, model, prompt_version, language) DO NOTHING`,
            [clusterId, mode, targetModel, PROMPT_VERSION, language, finalResult]
          );
        } catch (dbErr) {
          console.error('DB Cache write error:', dbErr.message);
        }

        return isJson ? parseAIResponse(finalResult) : finalResult;
      } catch (error) {
        clearTimeout(timeoutId);
        attempt++;
        console.error(`AI call failed (attempt ${attempt}):`, error.message);
        if (attempt >= maxAttempts) return fallbackTemplate;
      }
    }
  })();

  pendingRequests.set(cacheKey, aiPromise);
  try {
    return await aiPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export const generateExplanation = async (questionText, shortAnswer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.explanation(questionText, shortAnswer);
  return callAI(
    {
      messages: [
        { role: 'system', content: lang.systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    },
    { questionText, mode: 'explanation', model: QUALITY_MODEL, fallbackTemplate: "Explanation is temporarily unavailable.", language },
    false
  );
};

export const generateTestOptions = async (questionText, correctAnswer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.test(questionText, correctAnswer);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY a JSON array of strings.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.5
    },
    { questionText, mode: 'test', model: FAST_MODEL, fallbackTemplate: ['Вариант 1', 'Вариант 2', 'Вариант 3'], language },
    true
  );
};

export const generateBuggyCode = async (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.bug(questionText, topic);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.6
    },
    { questionText, mode: 'bug', model: FAST_MODEL, fallbackTemplate: { code: '// Сервис временно недоступен', bug: 'Ошибка', options: ['Ошибка', 'Ошибка 2', 'Ошибка 3', 'Ошибка 4'] }, language },
    true
  );
};

export const generateBlitzStatement = async (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.blitz(questionText, topic);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.7
    },
    { questionText, mode: 'blitz', model: FAST_MODEL, fallbackTemplate: { statement: 'Сервис временно недоступен.', isCorrect: false }, language },
    true
  );
};

export const evaluateInterviewAnswer = async (question, answer, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.interview(question, answer);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.5
    },
    { questionText: `${question}|${answer}`, mode: 'interview', model: QUALITY_MODEL, fallbackTemplate: { score: 5, feedback: 'Оценка временно недоступна.', correctVersion: 'N/A' }, language },
    true
  );
};

export const generateCodeCompletion = async (questionText, topic, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.code(questionText, topic);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.6
    },
    { questionText, mode: 'code', model: FAST_MODEL, fallbackTemplate: { snippet: '// Сервис временно недоступен', correctPart: 'N/A', options: ['N/A', 'N/A', 'N/A', 'N/A'] }, language },
    true
  );
};

export const analyzeResume = async (resumeText, userId = null, language = 'Java') => {
  const lang = getLanguage(language);
  const prompt = lang.prompts.resume(resumeText);
  return callAI(
    {
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 350,
      temperature: 0.3
    },
    { questionText: resumeText, mode: 'resume', model: QUALITY_MODEL, fallbackTemplate: { skills: [], experienceLevel: 'Unknown', strengths: [], improvementAreas: [], suggestedQuestions: [] }, language },
    true
  );
};
