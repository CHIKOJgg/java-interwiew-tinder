import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    const url = new URL(dbUrl);
    if (url.searchParams.has('sslmode')) {
      url.searchParams.delete('sslmode');
      dbUrl = url.toString();
    }
  } catch {
    dbUrl = dbUrl.replace(/[?&]sslmode=[^&]+/g, '');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV !== 'development' ? { rejectUnauthorized: false } : false,
  // Keep pool small — Supabase session pooler (port 6543) caps at 15 connections total
  // With backend (max:5) + worker (max:3) = 8 connections max, well under the limit
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

import logger from './logger.js';

// Test connection
pool.on('connect', () => {
  logger.info('✅ Database connected successfully');
});

pool.on('error', (err) => {
  logger.error({ err }, '❌ Unexpected database error');
});

// ─── Optional RB-localized datastore ───────────────────────────────────────
// Under Закон РБ «Об информации…», personal data of RB citizens must be stored
// on servers located in the Republic of Belarus. When RB_DATABASE_URL is set,
// RB-resident waitlist PII is written here instead of the main (EU) database,
// making the capture compliant without gating anyone out.
function buildRbPool() {
  const rbUrl = process.env.RB_DATABASE_URL;
  if (!rbUrl) return null;
  let clean = rbUrl;
  try {
    const url = new URL(clean);
    if (url.searchParams.has('sslmode')) {
      url.searchParams.delete('sslmode');
      clean = url.toString();
    }
  } catch {
    clean = clean.replace(/[?&]sslmode=[^&]+/g, '');
  }
  const p = new Pool({
    connectionString: clean,
    ssl: process.env.NODE_ENV !== 'development' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
  p.on('connect', () => logger.info('✅ RB-localized database connected'));
  p.on('error', (err) => logger.error({ err }, '❌ RB-localized database error'));
  return p;
}

const rbPool = buildRbPool();

export default pool;
export { rbPool };
