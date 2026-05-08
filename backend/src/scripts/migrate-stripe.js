import pool from '../config/database.js';

const migrateStripe = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting Stripe migration...');

    await client.query('BEGIN');

    // Add stripe_customer_id to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
    `);
    
    // Add stripe columns to user_subscriptions
    await client.query(`
      ALTER TABLE user_subscriptions 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
    `);

    // Create index for stripe lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
      CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_sub ON user_subscriptions(stripe_subscription_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Stripe migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Stripe migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrateStripe();
