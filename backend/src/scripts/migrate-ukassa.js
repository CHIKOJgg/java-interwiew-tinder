import pool from '../config/database.js';

/**
 * Migration: add ukassa_payment_id to user_subscriptions.
 * Idempotent — safe to run multiple times.
 */
const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Running U-Kassa migration...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE user_subscriptions
        ADD COLUMN IF NOT EXISTS ukassa_payment_id VARCHAR(100);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_ukassa_payment
        ON user_subscriptions(ukassa_payment_id)
        WHERE ukassa_payment_id IS NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ U-Kassa migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ U-Kassa migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
