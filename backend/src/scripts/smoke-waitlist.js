#!/usr/bin/env node
// Post-deploy smoke test for the waitlist + RB data-localization routing.
// Usage: BACKEND_URL=https://java-interwiew-tinder.fly.dev node src/scripts/smoke-waitlist.js
// Requires Node 18+ (global fetch). Safe to re-run — uses unique emails.
//
// What it proves:
//   1. The backend is up (/health).
//   2. An RB-resident submission (timezone=Europe/Minsk) is either accepted
//      (RB_DATABASE_URL configured → compliant) or cleanly blocked with 451
//      (no RB store yet → the compliant gate, not a bug).
//   3. A non-RB submission is always accepted into the main DB.

const BASE = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const TS = Date.now();

function log(ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${msg}`);
}

async function checkHealth() {
  try {
    const r = await fetch(`${BASE}/health`);
    log(r.ok, `GET /health -> ${r.status}`);
    return r.ok;
  } catch (e) {
    log(false, `GET /health -> ERROR ${e.message}`);
    return false;
  }
}

async function postWaitlist(label, region, timezone) {
  const email = `smoke-${TS}-${label}@example.com`;
  try {
    const r = await fetch(`${BASE}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        lang: 'ru',
        source: 'smoke-test',
        consent: true,
        region,
        timezone,
      }),
    });
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

async function main() {
  console.log(`\n🚦 Waitlist smoke test → ${BASE}\n`);

  const healthOk = await checkHealth();
  if (!healthOk) {
    console.log('\nBackend unreachable — check BACKEND_URL and that it is deployed.');
    process.exit(1);
  }

  console.log('\n— RB-resident submission (timezone=Europe/Minsk) —');
  const rb = await postWaitlist('rb', 'BY', 'Europe/Minsk');
  if (rb.status === 200) {
    log(true, `RB submission accepted (${rb.status}) → stored in RB-localized DB (or ALLOW_RB_PII set).`);
  } else if (rb.status === 451) {
    log(
      false,
      `RB submission BLOCKED (451) → RB_DATABASE_URL not configured yet. This is the compliant gate, not a bug.`
    );
  } else {
    log(false, `RB submission unexpected ${rb.status}: ${JSON.stringify(rb.body)}`);
  }

  console.log('\n— Non-RB submission (timezone=America/New_York) —');
  const nonRb = await postWaitlist('nonrb', 'US', 'America/New_York');
  if (nonRb.status === 200) {
    log(true, `Non-RB submission accepted (${nonRb.status}) → stored in main DB.`);
  } else {
    log(false, `Non-RB submission unexpected ${nonRb.status}: ${JSON.stringify(nonRb.body)}`);
  }

  console.log(
    '\nDone. If RB shows 451, set RB_DATABASE_URL, run `npm run setup-db`, then re-run this test.'
  );
}

main();
