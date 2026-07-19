# Launch & Growth Plan

Consolidated, actionable go-to-market plan. Promo copy lives in
`PROMO_POSTS.md`; this file is the *sequence* and the *metrics* to watch.

> ⚠️ Before any public push: complete the P0/P1 items in
> `BUGS_AND_IMPROVEMENTS.md` and rotate all secrets (see `SECURITY.md`).
> The existing audit docs are partly stale — verify against the current code.

## 1. Positioning (one line)

> **Tinder for Java interview prep** — swipe right if you know it, left if
> you don't, and get an instant AI breakdown. 7 game modes, spaced
> repetition, and a readiness percentile. Free + PWA.

Differentiators vs generic flashcard apps: swipe UX, AI explanations
on-demand, spaced repetition (SM-2 style) that re-serves what you
forget, and a **percentile vs other candidates** so users feel progress.

## 2. Channels (in priority order)

| # | Channel | Audience | Effort | Expected lift |
|---|----------|-----------|--------|---------------|
| 1 | **ProductHunt** launch | Early adopters, tech | Low | High spike D1 |
| 2 | **Reddit** r/learnjava, r/cscareerquestions, r/ExperiencedDevS | Job-seekers | Low | Steady |
| 3 | **Habr / VC.ru** (RU) | RU-speaking devs | Low | Strong RU reach |
| 4 | **X / Twitter** threads | Dev Twitter | Low | Medium |
| 5 | **Telegram channels** (RU + EN) for juniors/middles | Captive | Low | High conversion |
| 6 | **SEO blog** "Question of the week" + topical interview guides | Organic | Medium | Compounding |

Copy for each is ready in `PROMO_POSTS.md`. Replace placeholders:
- Web/PWA: `https://your-domain.com`
- Telegram bot: `https://t.me/JavaInterviewTinderBot`

## 3. Launch sequence

1. **Soft launch (week 0):** ship to ProductHunt hunters' community +
   post in 2 Reddit subs + 1 Habr article. Watch D1/D7 retention.
2. **Telegram push (week 1):** post in 5-10 dev channels with the
   referral hook ("invite a friend → 7 days PRO").
3. **X/LinkedIn (week 1-2):** dev-rel style threads, screenshots of
   the swipe UI + a sample AI explanation.
4. **SEO (ongoing):** 1 post/week answering a real interview
   question, linking the app.
5. **Paid (optional, week 4+):** only after free→PRO
   conversion is understood. Small Reddit/Habr sponsored posts.

## 4. Virality levers (already built — make sure they're on)

- **ShareCard** after a session: percentile + "Share on X" / "Copy link".
- **Referral:** 7 days PRO per converted friend. Works in
  `CategorySelection`. Verify the link resolves (`?ref=` on web,
  `start_param` in TG).
- **Streak reminders:** worker pushes Telegram nudges — keep copy tight.

## 5. Monetization

- **Free tier:** swipe + test modes, daily request cap.
- **PRO:** all 7 modes, higher AI + resume + interview limits.
- **Payments:** Telegram Stars, TON, and **YooKassa (card)** are
  live. Stripe webhook was removed (YooKassa covers cards).
- **Offers to test:** yearly discount, "bring a friend" team plan,
  student discount.

## 6. Metrics to watch (instrument from day 1)

| Metric | Why | Target |
|--------|-----|--------|
| **D1 / D7 retention** | Core health of a swipe product | D7 > 25% |
| **Free → PRO conversion** | Business viability | > 3% |
| **Referral cohort** | Virality efficiency | > 15% of signups via `?ref=` |
| **Mode distribution** | Which modes retain; where to invest | No single mode < 5% |
| **AI success rate** | Quality of explanations (timeout/cache) | > 80% |
| **Streak recovery** | Do reminders work? | > 30% of at-risk return |

Log these from the existing `analytics_events` table + the `/api/stats*`
endpoints. Build a simple admin dashboard view if needed.

## 7. Pre-launch checklist

- [ ] Secrets rotated; `.env` / `*.ps1` never committed (gitignored).
- [ ] `npm run setup-db` applied; `check-schema.js` passes.
- [ ] Backend + frontend test suites green in CI.
- [ ] Telegram bot Menu Button + Web App URL set.
- [ ] Landing page SEO tags + OG/Twitter cards render.
- [ ] Referral link verified on web + TG.
- [ ] Payment flow tested end-to-end (Stars + YooKassa).
- [ ] Sentry/uptime alerts wired.
