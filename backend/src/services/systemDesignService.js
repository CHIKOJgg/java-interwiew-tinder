import pool from '../config/database.js';
import { callOpenRouter } from './aiService.js';
import logger from '../config/logger.js';

const SD_EVALUATION_PROMPT = (topic, answer) => ({
  system: `You are a senior system design interviewer at FAANG.
Evaluate the candidate's answer in Russian.
Criteria:
1) Functional requirements coverage
2) Non-functional requirements coverage  
3) Components mentioned vs expected
4) Trade-offs discussed (pros/cons of choices)
5) Scalability reasoning (QPS, storage numbers)
6) Data model design

Respond with ONLY valid JSON (no markdown, no prose):
{
  "score": "number 0-100",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingComponents": ["string"],
  "suggestedArchitecture": "string — brief ideal approach",
  "followUpQuestion": "string — next question to ask"
}`,
  user: `Topic: ${topic.title}
Requirements: ${topic.requirements?.join(', ')}
Constraints: ${topic.constraints?.join(', ')}
Expected components: ${topic.expected_components?.join(', ')}

Candidate's answer: ${answer}

Evaluate this system design answer. Return only the JSON.`,
});

export async function getTopics(userId, language = 'Java', difficulty) {
  const where = ['is_active = TRUE', 'language = $1'];
  const params = [language];
  let p = 2;
  if (difficulty) { where.push(`difficulty = $${p}`); params.push(difficulty); p++; }

  const { rows } = await pool.query(
    `SELECT id, topic, title, description, difficulty, estimated_readiness_hours
     FROM system_design_topics
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE difficulty WHEN 'junior' THEN 0 WHEN 'middle' THEN 1 ELSE 2 END,
       id ASC`,
    params
  );

  let progressMap = {};
  if (userId) {
    const { rows: prog } = await pool.query(
      'SELECT topic_id, status, score FROM system_design_progress WHERE user_id = $1',
      [userId]
    );
    for (const p of prog) progressMap[p.topic_id] = { status: p.status, score: p.score };
  }

  return rows.map(r => ({
    ...r,
    progress: progressMap[r.id] || { status: 'not_started', score: null },
  }));
}

export async function getTopicDetail(topicId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM system_design_topics WHERE id = $1 AND is_active = TRUE`,
    [topicId]
  );
  if (rows.length === 0) return null;
  const topic = rows[0];

  let progress = null;
  if (userId) {
    const { rows: p } = await pool.query(
      'SELECT * FROM system_design_progress WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );
    if (p.length > 0) progress = p[0];
  }

  return { topic, progress };
}

export async function evaluateAnswer(topicId, answer, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM system_design_topics WHERE id = $1 AND is_active = TRUE',
    [topicId]
  );
  if (rows.length === 0) throw new Error('Topic not found');
  const topic = rows[0];

  const prompt = SD_EVALUATION_PROMPT(topic, answer);

  let result;
  try {
    const content = await callOpenRouter(prompt.system, prompt.user, 2048, 0.3);
    result = JSON.parse(content);
  } catch (err) {
    logger.error({ err, topicId }, 'System design AI evaluation failed');
    throw new Error('AI evaluation failed. Please try again.');
  }

  const evaluation = {
    score: Math.min(100, Math.max(0, parseInt(result.score) || 0)),
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    missingComponents: Array.isArray(result.missingComponents) ? result.missingComponents : [],
    suggestedArchitecture: result.suggestedArchitecture || '',
    followUpQuestion: result.followUpQuestion || '',
  };

  if (userId) {
    const existing = await pool.query(
      'SELECT id, attempt_count FROM system_design_progress WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );

    const componentsMentioned = topic.expected_components
      ? topic.expected_components.filter(c =>
          answer.toLowerCase().includes(c.toLowerCase())
        )
      : [];

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE system_design_progress SET
           status = 'completed',
           score = $3,
           strengths = $4,
           weaknesses = $5,
           components_mentioned = $6,
           attempt_count = attempt_count + 1,
           last_attempt_at = NOW()
         WHERE user_id = $1 AND topic_id = $2`,
        [userId, topicId, evaluation.score, evaluation.strengths, evaluation.weaknesses, componentsMentioned]
      );
    } else {
      await pool.query(
        `INSERT INTO system_design_progress
           (user_id, topic_id, status, score, strengths, weaknesses, components_mentioned, attempt_count, last_attempt_at)
         VALUES ($1, $2, 'completed', $3, $4, $5, $6, 1, NOW())`,
        [userId, topicId, evaluation.score, evaluation.strengths, evaluation.weaknesses, componentsMentioned]
      );
    }
  }

  return evaluation;
}

export async function getUserProgress(userId) {
  const { rows } = await pool.query(
    `SELECT sd.id, sd.topic, sd.title, sd.difficulty,
            sdp.status, sdp.score, sdp.attempt_count, sdp.last_attempt_at
     FROM system_design_topics sd
     LEFT JOIN system_design_progress sdp ON sdp.topic_id = sd.id AND sdp.user_id = $1
     WHERE sd.is_active = TRUE
     ORDER BY sd.id`,
    [userId]
  );

  const attempted = rows.filter(r => r.status === 'completed');
  const avgScore = attempted.length > 0
    ? Math.round(attempted.reduce((s, r) => s + (r.score || 0), 0) / attempted.length)
    : 0;

  return { topics: rows, overallReadiness: avgScore };
}