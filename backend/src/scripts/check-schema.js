import pool from '../config/database.js';

async function check() {
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns in users:', rows.map(r => r.column_name));
    
    const { rows: planRows } = await pool.query("SELECT * FROM subscription_plans");
    console.log('Plans:', planRows.length);
    
    const { rows: questions } = await pool.query("SELECT language, count(*) FROM questions GROUP BY language");
    console.log('Questions:', questions);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
