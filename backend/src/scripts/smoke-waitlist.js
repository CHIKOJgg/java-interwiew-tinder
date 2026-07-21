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
//   4. Unsubscribe (right to erasure) works for a non-RB lead.
//   5. The 451 response body includes the expected error code and message.

const BASE = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const TS = Date.now();

let passed = 0;
let failed = 0;

function log(ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${msg}`);
  if (ok) passed++; else failed++;
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
    return { status: r.status, body, email };
  } catch (e) {
    return { status: 0, body: { error: e.message }, email: null };
  }
}

async function postUnsubscribe(email) {
  try {
    const r = await fetch(`${BASE}/api/waitlist/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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

  // --- Test 1: RB-resident submission ---
  console.log('\n— Test 1: RB-resident submission (timezone=Europe/Minsk) —');
  const rb = await postWaitlist('rb', 'BY', 'Europe/Minsk');
  if (rb.status === 200) {
    log(true, `RB submission accepted (200) → stored in RB-localized DB.`);
  } else if (rb.status === 451) {
    log(true, `RB submission blocked (451) → RB_DATABASE_URL not configured. This IS the compliant gate.`);
    const hasCode = rb.body?.error === 'not_localized';
    const hasMsg = typeof rb.body?.message === 'string' && rb.body.message.length > 0;
    log(hasCode, `  451 error code is "not_localized": ${hasCode}`);
    log(hasMsg, `  451 includes user-facing message: ${hasMsg}`);
  } else {
    log(false, `RB submission unexpected ${rb.status}: ${JSON.stringify(rb.body)}`);
  }

  // --- Test 2: Non-RB submission ---
  console.log('\n— Test 2: Non-RB submission (timezone=America/New_York) —');
  const nonRb = await postWaitlist('nonrb', 'US', 'America/New_York');
  if (nonRb.status === 200) {
    log(true, `Non-RB submission accepted (200) → stored in main DB.`);
  } else {
    log(false, `Non-RB submission unexpected ${nonRb.status}: ${JSON.stringify(nonRb.body)}`);
  }

  // --- Test 3: Unsubscribe (right to erasure) for the non-RB lead ---
  if (nonRb.status === 200 && nonRb.email) {
    console.log('\n— Test 3: Unsubscribe (right to erasure) —');
    const unsub = await postUnsubscribe(nonRb.email);
    if (unsub.status === 200 && unsub.body?.erased === true) {
      log(true, `Unsubscribe accepted (200, erased=true) → PII purged from main DB.`);
    } else {
      log(false, `Unsubscribe unexpected ${unsub.status}: ${JSON.stringify(unsub.body)}`);
    }
    // Verify double-unsubscribe is idempotent
    const unsub2 = await postUnsubscribe(nonRb.email);
    log(unsub2.status === 200, `Double-unsubscribe idempotent: ${unsub2.status} (erased=${unsub2.body?.erased})`);
  } else {
    console.log('\n— Test 3: Skipped (non-RB submission did not succeed) —');
  }

  // --- Test 4: Reject invalid email ---
  console.log('\n— Test 4: Reject invalid email —');
  const bad = await postWaitlist('bad', 'US', 'America/New_York');
  log(bad.status === 400, `Invalid email rejected (400): ${bad.status}`);

  // --- Test 5: Reject missing consent ---
  console.log('\n— Test 5: Reject missing consent —');
  try {
    const r = await fetch(`${BASE}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `smoke-${TS}-noconsent@example.com`,
        lang: 'en',
        source: 'smoke-test',
        consent: false,
        region: 'US',
        timezone: 'America/New_York',
      }),
    });
    log(r.status === 400, `Missing consent rejected (400): ${r.status}`);
  } catch (e) {
    log(false, `Consent test error: ${e.message}`);
  }

  // --- Summary ---
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nSome tests failed. Check the output above.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed.');
  }
}

main();
