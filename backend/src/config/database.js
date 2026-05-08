import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

export default pool;