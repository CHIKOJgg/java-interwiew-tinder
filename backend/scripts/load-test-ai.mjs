#!/usr/bin/env node

/**
 * AI Pipeline & API Load Benchmark Tool
 *
 * Runs concurrent load tests against local or production deployment,
 * collecting latency percentiles (min, p50, p90, p95, p99, max),
 * throughput (RPS), status code breakdown, and error rates.
 *
 * Usage:
 *   node scripts/load-test-ai.mjs
 *   node scripts/load-test-ai.mjs --target https://java-interwiew-tinder-production.up.railway.app --concurrency 20 --requests 100
 */

import { performance } from 'perf_hooks';

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}

const TARGET_BASE = (getArg('target', process.env.TARGET_URL || 'https://java-interwiew-tinder-production.up.railway.app')).replace(/\/$/, '');
const CONCURRENCY = parseInt(getArg('concurrency', '15'), 10);
const TOTAL_REQUESTS = parseInt(getArg('requests', '60'), 10);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🚀 Starting AI Pipeline & API Concurrency Load Test');
console.log(`🌐 Target:      ${TARGET_BASE}`);
console.log(`⚡ Concurrency: ${CONCURRENCY} parallel workers`);
console.log(`📦 Requests:    ${TOTAL_REQUESTS} total requests per suite`);
console.log('═══════════════════════════════════════════════════════════════════\n');

function computeStats(latencies) {
  if (!latencies.length) return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const p = (pct) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    mean: Math.round(sum / sorted.length),
    p50: Math.round(p(50)),
    p90: Math.round(p(90)),
    p95: Math.round(p(95)),
    p99: Math.round(p(99)),
  };
}

async function runBenchmark(suiteName, makeRequest) {
  console.log(`▶ Running Suite: ${suiteName}...`);
  const statusCodes = {};
  const latencies = [];
  let errorCount = 0;

  let requestIndex = 0;
  const suiteStart = performance.now();

  async function worker() {
    while (true) {
      const idx = requestIndex++;
      if (idx >= TOTAL_REQUESTS) break;

      const t0 = performance.now();
      try {
        const status = await makeRequest(idx);
        const t1 = performance.now();
        const duration = t1 - t0;
        latencies.push(duration);
        statusCodes[status] = (statusCodes[status] || 0) + 1;
      } catch (err) {
        errorCount++;
        statusCodes['ERR'] = (statusCodes['ERR'] || 0) + 1;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const suiteDuration = (performance.now() - suiteStart) / 1000;
  const stats = computeStats(latencies);
  const rps = (latencies.length / suiteDuration).toFixed(1);

  console.log(`  ✓ Completed ${latencies.length} requests in ${suiteDuration.toFixed(2)}s (${rps} req/sec)`);
  console.log(`  📊 Status codes: ${JSON.stringify(statusCodes)}`);
  console.log(`  ⏱️  Latency (ms): min=${stats.min} | p50=${stats.p50} | p90=${stats.p90} | p95=${stats.p95} | p99=${stats.p99} | max=${stats.max}`);
  if (errorCount > 0) {
    console.log(`  ⚠️  Errors: ${errorCount}`);
  }
  console.log('');
  return { suiteName, stats, rps, statusCodes, errorCount };
}

async function main() {
  const results = [];

  // Suite 1: Live Question Bank Feed Burst (Java)
  results.push(await runBenchmark('1. Question Bank Feed Burst (Java)', async () => {
    const res = await fetch(`${TARGET_BASE}/api/demo/questions?language=Java&limit=5&seed=bench_${Math.random().toString(36).slice(2)}&lng=ru`);
    return res.status;
  }));

  // Suite 2: Live Question Bank Feed Burst (Python)
  results.push(await runBenchmark('2. Question Bank Feed Burst (Python)', async () => {
    const res = await fetch(`${TARGET_BASE}/api/demo/questions?language=Python&limit=5&seed=bench_${Math.random().toString(36).slice(2)}&lng=ru`);
    return res.status;
  }));

  // Suite 3: Topic Filters & Mastery Taxonomy Burst
  results.push(await runBenchmark('3. Filter Taxonomy & Topic Discovery Burst', async () => {
    const lang = Math.random() > 0.5 ? 'Java' : 'Python';
    const res = await fetch(`${TARGET_BASE}/api/filters?language=${lang}`);
    return res.status;
  }));

  // Suite 4: Health & Diagnostics
  results.push(await runBenchmark('4. Health & Redis/DB Status Checks', async () => {
    const res = await fetch(`${TARGET_BASE}/health`);
    return res.status;
  }));

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🎯 Benchmark Summary Report');
  console.log('═══════════════════════════════════════════════════════════════════');
  results.forEach(r => {
    console.log(`${r.suiteName}:`);
    console.log(`  - RPS: ${r.rps} req/sec`);
    console.log(`  - p50: ${r.stats.p50}ms | p95: ${r.stats.p95}ms | p99: ${r.stats.p99}ms`);
    console.log(`  - Status: ${JSON.stringify(r.statusCodes)}`);
  });
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal load test runner error:', err);
  process.exit(1);
});
