import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { promisify } from 'node:util';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const lookup = promisify(dns.lookup);

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

let poolConfig;
if (dbUrl) {
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = parseInt(url.port, 10) || 5432;
  const user = url.username;
  const password = url.password;
  const database = url.pathname.slice(1);
  const resolvedHost = await lookup(host, { family: 4 });
  poolConfig = {
    host: resolvedHost.address,
    port,
    user,
    password,
    database,
    ssl: process.env.NODE_ENV !== 'development' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
} else {
  poolConfig = {
    ssl: process.env.NODE_ENV !== 'development' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

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
