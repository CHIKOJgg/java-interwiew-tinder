import pool from '../config/database.js';

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Running TON migration...');
    await client.query('BEGIN');

    // ── pending_ton_invoices: tracks unconfirmed TON payments ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_ton_invoices (
        invoice_id    VARCHAR(40) PRIMARY KEY,
        user_id       BIGINT      NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        plan_id       VARCHAR(20) NOT NULL REFERENCES subscription_plans(id),
        interval      VARCHAR(10) NOT NULL DEFAULT 'monthly',
        amount_ton    NUMERIC(10, 4) NOT NULL,
        fulfilled     BOOLEAN     NOT NULL DEFAULT false,
        created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at    TIMESTAMP   NOT NULL,
        tx_hash       VARCHAR(64)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ton_invoices_pending
        ON pending_ton_invoices(fulfilled, expires_at)
        WHERE fulfilled = false;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ton_invoices_user
        ON pending_ton_invoices(user_id, fulfilled);
    `);

    // ── user_subscriptions: add TON tracking columns ───────────────────
    await client.query(`
      ALTER TABLE user_subscriptions
        ADD COLUMN IF NOT EXISTS ton_tx_hash   VARCHAR(64),
        ADD COLUMN IF NOT EXISTS ton_invoice_id VARCHAR(40);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_ton_tx
        ON user_subscriptions(ton_tx_hash)
        WHERE ton_tx_hash IS NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ TON migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ TON migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
