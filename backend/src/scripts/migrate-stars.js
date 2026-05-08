import pool from '../config/database.js';

/**
 * Migration: add stars_charge_id to user_subscriptions
 * and remove Stripe-specific columns.
 * Idempotent — safe to run multiple times.
 */
const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Stars migration...');
    await client.query('BEGIN');

    // Add Stars charge ID column (unique — prevents duplicate activations)
    await client.query(`
      ALTER TABLE user_subscriptions
        ADD COLUMN IF NOT EXISTS stars_charge_id VARCHAR(100);
    `);

    // Add payment_provider if it somehow doesn't exist yet
    await client.query(`
      ALTER TABLE user_subscriptions
        ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
    `);

    // Unique index on stars_charge_id so ON CONFLICT works
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_stars_charge
        ON user_subscriptions(stars_charge_id)
        WHERE stars_charge_id IS NOT NULL;
    `);

    // Drop leftover Stripe columns (idempotent — IF EXISTS)
    await client.query(`
      ALTER TABLE user_subscriptions
        DROP COLUMN IF EXISTS stripe_subscription_id,
        DROP COLUMN IF EXISTS stripe_customer_id;
      ALTER TABLE users
        DROP COLUMN IF EXISTS stripe_customer_id;
    `);

    await client.query('COMMIT');
    console.log('✅ Stars migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Stars migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
