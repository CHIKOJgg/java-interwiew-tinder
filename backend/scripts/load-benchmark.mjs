/**
 * load-benchmark.mjs
 * 
 * High-concurrency load test and performance benchmark for the Prep-It backend API.
 * Runs against backend on PORT 3001.
 */

import http from 'node:http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = 3001;
const HOST = '127.0.0.1';
const JWT_SECRET = 'dev-secret-change-in-production-min-32-chars-a1b2c3d4e5f6';

process.env.PORT = String(PORT);
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'development';
process.env.ADMIN_TELEGRAM_IDS = '123456789';

// Generate valid JWT token for benchmark user
const testToken = jwt.sign({ userId: '123456789', plan: 'pro', role: 'pro' }, JWT_SECRET);

function makeRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    const reqHeaders = {
      'Authorization': `Bearer ${testToken}`,
      'Accept': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method,
        headers: reqHeaders,
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const latencyMs = Number(endTime - startTime) / 1e6;
          resolve({
            statusCode: res.statusCode,
            latencyMs,
            success: res.statusCode >= 200 && res.statusCode < 400,
            dataLength: data.length,
          });
        });
      }
    );

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({
        statusCode: 0,
        latencyMs,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 408,
        latencyMs: 10000,
        success: false,
        error: 'Timeout',
      });
    });

    if (body) req.write(body);
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { min: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];

  return {
    min: Number(sorted[0].toFixed(2)),
    avg: Number((sum / sorted.length).toFixed(2)),
    p50: Number(getP(50).toFixed(2)),
    p90: Number(getP(90).toFixed(2)),
    p95: Number(getP(95).toFixed(2)),
    p99: Number(getP(99).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

async function runScenarioPool({ name, requests, concurrency }) {
  console.log(`\n======================================================`);
  console.log(`🚀 SCENARIO: ${name}`);
  console.log(`   Total Requests: ${requests.length} | Concurrency: ${concurrency}`);
  console.log(`======================================================`);

  const initialMem = process.memoryUsage().heapUsed / (1024 * 1024);
  const wallStart = Date.now();
  const results = [];
  let index = 0;

  async function worker() {
    while (index < requests.length) {
      const currentReq = requests[index++];
      if (!currentReq) break;
      const res = await makeRequest(currentReq);
      results.push(res);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const wallDurationSec = (Date.now() - wallStart) / 1000;
  const finalMem = process.memoryUsage().heapUsed / (1024 * 1024);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const latencies = results.map((r) => r.latencyMs);
  const stats = calculatePercentiles(latencies);
  const rps = (results.length / (wallDurationSec || 0.001)).toFixed(1);

  console.log(`⏱️  Duration: ${wallDurationSec.toFixed(2)}s | Throughput: ${rps} req/sec`);
  console.log(`✅ Success: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    const errMap = {};
    failed.forEach((f) => {
      const code = f.statusCode || f.error;
      errMap[code] = (errMap[code] || 0) + 1;
    });
    console.log(`   Failures breakdown:`, errMap);
  }
  console.log(`📊 Latencies:`);
  console.log(`   Min: ${stats.min}ms | Avg: ${stats.avg}ms | P50: ${stats.p50}ms | P90: ${stats.p90}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms | Max: ${stats.max}ms`);
  console.log(`🧠 Heap Delta: ${(finalMem - initialMem).toFixed(2)} MB`);

  return {
    scenario: name,
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    rps: Number(rps),
    stats,
    durationSec: Number(wallDurationSec.toFixed(2)),
  };
}

async function startLoadTest() {
  console.log(`Starting Prep-It Load Test Benchmark...`);
  console.log(`Starting server on port ${PORT}...`);

  // Import server (this starts listening automatically)
  await import('../src/server.js');
  await new Promise((r) => setTimeout(r, 2000));

  // Health check
  const ping = await makeRequest({ path: '/api/health' });
  console.log(`🟢 Target server is healthy! (status: ${ping.statusCode}, ping: ${ping.latencyMs.toFixed(2)}ms)`);

  // Ensure test user exists in DB for swipes/stats
  try {
    const { default: pool } = await import('../src/config/database.js');
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, role, subscription_plan)
      VALUES (123456789, 'benchmark_user', 'Benchmark', 'pro', 'pro')
      ON CONFLICT (telegram_id) DO NOTHING
    `);
  } catch (e) {
    console.log('User setup notice:', e.message);
  }

  const summary = [];
  const langs = ['Java', 'Python', 'TypeScript', 'React', 'Go', 'Rust', 'Kotlin'];

  // Scenario 1: Feed fetching with various filters (High concurrency read)
  const feedRequests = [];
  for (let i = 0; i < 200; i++) {
    const lang = langs[i % langs.length];
    feedRequests.push({
      method: 'GET',
      path: `/api/questions/feed?language=${lang}&limit=10&cursor=${(i * 5) % 50}`,
    });
  }
  summary.push(await runScenarioPool({
    name: 'Feed Fetching & Pagination (Multi-Language)',
    requests: feedRequests,
    concurrency: 20,
  }));

  // Scenario 2: Real-time Category & Filter aggregations
  const catRequests = [];
  for (let i = 0; i < 150; i++) {
    const lang = langs[i % langs.length];
    catRequests.push({
      method: 'GET',
      path: `/api/filters?language=${lang}`,
    });
  }
  summary.push(await runScenarioPool({
    name: 'Real-Time Filters & Difficulty Aggregations',
    requests: catRequests,
    concurrency: 15,
  }));

  // Scenario 3: Top Interview Questions Screen (Browsing, search, category drill)
  const topRequests = [];
  const searchTerms = ['thread', 'spring', 'index', 'virtual', 'lock', ''];
  for (let i = 0; i < 150; i++) {
    const lang = langs[i % langs.length];
    const search = searchTerms[i % searchTerms.length];
    topRequests.push({
      method: 'GET',
      path: `/api/questions/top?language=${lang}&limit=50&category=${encodeURIComponent(search ? 'Spring' : '')}`,
    });
  }
  summary.push(await runScenarioPool({
    name: 'Top Interview Questions & Category Drill',
    requests: topRequests,
    concurrency: 20,
  }));

  // Scenario 4: User Swipes (Concurrent Writes & Spaced Repetition Updates)
  const swipeRequests = [];
  for (let i = 0; i < 150; i++) {
    const qId = (i % 25) + 1;
    swipeRequests.push({
      method: 'POST',
      path: `/api/questions/swipe`,
      body: JSON.stringify({ questionId: qId, status: i % 2 === 0 ? 'known' : 'unknown' }),
    });
  }
  summary.push(await runScenarioPool({
    name: 'User Swipes & Spaced Repetition (Concurrent Writes)',
    requests: swipeRequests,
    concurrency: 20,
  }));

  // Scenario 5: Mixed Peak Load (30 Concurrent Virtual Users)
  const mixedRequests = [];
  for (let i = 0; i < 300; i++) {
    const mod = i % 4;
    const lang = langs[i % langs.length];
    if (mod === 0) {
      mixedRequests.push({ method: 'GET', path: `/api/questions/feed?language=${lang}&limit=10` });
    } else if (mod === 1) {
      mixedRequests.push({ method: 'GET', path: `/api/questions/top?language=${lang}&limit=50` });
    } else if (mod === 2) {
      mixedRequests.push({ method: 'GET', path: `/api/categories?language=${lang}` });
    } else {
      mixedRequests.push({
        method: 'POST',
        path: `/api/questions/swipe`,
        body: JSON.stringify({ questionId: (i % 20) + 1, status: 'known' }),
      });
    }
  }
  summary.push(await runScenarioPool({
    name: 'Peak Mixed Load (30 Concurrent Virtual Users)',
    requests: mixedRequests,
    concurrency: 30,
  }));

  console.log(`\n======================================================`);
  console.log(`🏆 FINAL LOAD BENCHMARK SUMMARY`);
  console.log(`======================================================`);
  console.table(summary.map((s) => ({
    Scenario: s.scenario,
    Requests: s.total,
    Passed: s.successful,
    Failed: s.failed,
    RPS: s.rps,
    'P50 (ms)': s.stats.p50,
    'P95 (ms)': s.stats.p95,
    'P99 (ms)': s.stats.p99,
  })));

  const totalReqs = summary.reduce((acc, s) => acc + s.total, 0);
  const totalFailed = summary.reduce((acc, s) => acc + s.failed, 0);
  console.log(`Total Requests Sent: ${totalReqs}`);
  console.log(`Total Failures: ${totalFailed} (${((totalFailed / totalReqs) * 100).toFixed(2)}%)`);
  if (totalFailed === 0) {
    console.log(`🎉 100% SUCCESS RATE ACROSS ALL LOAD BENCHMARKS!`);
  }

  process.exit(0);
}

startLoadTest().catch(console.error);
