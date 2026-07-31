# Prep-It Mini App Redesign Plan

> Migrating the existing Telegram Mini App UI to match `prepit-landing_3.html` per `prepit-miniapp-redesign-spec.md`. No business logic changes.

---

## Step 1 — Audit of Current App

### 1.1 Screens / Routes (app state machine)

| Screen | Component | Entry point |
|--------|-----------|-------------|
| Landing (web) | `Landing.jsx` | `initState === 'landing'` |
| Demo Mode | `DemoMode.jsx` | `initState === 'demo'` |
| Web Login | `WebLogin.jsx` | `initState === 'web_login'` |
| Onboarding | `Onboarding.jsx` | `screen === 'onboarding'` |
| Language Selection | `LanguageSelection.jsx` | `screen === 'language'` |
| Tracks | `TracksScreen.jsx` (lazy) | `screen === 'tracks'` |
| Track Detail | `TrackDetail.jsx` (lazy) | `screen === 'track-detail'` |
| Category Selection | `CategorySelection.jsx` | `screen === 'category'` |
| **Main (swipe deck + modes)** | Rendered by `App.renderMode()` | `screen === 'main'` |
| Progress | `ProgressScreen.jsx` (lazy) | `screen === 'progress'` |
| Review Mode | `ReviewMode.jsx` (lazy) | `screen === 'review'` |
| Saved Questions | `SavedQuestions.jsx` (lazy) | `screen === 'saved'` |
| Achievements | `AchievementScreen.jsx` (lazy) | `screen === 'achievements'` |
| Profile | `ProfileScreen.jsx` (lazy) | `screen === 'profile'` |
| Peer Interview | `PeerInterviewScreen.jsx` (lazy) | `screen === 'peer-interview'` |
| Resume Analyzer | `ResumeAnalyzer.jsx` (lazy) | `screen === 'resume'` |
| Vacancy Prep | `VacancyPrep.jsx` (lazy) | `screen === 'vacancy'` |
| Market Trends | `MarketTrends.jsx` (lazy) | `screen === 'trends'` |
| Subscription Plans | `SubscriptionPlans.jsx` (lazy) | `screen === 'subscriptions'` |
| Companies | `CompaniesScreen.jsx` (lazy) | `screen === 'companies'` |
| Admin Panel | `AdminPanel.jsx` (lazy) | `screen === 'admin'` |
| Debug Screen | `DebugScreen.jsx` | `debugOpen` state |

**Learning modes** (rendered inside `screen === 'main'`):
Swipe (default), Test, Bug Hunting, Blitz, System Design, Mock Interview, Concept Linker, Code Completion, Track, Playground

### 1.2 Modals / Overlays

| Component | Trigger |
|-----------|---------|
| `ExplanationModal` | AI explanation button on card back |
| `PaywallModal` | Locked mode attempt |
| `CertificateModal` (lazy) | Track completion |
| `ShareCard` | Deck-Complete share action |
| `ReportSheet` | Flag button on card |
| `DiscussionSheet` | Discuss button on card back |
| `PwaInstallPrompt` | Web users with 10+ seen |
| `ProNudge` | Free users, timed appearance |
| `MissedPanel` | Periodic weak-spot reminder |
| `DeckComplete` (inline) | Feed exhausted |
| Undo bar (inline) | After swipe, 3.5s timer |
| Debug FAB + overlay | Long-press / 5-tap |

### 1.3 Reusable UI Components

| Component | File(s) |
|-----------|---------|
| `QuestionCard` (TinderCard wrapper, flip, badges, bookmark, explain-ai, discuss) | `QuestionCard.jsx` + `.css` |
| `SwipeButtons` (X + Check floating action buttons) | `SwipeButtons.jsx` + `.css` |
| `Header` (top bar + bottom nav + mode drawer + more menu) | `Header.jsx` + `.css` |
| `SkeletonCard`, `SkeletonText`, `SkeletonGrid`, `SkeletonExplanation` | `Skeleton.jsx` + `.css` |
| `CategoryCard` (inline in CategorySelection) | `CategorySelection.jsx` |
| `ErrorBoundary` | `ErrorBoundary.jsx` |

### 1.4 Icons

- **Primary**: `lucide-react` — used throughout. Icons are 14–30px, consistent stroke.
- **Emoji-as-icon**: Present in the in-app Landing.jsx (feature cards, pain points, math items). Used for language labels in Header.jsx (☕ Java, 🐍 Python, etc.) and LanguageSelection.jsx.
- The app-in-Telegram (non-landing) screens use lucide-react icons exclusively — emoji are NOT used as functional icons in the actual mini-app screens (good).

### 1.5 Current Colors (all sources)

**CSS variables in `index.css`:**
- `--color-junior: #51cf66`, `--color-middle: #fcc419`, `--color-senior: #ff6b6b`
- Category colors: `--color-java-core: #ff6b6b`, `--color-collections: #4ecdc4`, etc.

**In `App.css` and component CSS files — heavy reliance on Telegram theme vars:**
- `var(--tg-theme-bg-color, #f5f5f5)` — page background
- `var(--tg-theme-text-color, #000)` — text
- `var(--tg-theme-hint-color, #868e96)` — secondary text
- `var(--tg-theme-button-color, #667eea)` — accent/primary
- `var(--tg-theme-secondary-bg-color, #f1f3f5)` — surfaces

**Hardcoded hex values found across CSS files:**
- `#667eea`, `#764ba2` — gradient primary (cards, buttons)
- `#5c7cfa` — primary blue
- `#1a1a2e` — dark background (payload, code blocks)
- `#f1f3f5` — light gray surface
- `#dee2e6`, `#e9ecef` — borders
- `#868e96`, `#adb5bd` — muted text
- `#51cf66` — green/success
- `#ff6b6b` — red/error
- `#fcc419`, `#ffd43b`, `#f59f00` — amber/warning/pro
- `#c92a2a`, `#e03131` — error red
- `#fff` — white
- `rgba(0,0,0,0.05)` through `rgba(0,0,0,0.3)` — borders/shadows

### 1.6 Fonts

- **Body**: System font stack — `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **Code blocks**: `'Courier New', Courier, monospace` or `'Fira Code', 'Courier New', monospace`
- **ExplanationModal code**: `'JetBrains Mono', 'Fira Code', 'Courier New', monospace` (only place JetBrains appears)
- **No Inter font anywhere**
- **No JetBrains Mono on headings, buttons, or numbers**

### 1.7 Navigation Structure

**Current bottom nav** (rendered inside Header.jsx, `z-index: 100`):
- Fixed to bottom, ~56px tall
- 4 visible mode buttons: Swipe, Test, System Design, Bug Hunting
- 5th button "More" opens a bottom drawer showing all 8 modes
- Icons-only (text labels hidden via CSS `display: none`)
- No app-level tab bar (no way to get to Profile, Progress, etc. without the overflow menu)

**Screen navigation**: Simple state machine with `screen` string and conditional rendering in App.jsx. No React Router. Header has a "more" dropdown menu linking to secondary screens.

No tab bar exists at the screen level. The spec's proposed tabs (Practice · Stats · Mock · Profile) would be a new structure.

---

## Step 2 — Gap Analysis

### 2.1 Component Mapping (app ↔ spec)

| Spec element | Current app equivalent | Notes |
|---|---|---|
| `.swipe-frame` live question card | `QuestionCard` (react-tinder-card) | Core swipe deck exists. Needs restyling to match cream/paper palette + 2.5px border + sticker shadow. |
| `.stat-box` proof strip | Header stats strip (readiness %, streak, daily goal) | Exists. Needs restyling to bordered-box + mono number format. |
| `.tab-btn` pill segmented control | `CategorySelection.jsx` difficulty chips + `Header.jsx` language chips | Pattern exists. Needs restyling to match the landing's pill shape. |
| `.plan` pricing cards | `SubscriptionPlans.jsx` + `PaywallModal.jsx` | Both need reskin. Paywall is dark-themed — needs to match cream/ink. |
| `.qa` FAQ accordion | No FAQ accordion in the mini app | The Landing.jsx has one, but it's for web. The mini-app doesn't have a FAQ screen. **No equivalent in app** — use the spec's pattern if this screen exists. |
| Mascot mark | **None** | No mascot exists in the app. Needs to be created for empty/loading/streak-lost states. |
| Checkbox / radio / select | Partially styled | CategorySelection has custom checkboxes. Form controls in DiscussionSheet, ReportSheet are mostly native. **Must be custom-styled per spec.** |

### 2.2 Spec Violations (required fixes, not optional)

| Rule | Status | Fix needed |
|------|--------|------------|
| **Fixed cream palette** (`--cream`, `--paper`, `--ink`, etc.) | ❌ Uses dynamic Telegram theme vars | Replace all `var(--tg-theme-*)` with spec tokens |
| **Fonts: JetBrains Mono (headings) + Inter (body)** | ❌ System font stack | Load fonts, apply globally |
| **Borders: 2–2.5px solid `--ink`** | ❌ 1px rgba borders everywhere | Increase to 2-2.5px solid #181510 |
| **No gradients** | ❌ Gradients on cards, buttons, progress bars, paywall, onboarding | Replace all with flat fills |
| **No soft ambient shadows** | ❌ `box-shadow: 0 4px 24px rgba(0,0,0,0.12)` etc. everywhere | Replace with sticker-pop `4px 4px 0 var(--ink)` only |
| **No emoji as functional icons** | ⚠️ Landing.jsx uses emoji as icons (but it's the web view, not mini-app). Header uses emoji in language labels. | Replace emoji in language labels with lucide-react icons. Landing is separate. |
| **No glassmorphism / backdrop-filter** | ⚠️ Used on card badges (`.category-badge` `backdrop-filter: blur(8px)`) | Remove backdrop-filter |
| **Safe areas** | ⚠️ Uses `env(safe-area-inset-*)` but not `window.Telegram.WebApp` safe area bindings | Add the spec's `applySafeArea()` JS + CSS vars |
| **Haptic feedback** | ❌ Only in SwipeButtons (navigator.vibrate) | Add haptics on swipe, selection, success, error |
| **Touch targets ≥ 44×44** | Mostly OK | Audit and fix any small targets |
| **Native button branding** | ❌ Not set | `wa.MainButton.setParams()` to --lime/--ink |
| **Theme-independent cream** | ❌ Currently binds to Telegram theme | Force cream regardless of system theme |

### 2.3 Items Requiring Clarification

- **Bottom tab bar structure**: Current app has no screen-level tab bar. The spec suggests Practice · Stats · Mock · Profile. The app currently navigates via a `screen` state variable. Implementing a tab bar would require restructuring App.jsx navigation. **Is this desired, or should we keep the current navigation and only re-skin the header and bottom nav?**
- **FAQ screen**: The app has no FAQ/settings screen with an accordion. Spec says the "qa accordion" maps to Settings/Help. The app currently has an inline `DiscussionSheet` but no FAQ. **Should we add a settings/FAQ screen or skip?**
- **Mascot**: Needs to be designed/created. The spec mentions it for empty states, loading, streak-lost, achievements. **Do you have an SVG asset for the mascot, or should I replicate it from the landing page?**
- **The existing bottom nav shows learning modes** (Swipe, Test, etc.) — it's a mode switcher, not a screen tab bar. Replacing it with the spec's app-level tabs (Practice, Stats, Mock, Profile) would change how users access these screens. **Should I restructure the navigation or add the tab bar alongside the existing mode bottom nav?**

---

## Step 3 — Phased Execution Plan

### Phase 0 — Global Tokens & Base Reset
*No user-visible changes. Foundation for all other phases.*

**Files to touch:**
- `frontend/src/index.css` — Add CSS custom properties for all spec tokens, import JetBrains Mono + Inter via `@import`, set base font-family, replace system fonts, set body bg to `--cream`, set base border/radius rules, `-webkit-tap-highlight-color: transparent`
- `frontend/src/App.css` — Remove gradient/box-shadow rules, replace Telegram theme var bindings with spec tokens, add safe-area CSS variable fallbacks
- `frontend/src/main.jsx` — Add `applySafeArea()` function (spec's JS), call `wa.ready()`, `wa.expand()`, `wa.setBackgroundColor('#F7F3E6')`, `wa.MainButton.setParams()`
- `frontend/index.html` — Add font preconnect/preload links, update `<meta name="theme-color">` to `#F7F3E6`

**Not touched:** Any JSX, any component logic, any business logic.

---

### Phase 1 — Navigation Shell
*Tab bar (or restyled bottom nav) + header, all using spec tokens.*

**Files to touch:**
- `frontend/src/components/Header.jsx` — Reskin: replace gradient background with `--paper`, replace `var(--tg-theme-*)` with spec tokens, update font to JetBrains Mono for labels
- `frontend/src/components/Header.css` — Full rewrite of header styles using spec tokens: `border-bottom: 2.5px solid var(--ink)`, `background: var(--paper)`, safe-area-aware padding, restyle bottom nav items with active pill style (--lime bg), replace soft shadow with sticker pop on active state
- `frontend/src/App.jsx` — If implementing spec tab bar, add state/switch logic. Otherwise, keep current nav but wire spec styling.

**Deliverable:** Header/bottom-nav uses spec tokens, fonts, borders. Safe areas correct. Tab bar navigable.

---

### Phase 2 — Core Swipe Deck (Main Screen)
*Highest fidelity — the primary user surface.*

**Files to touch:**
- `frontend/src/components/QuestionCard.jsx` — Replace gradient card backgrounds with `--paper`/`--cream2`, apply 2.5px `--ink` border, add sticker-pop shadow on active, remove `backdrop-filter` from badges, update font families (JetBrains Mono for labels, Inter for body/question text), replace emoji-like styling with lucide icons
- `frontend/src/components/QuestionCard.css` — Rewrite: flat `--paper` bg, 2.5px solid `--ink` border, `4px 4px 0 var(--ink)` sticker shadow on active/flip, remove all `linear-gradient`, `backdrop-filter`, soft shadows
- `frontend/src/components/SwipeButtons.jsx` — Reskin: replace gradient button backgrounds with flat `--ink`/`--cream`/`--lime`, 2.5px border, sticker pop on press, lucide icons
- `frontend/src/components/SwipeButtons.css` — Rewrite per spec tokens
- `frontend/src/components/DeckComplete.jsx` — Restyle to match spec
- `frontend/src/App.css` — Update `.card-stack`, `.card-wrapper`, `.card-peek-shell` to spec tokens (remove gradient, add border + paper bg)

**Not touched:** Any swipe/gesture/API logic in QuestionCard, any tinder-card library configuration, any store functions.

---

### Phase 3 — Secondary Screens (Priority Order)
*One screen at a time.*

**3a — Progress Screen** (`ProgressScreen.jsx` + `.css`)
- Restyle readiness ring, stat cards, history bars per spec tokens
- Mono font for numbers, Inter for body
- Remove soft shadows, gradients, Telegram theme vars

**3b — Profile Screen** (`ProfileScreen.jsx` + `.css`)
- Restyle stats grid, avatar section, progress bar
- Spec tokens, borders, fonts

**3c — Subscription Plans** (`SubscriptionPlans.jsx` + `.css`, `PaywallModal.jsx` + `.css`)
- Full reskin: cream/paper background, 2.5px border on plan cards, featured plan gets sticker shadow
- Remove dark gradient background on paywall — use `--paper` with `--ink` border
- `--lime` CTA buttons instead of gold gradient

**3d — Review Mode** (`ReviewMode.jsx` + `.css`)
- Restyle review cards same as QuestionCard pattern
- Flat colors, spec borders, mono/Inter fonts

**3e — Saved Questions, Achievements, Companies, Peer Interview**
- Apply spec tokens, borders, fonts — these are simpler screens with less custom styling

---

### Phase 4 — Forms, Modals, Inputs, Controls
*Checkboxes, radios, selects, form inputs, tab filters.*

**Files to touch:**
- `frontend/src/components/CategorySelection.jsx` + `.css` — Checkboxes, difficulty chips, category cards
- `frontend/src/components/DiscussionSheet.jsx` + `.css` — Form inputs, buttons, textareas
- `frontend/src/components/ReportSheet.jsx` + `.css` — Radio buttons, textarea
- `frontend/src/components/ExplanationModal.jsx` + `.css` — Modal overlay, buttons, limit upsell
- `frontend/src/components/LanguageSelection.jsx` + `.css` — Language cards, emoji replacements

**Key actions:**
- Style all `<input type="checkbox">` and `<input type="radio">` per landing's custom styling (lime checkmark, --ink border)
- Style `<select>` with custom chevron per landing
- All inputs: 2px `--ink` border, `--cream` background, correct font
- Replace emoji in LanguageSelection with lucide-react icons or colored dots

---

### Phase 5 — Empty / Loading / Error States

**Files to touch:**
- `frontend/src/components/Skeleton.jsx` + `.css` — Restyle shimmer to use `--cream2`/`--paper` tones
- Empty states inline in `App.jsx` — Apply spec tokens (background, text colors)
- Onboarding (`Onboarding.jsx` + `.css`) — Full reskin: replace gradient dark background with `--cream`, spec tokens, flat colors for step indicators
- `frontend/src/components/MissedPanel.jsx` — Restyle per spec
- `frontend/src/components/ProNudge.jsx` + `.css` — Restyle per spec tokens

**If mascot is available:**
- Add mascot SVG to empty states (no questions, deck complete)
- Add mascot to loading screens
- Add mascot to achievement unlocks

---

### Phase 6 — Final Spec Compliance Pass
*Screen-by-screen checklist from the spec.*

- Verify every color traces back to a spec token (grep for remaining ad-hoc hex values)
- Verify every fixed element accounts for `--safe-top` / `--safe-bottom`
- Verify `BottomButton`/`SecondaryButton` colors set to `--lime`/`--ink`
- Verify no `:hover`-only effects (replace with `:active` sticker pop)
- Verify touch targets ≥ 44×44px
- Verify haptics on swipe / selection / success / error
- Verify canvas stays cream regardless of system theme
- Verify checkboxes, radios, selects are custom-styled
- Verify mono font used only for headings/numbers, Inter for body
- Verify no emoji as functional icons
- Verify no gradients, no soft shadows, no glassmorphism
- Verify border weight is 2–2.5px solid `--ink` everywhere
- Verify copy avoids spec-banned clichés

---

## Summary of all files that will be modified

| Phase | Files |
|-------|-------|
| 0 | `index.css`, `App.css`, `main.jsx`, `index.html` |
| 1 | `Header.jsx`, `Header.css`, possibly `App.jsx` |
| 2 | `QuestionCard.jsx`, `QuestionCard.css`, `SwipeButtons.jsx`, `SwipeButtons.css`, `DeckComplete.jsx`, `App.css` |
| 3a | `ProgressScreen.jsx`, `ProgressScreen.css` |
| 3b | `ProfileScreen.jsx`, `ProfileScreen.css` |
| 3c | `SubscriptionPlans.jsx`, `SubscriptionPlans.css`, `PaywallModal.jsx`, `PaywallModal.css` |
| 3d | `ReviewMode.jsx`, `ReviewMode.css` |
| 3e | `SavedQuestions.jsx`, `AchievementScreen.jsx`, `CompaniesScreen.jsx`, `PeerInterviewScreen.jsx` + their CSS files |
| 4 | `CategorySelection.jsx` + `.css`, `DiscussionSheet.jsx` + `.css`, `ReportSheet.jsx` + `.css`, `ExplanationModal.jsx` + `.css`, `LanguageSelection.jsx` + `.css` |
| 5 | `Skeleton.jsx` + `.css`, `Onboarding.jsx` + `.css`, `MissedPanel.jsx`, `ProNudge.jsx` + `.css`, possibly new mascot integration |
| 6 | All files — final audit pass, no structural changes |

**No business logic files will be touched:** `useStore.js`, `api/client.js`, any backend code, any test files.

---

## Questions Before Starting

1. **Navigation restructure**: Keep the current learning-mode bottom nav but reskinned, or implement the spec's Practice/Stats/Mock/Profile screen-level tab bar?
2. **Mascot asset**: Do you have an SVG, or should I extract it from the landing page SVG inline code?
3. **FAQ/Settings screen**: Does the mini-app need one, or should we skip it?

Approve this plan (or a specific phase) and I'll begin Phase 0.
