# Plan: Distraction-free layout (keep all functionality)

Goal: nothing distracts the user from swiping/learning. Keep every feature,
including all sales/PRO elements (PaywallModal, ProNudge, subscription entry,
PRO locks). Only optimize placement & visual weight.

## 1. Header — collapse into a quiet strip
File: `frontend/src/components/Header.jsx` + `Header.css`
- Drop the bold "Interview Tinder" wordmark; keep a small muted `TrendingUp` logo mark only.
- Compress the verbose 3-row stats block into ONE slim progress bar + a tiny
  single line: `readiness%` · `🔥 streak` · `📚 today/goal` (muted, small).
- Remove the `streak-anim` "+1" pop animation (keep the streak count, subtle).
- Reduce header padding/height. Card gets more vertical room.
- All detailed stats remain reachable: stats strip still opens `onProgressClick`,
  and study/interface language + subscription/resume/help/settings stay in More menu.

## 2. QuestionCard — declutter the card surface
File: `frontend/src/components/QuestionCard.jsx` + `QuestionCard.css`
- Reposition floating bookmark + report buttons: smaller (32–36px), default
  low opacity (~0.5), full opacity on press — accessible but not attention-grabbing.
- Keep the flip-hint prominent (primary action).
- Keep category/difficulty badges (informative) as a single subtle line; keep "Repeat" badge.
- Back face: keep "Explain with AI", bookmark, swipe hints; slightly reduced weight.

## 3. Bottom nav — keep modes, calmer strip
File: `frontend/src/components/Header.css`
- Keep all 4 visible modes + "more" drawer + PRO locks (sales untouched).
- Hide text labels, show icons only; rely on active color + tooltips/title attrs.

## 4. Minor polish
- Tone down the bright green `refresher-banner` (inform, don't shout). Keep functionality.
- No changes to PaywallModal, ProNudge, SubscriptionPlans, ShareCard, modes logic.

## Verification
- `cd frontend && npm run build` and lint to ensure no breakage.
- Manual check: card is focal point; flip, swipe, save, report, mode switch,
  progress, subscription all still reachable.
