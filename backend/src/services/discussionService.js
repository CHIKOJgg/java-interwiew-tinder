import pool from '../config/database.js';
import logger from '../config/logger.js';

export async function getDiscussions(questionId, userId) {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.question_id, d.parent_id, d.content, d.code_snippet,
              d.upvotes, d.is_solution, d.created_at,
              u.username, u.first_name,
              COALESCE(dv.vote, 0) as user_vote,
              (SELECT COUNT(*) FROM question_discussions r WHERE r.parent_id = d.id) as reply_count
       FROM question_discussions d
       LEFT JOIN users u ON u.telegram_id = d.user_id
       LEFT JOIN discussion_votes dv ON dv.discussion_id = d.id AND dv.user_id = $2
       WHERE d.question_id = $1 AND d.parent_id IS NULL AND d.is_hidden = FALSE
       ORDER BY d.is_solution DESC, d.upvotes DESC, d.created_at DESC`,
      [questionId, userId]
    );

    for (const disc of rows) {
      if (disc.reply_count > 0) {
        const { rows: replies } = await pool.query(
          `SELECT d.id, d.parent_id, d.content, d.code_snippet,
                  d.upvotes, d.created_at,
                  u.username, u.first_name,
                  COALESCE(dv.vote, 0) as user_vote
           FROM question_discussions d
           LEFT JOIN users u ON u.telegram_id = d.user_id
           LEFT JOIN discussion_votes dv ON dv.discussion_id = d.id AND dv.user_id = $2
           WHERE d.parent_id = $1 AND d.is_hidden = FALSE
           ORDER BY d.upvotes DESC, d.created_at ASC`,
          [disc.id, userId]
        );
        disc.replies = replies;
      }
    }

    return rows;
  } catch (err) {
    logger.error({ err, questionId, userId }, 'getDiscussions failed');
    throw err;
  }
}

export async function createDiscussion(questionId, userId, content, codeSnippet, parentId) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO question_discussions (question_id, user_id, content, code_snippet, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [questionId, userId, content, codeSnippet || null, parentId || null]
    );
    return rows[0];
  } catch (err) {
    logger.error({ err, questionId, userId }, 'createDiscussion failed');
    throw err;
  }
}

export async function voteDiscussion(discussionId, userId, vote) {
  try {
    const existing = await pool.query(
      'SELECT vote FROM discussion_votes WHERE user_id = $1 AND discussion_id = $2',
      [userId, discussionId]
    );

    if (existing.rows.length > 0) {
      const currentVote = existing.rows[0].vote;
      if (currentVote === vote) {
        await pool.query(
          'DELETE FROM discussion_votes WHERE user_id = $1 AND discussion_id = $2',
          [userId, discussionId]
        );
        await pool.query('UPDATE question_discussions SET upvotes = upvotes - $1 WHERE id = $2', [vote, discussionId]);
        return { vote: 0 };
      }
      await pool.query(
        'UPDATE discussion_votes SET vote = $1 WHERE user_id = $2 AND discussion_id = $3',
        [vote, userId, discussionId]
      );
      await pool.query('UPDATE question_discussions SET upvotes = upvotes + $1 WHERE id = $2', [vote * 2, discussionId]);
      return { vote };
    }

    await pool.query(
      'INSERT INTO discussion_votes (user_id, discussion_id, vote) VALUES ($1, $2, $3)',
      [userId, discussionId, vote]
    );
    await pool.query('UPDATE question_discussions SET upvotes = upvotes + $1 WHERE id = $2', [vote, discussionId]);
    return { vote };
  } catch (err) {
    logger.error({ err, discussionId, userId, vote }, 'voteDiscussion failed');
    throw err;
  }
}

export async function markSolution(discussionId, questionId, userId) {
  try {
    await pool.query(
      `UPDATE question_discussions SET is_solution = (id = $1)
       WHERE question_id = $2 AND id IN (
         SELECT id FROM question_discussions WHERE question_id = $2 AND user_id = $3
       )`,
      [discussionId, questionId, userId]
    );
  } catch (err) {
    logger.error({ err, discussionId, questionId, userId }, 'markSolution failed');
    throw err;
  }
}
