# Vertical Protocol — Worklog

Project: "Vertical Protocol" — a cozy cyberpunk gamified AI-literacy learning platform (the "Duolingo for AI"), set in a humid, rain-slicked, neon Tokyo.

## Concept Summary
- Atmosphere: Overcast Tokyo, 34°C, 77% humidity, rain, neon. Cozy-game warmth blended with cyberpunk decay ("Logical Decay").
- Two playable scenarios (paths): **Neon Syntax** (Compiler saving Akihabara) & **Silicon Shrine** (technician-priest maintaining AI Kami in Odaiba).
- Curriculum: 4 modules — (1) What is AI?, (2) Mastering Chat/Prompts, (3) The Dark Side (risks), (4) Images & Creativity.
- Exercise types: fill-the-blank (prompt engineering), true/false (hallucination), Tinder-style swipe (AI vs real), multiple choice.
- Gamification: daily streaks, hearts/lives, XP, leagues, mascot "Bip", cozy reactions.
- Language: Portuguese (PT-BR) UI per the brief, with atmospheric English flavor text.

## Art Direction
Cozy-neon palette (avoiding indigo/blue as primary): warm amber/peach primary neon, teal/cyan tech accent, magenta sign accent, deep warm charcoal background. Rain + soft bokeh + glow.

---
Task ID: 0
Agent: orchestrator
Task: Bootstrap worklog and plan.

Work Log:
- Explored existing Next.js 16 scaffold (fresh, dev server running on :3000).
- Reviewed package.json (full shadcn/ui, framer-motion, prisma, z-ai-web-dev-sdk, zustand, etc.).
- Defined architecture: Prisma models (Learner, Module, Lesson, Exercise, Progress, Streak, Stats, Activity), API routes, single-page app with view-state routing via Zustand.

Stage Summary:
- Foundation understood. Proceeding to schema + seed + APIs + UI in parallel with art generation.

---
Task ID: 1
Agent: art-generation
Task: Generate cozy-cyberpunk Tokyo art assets for "Vertical Protocol".

Work Log:
- Read worklog.md to confirm art direction (warm amber/peach + teal/cyan + magenta on deep warm charcoal; avoid indigo/blue primary).
- Created /home/z/my-project/public/art/ directory.
- Invoked image-generation skill; used `z-ai image` CLI (z-ai-web-dev-sdk).
- Built a single consistent "Bip mascot design" baseline prompt (small round egg-shaped robot, cream body, single large teal-cyan glowing eye, magenta antenna, soft amber rim light, cozy chibi, NO text) prepended to every Bip pose so the mascot stays visually identical across idle/happy/sad/thinking/sleep.
- First batch of 12 parallel calls hit API rate limits (429) and several "context deadline exceeded" CLI-side timeouts. Despite the error messages, files were usually already written to disk by the time the timeout fired — verified via `ls -la`.
- Retried the missing ones serially with sleep delays to avoid 429s. Note: `1440x720` is in the SDK's documented supported sizes but the underlying API rejects it (HTTP 400: dimensions must be multiples of 32 — 720 is not). Switched `tokyo-rain.png` to `1344x768` (both multiples of 32), which succeeded.
- Final verification: all 12 PNGs present in /home/z/my-project/public/art/.

Files created (filename — size bytes — dimensions):
- bip-idle.png — 74293 — 1024x1024
- bip-happy.png — 59942 — 1024x1024
- bip-sad.png — 63315 — 1024x1024
- bip-thinking.png — 69921 — 1024x1024
- bip-sleep.png — 55052 — 1024x1024
- tokyo-rain.png — 157840 — 1344x768 (landscape; 1024x576 not supported by API, used 1344x768 as closest 32-multiple landscape)
- akihabara-neon.png — 170526 — 1344x768 (landscape)
- odaiba-shrine.png — 168440 — 1344x768 (landscape)
- module-ai.png — 104257 — 1024x1024
- module-prompt.png — 44143 — 1024x1024
- module-risk.png — 54962 — 1024x1024
- module-image.png — 63745 — 1024x1024
Total: 12 files, ~1.09 MB.

Command template used:
  z-ai image -p "<prompt>" -o "/home/z/my-project/public/art/<name>.png" -s <size>

Stage Summary:
- All 12 art assets generated successfully and saved to /home/z/my-project/public/art/. Mascot Bip is design-consistent across all 5 poses (cream body, single teal eye, magenta antenna, amber rim light). Three landscape backgrounds use 1344x768. Four module icons use 1024x1024. Palette stays in cozy amber/peach + teal/cyan + magenta on warm charcoal (no indigo/blue primary). UI/source code was not touched. Downstream UI agents can reference these via /art/<filename>.png.

---
Task ID: 2
Agent: orchestrator
Task: Build the full Vertical Protocol application (schema, seed, APIs, UI, exercise engine, gamification) and verify end-to-end.

Work Log:
- Database: wrote prisma/schema.prisma (Learner, Module, Lesson, LessonProgress, Streak, ActivityLog, Settings); fixed a duplicate @id on Streak; ran db:push + db:generate.
- Curriculum: wrote src/lib/curriculum.ts with 4 modules × 3 lessons = 12 lessons, each with 3-4 exercises across 5 types (multiple-choice, true-false, fill-blank, swipe, order). Portuguese PT-BR content with cozy cyberpunk narrative ("Bip", "Decadência Lógica", "Compilador", Akihabara/Odaiba).
- Seed: wrote prisma/seed.ts to load curriculum + create default learner + 6 phantom league rivals (Yuki-7, Compiler_Aya, etc.); ran successfully.
- Game helpers: wrote src/lib/game.ts (getCurrentLearner, heart regen, streak computation, league thresholds).
- API routes: /api/state, /api/init, /api/curriculum, /api/lesson/[id]/complete, /api/streak/touch, /api/leaderboard, /api/heart/refill, /api/settings, /api/reset.
- Theme: rewrote globals.css with cozy-neon palette (warm amber primary, teal accent, magenta/rose neons, deep warm charcoal background) + custom animations (rain-fall, neon-flicker, float-soft, pulse-glow, shake, pop-in, confetti, scan-line, drift) + cozy scrollbar + neon text/border utilities + glass-panel.
- Layout: added Space Grotesk display font, PT-BR lang, dark theme default, mascot favicon.
- Frontend store: Zustand store (src/components/game/store.ts) with view routing, bootstrap, lesson flow, streak/heart/settings actions.
- Components built: RainBackground (CSS rain + glow orbs, mounted-gated for hydration safety), Bip (mascot with 5 moods + speech bubble), WeatherWidget (Tokyo JST clock, 34°C/77% humidity diegetic context), TopBar (hearts/streak/XP/gems with live heart-regen countdown), BottomNav (sticky footer with safe-area), Cinematic (Play/Pause/Restart intro), Onboarding (path selection Neon Syntax vs Silicon Shrine), Home (dashboard with streak banner, weekly goal, league progress, daily pílula, weather), SkillPath (Duolingo-style winding path with module sections + locked states + stars), LessonPlayer (exercise orchestration with progress bar, Bip reactions, verify/continue flow, reveal explanations), 5 exercise components (MultipleChoice, TrueFalse, FillBlank tap-to-place, Swipe with framer-motion drag + tap fallback, Order with @dnd-kit sortable), LessonComplete (confetti, stars, XP/gems/hearts summary, streak banner, next-lesson CTA), Leaderboard (rankings + league ladder + promote/demote zones), Profile (stats, league ladder, settings toggles, reset), Confetti.
- Hydration fix: RainBackground Math.random gated behind mounted state; page.tsx uses useSyncExternalStore-based useIsClient gate with a cozy LoadingSplash to eliminate all SSR/client mismatches from client-only libraries.

Bugs found & fixed during agent-browser verification:
1. Curriculum API returned raw Prisma objects (was returning `modules` instead of mapped `result`) → fixed to `return NextResponse.json({ modules: result })`. First lesson now correctly marked unlocked.
2. Returning users saw cinematic on every reload → bootstrap now auto-routes returning learners (xp>0 or custom name) straight to home.
3. Order exercise rendered no rows: server stores items under `items` but client expected `items_order` → added normalization in store.startLesson that maps `items`→`items_order` for order-type exercises. Also emit initial scramble as the answer on mount so Verificar enables immediately.
4. Swipe exercise showed generic "Feito por IA"/"Real" labels for all contexts (wrong for Treino/Uso, Alucinação/Verificável, etc.) → added per-exercise `rightLabel`/`leftLabel` to the SwipeExercise data type + all 4 swipe exercises; component falls back to defaults.
5. Hydration mismatch from Math.random + framer-motion during SSR → mounted gate + useIsClient hook; verified zero hydration errors after fresh reload.
6. Lint errors (no-assign-module-variable, set-state-in-effect, preserve-manual-memoization, unused disables) → all resolved; lint is clean.

Verification (agent-browser end-to-end):
- Cinematic intro renders with Play/Pause/Restart + skip. ✓
- Onboarding: name input + 2 path cards (Neon Syntax / Silicon Shrine) + start. ✓
- Home: greeting, streak banner, hearts/XP/gems stats, weekly goal, league progress, weather widget, daily pílula, bottom nav. ✓
- Skill path: 4 modules, winding lesson nodes, locked/unlocked/current states, stars. ✓
- Lesson flow tested on 3 lessons (all 5 exercise types): multiple-choice ✓, true-false ✓, fill-blank (tap-to-place) ✓, order (dnd-kit + arrows) ✓, swipe (drag + tap buttons) ✓. Verify→reveal explanation→continue→finalize all work.
- Lesson completion: confetti, stars, XP/gems/hearts summary, streak banner, next-lesson CTA. State API confirms XP (+15/lesson), gems (+2), streak (touched, current=1), progress (1/12→3/12). ✓
- Leaderboard: 7 standings (Kai + 6 rivals), rank, promote/demote zones, league ladder. ✓
- Profile: stats grid, completion progress, league ladder, settings toggles (sound/rain/reduced-motion), reset with confirm. ✓
- VLM visual review of home screenshot: confirms cozy-cyberpunk aesthetic, correct warm amber/teal/magenta palette on dark charcoal (no blue/indigo), clean card layout, cute mascot, good hierarchy. ✓
- Final: lint clean, zero hydration/runtime errors on fresh reload. ✓

Stage Summary:
- Vertical Protocol is feature-complete and browser-verified. 12 lessons across 4 modules, 5 exercise types, full gamification (streaks/hearts/XP/gems/leagues/mascot), cozy cyberpunk Tokyo atmosphere with rain + neon. Single-page app on `/` with Zustand view routing. All API routes functional. Art assets (mascot Bip in 5 poses + 3 backgrounds + 4 module icons) generated and integrated.
- Known minor: dev-shots/ folder contains test screenshots (can be ignored/removed). The Next.js dev overlay ("Open in editor" etc.) is dev-only and won't appear in production.
- Recommended next-phase work for the 15-min review cron: add a practice mode to refill hearts, add a "playground" chat widget using the LLM skill, add sound effects, expand curriculum with more lessons, add achievements/badges, polish mobile layout further, add the WhatsApp-bot MVP variant mentioned in the brief.

---
Task ID: 3
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (achievements, AI Playground, sound effects) + styling polish.

## Current Project Status Assessment
- Vertical Protocol was feature-complete (12 lessons, 5 exercise types, gamification) per Task ID 2.
- QA via agent-browser + VLM confirmed the app loads cleanly with no runtime/hydration errors.
- VLM flagged: mobile bottom-nav overlapping long content (the "PÍLULA DO DIA" paragraph), flat sub-sections, CTA lacking pulse, progress bars lacking shimmer.

## Completed Modifications

### 1. QA bug fixes
- **Bottom-nav overlap on mobile**: added `pb-24` to `<main>` on hub views so sticky nav never covers content.
- **Returning-user routing**: confirmed bootstrap auto-skips cinematic for returning learners.

### 2. New Feature: Achievements / Badges system
- **Data**: new Prisma models `Achievement` (learner+slug, unique pair) and `ChatThread` (playground history). Pushed schema + regenerated client.
- **Definitions** (`src/lib/achievements.ts`): 12 achievements across 5 categories (Início, Trilha, Ofensiva, Explorador, Mestre) — e.g. "Primeiro Passo", "Mestre do Protocolo", "Semana Perfeita", "Alma Curiosa". Each grants gems + XP.
- **Sync engine** (`src/lib/achievement-sync.ts`): `syncAchievements()` evaluates learner context (completed lessons/modules, streak, 3-star lessons, league, playground usage) and persists newly-earned badges + rewards.
- **API**: `GET /api/achievements` (sync + return all with unlock state). Hooked into lesson-complete route (returns `newAchievements`).
- **UI**: `Achievements.tsx` view — categorized badge grid with locked/unlocked states, emoji medallions, neon-accent frames, collection progress bar with shimmer, gem/XP rewards. `AchievementToasts.tsx` — animated popup when a badge unlocks (auto-dismiss 6s, shimmer sweep, reward sound).
- **Integration**: toasts surface on lesson completion and playground use; store refreshes state + achievements.

### 3. New Feature: AI Playground (LLM chat with Bip)
- **Architecture decision**: Importing `z-ai-web-dev-sdk` directly in a Next.js API route destabilized the Turbopack dev server (hard crash, no JS error). Also, `export const maxDuration = 60` crashed Turbopack. Solution: a **mini-service** architecture.
- **Mini-service** (`mini-services/playground/`, port 3001): a Bun HTTP server that performs LLM chat via the `z-ai` CLI (`Bun.spawn`) — the SDK crashes inside `Bun.serve`'s handler, but the CLI (separate process) is stable. Implements the cozy "Bip" tutor persona (PT-BR, teaches Contexto+Tarefa+Formato). Includes conversation history in the prompt for multi-turn context.
- **Gateway routing**: the frontend calls `/chat?XTransformPort=3001` which Caddy (port 81) forwards to the mini-service. Then calls `/api/playground/save` (Next.js) to persist the thread + sync achievements. This avoids server-to-server fetch (which crashed the dev server under bun).
- **API**: `POST /api/playground/save` (persist exchange + sync achievements), `GET /api/playground/chat?threadId=` (load saved threads).
- **UI**: `Playground.tsx` — chat interface with Bip avatar, message bubbles, typing indicator (animated dots), 4 starter prompts, auto-scroll, Enter-to-send, graceful error messages. Accessible via bottom-nav "IA" tab + home CTA card.
- **Verified end-to-end**: Bip responds with on-brand cozy tutor replies (~7s via CLI). Achievement "Alma Curiosa" auto-unlocks on first prompt.

### 4. New Feature: Cozy sound effects
- `useSound.ts` hook using the Web Audio API (no asset files). Six synthesized tones: correct (ascending C5→E5), wrong (descending A4→F4), reveal (shimmer), tap (click), complete (C-major arpeggio), achievement (sparkly reward).
- Respects the `sound` setting toggle. Integrated into LessonPlayer (check/continue/reveal) and AchievementToasts (reward sound on unlock).

### 5. Styling polish
- **CTA pulse animation** (`animate-cta-pulse`) on the primary "Continuar" button — breathing glow ring.
- **Shimmer effect** on progress bars (weekly goal, achievements collection) — moving light sweep.
- **Neon-violet** text utility added for variety.
- **BottomNav redesign**: 5 items with the "IA" (Playground) tab styled distinctly (teal border + glow).
- **Home additions**: Achievements + Playground entry cards with emoji previews and mascot art.
- **New keyframes**: `shimmer`, `cta-pulse`, `typing-dot`.

## Verification Results
- **Playground chat** (via port 81 gateway): Bip responds correctly, thread persisted, "Alma Curiosa" achievement unlocked. ✓
- **Achievements view**: 4/12 selos unlocked, categorized grid, progress bar. ✓
- **Achievement toasts**: animate in with sound on unlock. ✓
- **Sound effects**: play on correct/wrong/reveal in lessons (verified via code path). ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable**: Next.js (3000) + mini-service (3001) alive after full flow. ✓
- **VLM review**: Playground 8/10, Achievements 7.5/10 — cozy aesthetic confirmed. ✓
- **No browser errors / hydration issues**. ✓

## Unresolved Issues / Risks
1. **Dev server process management**: The original system-managed `bun run dev` process held a stale Prisma client (pre-new-models). I had to kill and restart it. I started a replacement via `setsid bun run dev` which is stable but may not be managed by the system's auto-restart. If it dies, run `bash /home/z/my-project/start-services.sh` to restart both Next + mini-service.
2. **Mini-service must be running** for the Playground to work. The `start-services.sh` script starts both. The mini-service uses the `z-ai` CLI (proven stable).
3. **Preview must be accessed via port 81** (gateway), not port 3000 directly, for the Playground's `?XTransformPort=3001` routing to work. Port 3000 works for everything EXCEPT the playground chat.
4. **Achievements grid layout**: VLM noted minor height inconsistency between locked/unlocked cards in the 2-col grid — low priority polish.

## Priority Recommendations for Next Phase
1. Add a **practice mode** to refill hearts (review old lessons for gems).
2. Expand the curriculum with more lessons (the brief mentions WhatsApp-bot / image-gen content).
3. Add **sticky section headers** + collapse for the achievements list.
4. Add **sound on/off quick-toggle** in the top bar (currently only in profile settings).
5. Consider **streaming** the playground response (CLI supports `--stream`) for a snappier feel.
6. Polish mobile layout further (VLM suggested line-height in chat bubbles).

---
Task ID: 4
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (practice mode, activity timeline) + styling polish.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser revealed a **stale Turbopack module cache**: the dev server (running since round 3) couldn't resolve `@/components/game/Achievements` and `Playground` even though the files existed — the browser showed "Module not found" errors and only the Z.ai logo rendered.
- Root cause: `bun run dev` wrapping next was unstable (crashed on browser HMR reloads). Switching to `node node_modules/.bin/next dev` directly is stable. Updated `start-services.sh` accordingly.
- VLM review of mobile home flagged: dense "wall of text" in Pílula/Contexto, flat sub-sections, weekly goal overflow display, accent color overuse.

## Completed Modifications

### 1. QA bug fixes
- **Stale module cache / dev server crashes**: stopped the bun-wrapped dev server, cleared `.next`, restarted Next via `node` directly (stable under browser HMR). Updated `start-services.sh` to launch Next via `node` (not `bun`).
- **"undefined" in Profile XP LIGA stat** (critical): the `/api/state` route was not returning `leagueXp`, so `learner.leagueXp` rendered as "undefined". Added `leagueXp: learner.leagueXp` to the state API response. Verified the stat now shows the correct number.

### 2. Styling polish
- **ExpandableText component** (`src/components/game/ExpandableText.tsx`): reusable component using `-webkit-line-clamp` with auto-detection of overflow and a "Ler mais / Ler menos" toggle. Applied to the Home "Pílula do dia" so long tips are truncated to 3 lines with an expand toggle — fixes the mobile "wall of text" issue.
- **Blockquote styling**: the WeatherWidget atmospheric quote now uses a left-border accent (teal) with italic foreground/70 text, distinguishing it from body text.
- **Weekly goal overflow celebration**: when weekly XP ≥ goal, the label switches to teal with a "✦" spark and the existing "Meta atingida!" message celebrates. Bar stays capped at 100%.
- **cozy-card utility**: added a unified `.cozy-card` CSS class (consistent bg/border/radius) for standardizing content sections.
- **Consistent spacing**: bumped Pílula section to `mt-6 p-5 sm:p-6` and `mb-3` header spacing for better breathing room.

### 3. New Feature: Practice / Review mode
- **Concept**: completed lessons can be replayed in "practice mode" — no hearts cost, awards gems (1-3 based on accuracy) instead of XP. Lets learners refill hearts via gameplay rather than only spending gems.
- **API** (`POST /api/lesson/[id]/practice`): reuses the grading logic, requires the lesson to be already completed, awards gems (3 for perfect, 2 for ≥66%, 1 for ≥33%), no hearts lost, no XP, logs a "practice" activity event, syncs achievements.
- **Store**: added `practiceMode`, `lastPracticeResult`, `startPractice`, `submitPractice`, `refreshActivity` actions. `startLesson` sets `practiceMode=false`; `startPractice` sets it true. `submitPractice` calls the practice API and routes to complete view.
- **LessonPlayer**: detects `practiceMode` — shows a "MODO PRÁTICA" banner on the intro, displays "+1-3 💎 · sem custo de vidas" instead of XP, and routes the submit to `submitPractice`.
- **LessonComplete**: handles practice results — title says "Prática concluída!" (teal), reward grid shows only gems (no XP/hearts/streak), offers "Praticar de novo" button.
- **SkillPath**: completed lesson nodes now show "Praticar · +💎" instead of "+XP", and clicking them launches practice mode (no hearts check).
- **Verified end-to-end**: practiced "IA não é mágica, é padrão" → 4/4 correct → +3 gems awarded (gems 46→49), XP unchanged (93), activity logged "practice: IA não é mágica...".

### 4. New Feature: Activity timeline on Profile
- **API** (`GET /api/activity`): returns the last 20 activity log events (lesson_complete, practice, achievement, heart_refill, streak_freeze_owned, etc.) with type, detail, xpDelta, createdAt.
- **ActivityFeed component** (`src/components/game/ActivityFeed.tsx`): renders a timeline with type-specific icons + colors (amber for lessons/achievements, teal for practice/playground, rose for hearts, violet for streak-freeze), relative timestamps ("há 20min"), and XP delta badges. Empty state for new learners.
- **Profile integration**: added a "LINHA DO TEMPO" section between the league ladder and settings, showing the learner's recent journey.
- **Verified**: profile now shows "Praticou: IA não é mágica", "Conquista: Alma Curiosa", etc. with timestamps.

## Verification Results
- **Stale module cache**: resolved by switching to `node`-based dev launch — app renders fully, no "Module not found" errors. ✓
- **Practice mode**: full flow verified (intro → 4 exercises → "Prática concluída!" → +3 gems → "Praticar de novo"). ✓
- **Activity timeline**: shows recent practice + achievements with icons, colors, timestamps. ✓
- **"undefined" bug**: fixed — Profile XP LIGA stat now shows the correct number (49). ✓
- **Weekly goal overflow**: shows teal "✦" celebration when over 100%. ✓
- **ExpandableText**: Pílula truncates with "Ler mais" toggle. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** under browser HMR with node-based launch. ✓
- **VLM review**: Home improved to 9/10 (was 7.5/10), Profile 7/10 (undefined bug now fixed). ✓

## Unresolved Issues / Risks
1. **Dev server must be started via `node`** (not `bun run dev`) — `bun` wrapping next crashes on browser HMR reloads. The `start-services.sh` script handles this. If the preview shows only the Z.ai logo, run `bash /home/z/my-project/start-services.sh`.
2. **Mini-service (port 3001) must be running** for the Playground chat — `start-services.sh` starts both.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **Shop API** (`/api/shop`) was scaffolded (streak-freeze + heart-refill items) but the shop UI was not built this round — it's available for the next phase.

## Priority Recommendations for Next Phase
1. Build the **Shop UI** (the API exists) — a gem shop view with streak-freeze + heart-refill purchase buttons.
2. Add **sticky/collapsible section headers** for the achievements list (VLM noted scroll fatigue).
3. Expand the **curriculum** with more lessons (image-generation content from the brief).
4. Add a **sound on/off quick-toggle** in the top bar.
5. Consider **streaming** the playground response for a snappier feel.
6. Add **weekly league reset** logic (promote/demote based on standings).

---
Task ID: 5
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (Shop UI, sound quick-toggle, streak-freeze) + styling polish.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly with no console/hydration errors.
- VLM review of mobile home/profile flagged: flat CTA, nav active states, timeline density, card border inconsistency.
- The Shop API existed from round 4 but had no UI.

## Completed Modifications

### 1. New Feature: Shop UI (gem shop)
- **Schema**: added `freezes Int @default(0)` to the Streak model (owned streak-freeze count). Pushed schema + regenerated Prisma client.
- **Shop API** (`/api/shop`): rewrote cleanly — GET returns catalog (heart-refill 5💎, streak-freeze 10💎) + gems + hearts + owned freezes; POST purchases items (decrements gems, refills hearts or increments freezes, logs activity). Fixed a typo ("Conegela"→"Congela"). Replaced the clunky activity-log-based freeze counting with a proper `freezes` field. Simplified the transaction to sequential awaits (the `$transaction` array form was destabilizing).
- **Shop component** (`src/components/game/Shop.tsx`): full shop view with gem/heart/freeze balance cards, item cards (emoji, name, description, cost, buy button with loading spinner), success/error toasts, "Como ganhar gemas" tips section with Bip mascot, affordable/disabled states, and sound feedback on purchase.
- **Home integration**: added a 3rd "Loja de Gemas" card to the home grid (achievements + playground + shop). The TopBar gems chip is now clickable to open the shop.
- **Verified end-to-end**: bought streak-freeze (gems 29→19, freezes 2→3), bought heart-refill (gems 19→14, hearts →5/5, toast "Vidas recarregadas! —5 💎"). Activity logged.

### 2. New Feature: Streak-freeze protection (functional)
- **`computeStreakState`** (`src/lib/game.ts`): now accepts a `freezes` count. When a day is missed and the learner owns ≥1 freeze, the streak is protected (continues incrementing) and `freezeConsumed: true` is returned — instead of resetting to 1.
- **Streak-touch + lesson-complete routes**: pass `learner.streak.freezes` to the computation; when `freezeConsumed`, decrement the freezes count and log a `streak_freeze_used` activity event.
- **ActivityFeed**: added `streak_freeze_used` type ("Congelamento usado — ofensiva protegida") with violet accent.
- **State API**: now returns `streak.freezes` so the UI can display owned freezes.

### 3. New Feature: Sound quick-toggle in TopBar
- Added a Volume2/VolumeX button to the TopBar that toggles the `sound` setting inline (no need to visit Profile). Respects the existing `useSound` hook which checks the setting.

### 4. Styling polish
- **TopBar responsiveness**: tightened gaps/padding for mobile (`gap-1 sm:gap-1.5`, `px-3 py-2 sm:px-4 sm:py-2.5`), shorter name truncation on mobile.
- **Home grid**: achievements + playground + shop cards now use `lg:grid-cols-3` for a balanced 3-column layout on desktop.
- **cozy-card utility**: applied to Shop balance cards and tips section for consistent styling.

## Verification Results
- **Shop purchase (streak-freeze)**: gems 29→19, freezes 2→3, activity logged. ✓
- **Shop purchase (heart-refill)**: gems 19→14, hearts →5/5, toast "Vidas recarregadas! —5 💎". ✓
- **Sound quick-toggle**: button renders in TopBar, toggles sound setting. ✓
- **Streak-freeze logic**: `computeStreakState` returns `freezeConsumed` when protecting; routes decrement freezes + log event. ✓
- **Lint**: clean (0 errors). ✓
- **VLM review**: Shop rated 7/10 — functional with good structure.
- **No browser console errors** during the shop flow.

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions (environment-level process reaping, not a code crash). Within a single Bash session, all features work perfectly. The `start-services.sh` script uses `setsid+exec` for maximum detachment. If the preview shows only the Z.ai logo, run `bash /home/z/my-project/start-services.sh`.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **VLM noted**: the "Como Ganhar Gemas" tips section could be visually separated from store items; owned freeze count could show on the item card. Low priority.

## Priority Recommendations for Next Phase
1. Add **owned-count badge** on the streak-freeze shop item (VLM suggestion).
2. Add **sticky/collapsible section headers** for the achievements list.
3. Expand the **curriculum** with more lessons (image-generation content).
4. Add **weekly league reset** logic (promote/demote based on standings).
5. Consider **streaming** the playground response for snappier feel.
6. Add a **daily challenge** feature (bonus gems for completing a specific lesson each day).

---
Task ID: 6
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (Daily Challenge, shop polish, collapsible achievements) + styling.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start (next had died cross-session, restarted via start-services.sh).
- QA via agent-browser confirmed the app loads cleanly with no console/hydration errors.
- VLM review of home/shop/achievements flagged: flat cards, shop lacks premium feel, achievements scroll fatigue, low-contrast secondary text.
- App is stable — focused on new features + polish this round.

## Completed Modifications

### 1. New Feature: Daily Challenge
- **Schema**: added `DailyChallenge` model (one row per learner: lessonId, assignedAt, completed, completedAt, dayKey). Pushed schema + regenerated Prisma client.
- **Helper** (`src/lib/daily-challenge.ts`): `getDailyChallenge()` assigns/rotates a daily lesson based on the day key (YYYY-MM-DD). Picks from unlocked, not-yet-completed lessons using a deterministic hash of the day for variety. `completeDailyChallenge(lessonId)` awards 5 bonus gems when the assigned lesson is completed. `DAILY_CHALLENGE_REWARD = 5`.
- **API** (`GET /api/daily-challenge`): returns the current challenge state with lesson title, module info, accent, completion status, and reward.
- **Integration**: lesson-complete route calls `completeDailyChallenge` and returns `dailyChallengeAwarded` + `dailyChallengeGems`. Store's `submitLesson` refreshes the daily challenge after completion. Bootstrap loads it on app open.
- **UI** (`DailyChallengeCard.tsx`): a prominent card on the Home page showing the day's highlighted lesson with module icon, reward (5💎), an "Iniciar" button (starts the lesson), and a shimmer sweep for incomplete challenges. When completed, shows "DESAFIO CONCLUÍDO" + "✦ Volte amanhã para um novo desafio!".
- **LessonComplete**: added a bonus banner "🎯 Desafio do dia completo! +5 💎 bônus" when the daily challenge is awarded.
- **ActivityFeed**: added `daily_challenge` type ("Desafio do dia completo") with teal accent.
- **Verified end-to-end**: daily challenge was "Treino vs. Uso" → completed it → `dailyChallengeAwarded=true`, `dailyChallengeGems=5`, gems 14→31 (incl. lesson + achievement rewards), activity logged "daily_challenge: Desafio diário completo", home card switched to "DESAFIO CONCLUÍDO".

### 2. Shop polish
- **Owned-count badge**: the streak-freeze item now shows a teal badge with the owned count on the emoji medallion (e.g. "3" when 3 freezes owned).
- **Shimmer on buy buttons**: enabled buy buttons now have a diagonal shimmer sweep animation (premium feel).
- **VLM rated 8/10** — the owned-count badge is "clearly visible and effective for inventory tracking".

### 3. Collapsible achievement categories
- **Achievements view**: each category section (Início, Trilha, Ofensivas, Explorador, Mestre) is now a collapsible card with a toggle button showing the unlock count (e.g. "INÍCIO DA JORNADA 2/2"). Animated expand/collapse via framer-motion `AnimatePresence`. Default open.
- **VLM rated 8/10** — "collapsible sections with counts are very clear and immediately convey progress status".

### 4. Styling polish
- Daily challenge card with shimmer sweep + floating icon + accent border.
- LessonComplete daily-challenge bonus banner with spring animation.

## Verification Results
- **Daily challenge assignment**: API returns the correct lesson for the day. ✓
- **Daily challenge completion**: completing the assigned lesson awards 5 bonus gems, marks challenge completed, logs activity. ✓ (gems 14→31, dailyChallengeAwarded=true)
- **Home daily challenge card**: shows "DESAFIO DO DIA" with Iniciar button; switches to "DESAFIO CONCLUÍDO" after completion. ✓
- **Shop owned-count badge**: visible on the streak-freeze item. ✓
- **Shop shimmer buttons**: animated sweep on enabled buy buttons. ✓
- **Collapsible achievements**: categories toggle with counts, animated. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM ratings**: Home with daily challenge 8/10, Shop 8/10, Achievements 8/10. ✓

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions (environment-level process reaping). Within a single session, all features work perfectly. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **VLM noted**: bottom nav slightly overlaps achievements content on mobile; locked achievement cards could use more visual distinction. Low priority.

## Priority Recommendations for Next Phase
1. Add **weekly league reset** logic (promote/demote based on standings).
2. Expand the **curriculum** with more lessons (image-generation content).
3. Consider **streaming** the playground response for snappier feel.
4. Add a **streak milestone celebration** (e.g., 7-day, 30-day animations).
5. Add **lesson search/filter** on the path view.
6. Add a **leaderboard promotion/demotion preview** (show what's needed to promote).

---
Task ID: 7
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (streak milestones, leaderboard promotion preview, lesson search) + styling polish.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly with no console/hydration errors.
- VLM review of home/path/league: Home 7.5/10, Path 8/10, League 8.5/10 — app is stable and polished.
- VLM flagged: home information density, card border inconsistency, need for more micro-interactions.
- Focused on 3 new features + styling polish this round.

## Completed Modifications

### 1. New Feature: Streak Milestone Celebrations
- **Component** (`StreakMilestone.tsx`): a full-screen animated overlay that triggers when a streak milestone (3, 7, 14, 30, 50, 100 days) is reached. Includes confetti (120 pieces), a big emoji with rotating conic-gradient ring, the milestone title/subtitle, streak count, gem reward, Bip mascot, and a "Continuar jornada" button. Uses `localStorage` to track which milestones have been shown (so it only fires once per milestone).
- **Milestone definitions**: 6 milestones with escalating rewards (3→8💎, 7→20💎, 14→40💎, 30→100💎, 50→150💎, 100→300💎) and cozy cyberpunk titles ("Trinca de Dados!", "Semana Perfeita!", "Quinzena Quântica!", "Mês do Protocolo!", "Cinquenta Ciclos!", "Centena Lendária!").
- **API** (`POST /api/streak/milestone`): verifies the streak reached the milestone, checks if already claimed (via activity log), awards gems, logs a `streak_milestone` activity event. Returns `{ ok, milestone, gemsGained }`.
- **Integration**: overlay calls the API on dismiss to claim the reward, then refreshes state + activity. Wired into the page alongside AchievementToasts.
- **ActivityFeed**: added `streak_milestone` type ("Marco de ofensiva: X dias") with amber accent.
- **Verified end-to-end**: set streak to 3 → overlay appeared with "Trinca de Dados!" → dismissed → gems 31→39 (+8 bonus), activity logged "streak_milestone: 3". VLM rated 8/10 — "highly celebratory with excellent clarity and emotional resonance."

### 2. New Feature: Leaderboard Promotion/Demotion Preview
- **PromotionPreview component** (in `Leaderboard.tsx`): a card below the "Sua posição" summary showing the learner's zone status:
  - **Promotion zone**: "Você está na zona de promoção! ✦" (teal)
  - **Safe zone**: "Faltam X XP para subir" (teal, shows XP needed to reach promote zone)
  - **Demotion zone**: "Faltam X XP para escapar" (rose, shows XP needed to escape demotion)
- Computes the XP gap by comparing to the standings at the promote/demote boundary ranks.
- **Verified**: learner at rank 2 (in promote zone, top 3) sees "ZONA DE PROMOÇÃO" + "Você está na zona de promoção! ✦". VLM rated League 9/10 — "excellent; provides immediate, motivating feedback."

### 3. New Feature: Lesson Search/Filter on Path
- **Search bar** added to the SkillPath view with a Search icon, placeholder "Buscar lição ou módulo...", and a clear (X) button.
- **Filtering logic**: filters modules + lessons by title (case-insensitive). Empty modules are hidden. Shows "Nenhuma lição encontrada" empty state.
- **Verified**: typing "prompt" filters down to show only "Prompt de imagem avançado". VLM rated Path 8/10 — "clear, well-placed, and essential for navigating the long skill tree."

### 4. Styling polish
- Streak milestone overlay with confetti, rotating conic-gradient ring, spring animations, flickering flame.
- Promotion preview with color-coded zones (teal for promotion, rose for demotion).
- Search bar with neon-teal focus ring.
- Fixed `set-state-in-effect` lint error in StreakMilestone (deferred to `queueMicrotask`).

## Verification Results
- **Streak milestone overlay**: appears at 3-day streak, "Trinca de Dados!", +8 gems claimed on dismiss, activity logged. ✓
- **Milestone API**: rejects invalid/unreached milestones, rejects double-claims, awards correct gems. ✓
- **Leaderboard promotion preview**: shows correct zone status + XP needed. ✓
- **Path search**: filters lessons/modules by title, clear button works, empty state shows. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM ratings**: Path (search) 8/10, League (promotion) 9/10, Milestone overlay 8/10. ✓

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Within a single session, all features work perfectly. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **VLM noted**: milestone reward button could use a pulse animation; Bip avatar could have a "level-up" sparkle. Low priority.

## Priority Recommendations for Next Phase
1. Add **weekly league reset** logic (actually promote/demote based on standings at week end).
2. Expand the **curriculum** with more lessons (image-generation content).
3. Consider **streaming** the playground response for snappier feel.
4. Add a **"streak freeze auto-consume" notification** when a freeze protects a streak.
5. Add **lesson difficulty indicators** on the path view.
6. Add a **profile stats dashboard** (total lessons, avg accuracy, time spent).

---
Task ID: 8
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (profile stats dashboard, progress ring, activity grouping) + styling polish.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly (one stale HMR "unrecoverable error" warning that cleared on reload).
- VLM review of home/profile: Home 7.5/10, Profile 7.0/10 — flagged flat timeline, missing stats, lack of visual progression hook.
- Focused on profile enhancement + styling polish this round.

## Completed Modifications

### 1. New Feature: Profile Stats Dashboard
- **API** (`GET /api/stats`): aggregates learner statistics — completedLessons/totalLessons, avgAccuracy (from stars), totalStars/maxStars, bestStreak, currentStreak, totalXp, practiceCount, playgroundCount, achievementsUnlocked, gems, league.
- **Store**: added `stats: LearnerStats | null` state + `refreshStats` action. Profile loads stats on mount via `useEffect`.
- **UI**: a new "ESTATÍSTICAS" section in the Profile with a 2×3 grid of StatTile cards (Precisão média, Recorde de ofensiva, Práticas, Conversas IA, Conquistas, XP total) — each with an icon, value, and sub-label.
- **Verified**: API returns correct data (3/12 lessons, 89% accuracy, 8/9 stars, best streak 3, 2 practices, 1 playground thread, 5 achievements, 136 XP).

### 2. New Feature: Animated Progress Ring
- **ProgressRing component** (`ProgressRing.tsx`): a reusable SVG circular progress ring with animated stroke-dashoffset (framer-motion), configurable size/strokeWidth/accent color, and center content slot. Glows with the accent color via drop-shadow.
- **Profile header**: replaced the plain Bip avatar header with a progress ring showing the league emoji + completion percentage in the center, alongside the learner name, league, XP, and "Faltam X XP para subir" hint.
- **VLM noted**: "progress ring is visually striking and immediately communicates the level completion."

### 3. New Feature: Activity Timeline Grouping
- **ActivityFeed**: items are now grouped by day with section headers ("Hoje", "Ontem", or a date label). Each group has a bold uppercase header and its items nested below.
- Reduces the "wall of text" effect and makes recent activity scannable.

### 4. Styling polish
- StatTile component with hover border transition.
- Progress ring with neon glow + spring animation.
- Day-group headers in the timeline.
- Profile header layout improved (horizontal ring + info).

## Verification Results
- **Stats API**: returns correct aggregate data (3/12, 89%, 8/9★, streak 3, etc.). ✓
- **Progress ring**: renders with league emoji + percentage, animates on mount. ✓
- **Stats dashboard**: 6 StatTiles render with correct values. ✓
- **Activity grouping**: items grouped under "HOJE" header. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM rated Profile 9/10** (up from 7.0) — "a polished, feature-rich profile that successfully gamifies user engagement."

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Within a single session, all features work perfectly. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **VLM noted**: the activity list could benefit from a "Load More" button to reduce initial scroll length. Low priority.

## Priority Recommendations for Next Phase
1. Add **weekly league reset** logic (actually promote/demote based on standings at week end).
2. Expand the **curriculum** with more lessons (image-generation content).
3. Consider **streaming** the playground response for snappier feel.
4. Add a **"Load More" pagination** to the activity timeline.
5. Add **lesson difficulty indicators** on the path view.
6. Add a **streak freeze auto-consume notification** when a freeze protects a streak.

---
Task ID: 9
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (module progress bars, lesson difficulty, Continue FAB, freeze indicator) + styling polish.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly (one stale HMR warning that cleared on reload).
- VLM review of path view: 7/10 — flagged static visual feedback, weak tree connectivity, missing macro-progress, no difficulty indicators.
- Focused on path view enhancements + home freeze indicator this round.

## Completed Modifications

### 1. Module Progress Bars on Path
- Each module header now shows a completion count badge (e.g. "3/3") and a thin neon gradient progress bar that animates on scroll into view (`whileInView`).
- The bar uses the module's accent color → magenta gradient, providing at-a-glance macro-progress per module.

### 2. Lesson Difficulty Indicators
- Each non-completed lesson node now shows difficulty dots next to the XP value: 1 dot for 15 XP lessons (Suave), 2 dots for 20 XP lessons (Média). Uses the module's accent color for filled dots.
- Tooltip shows "Dificuldade Suave" or "Dificuldade Média".

### 3. Floating "Continue" FAB on Path
- A `ContinueFab` component — a fixed, pulsing CTA button at the bottom of the path view that shows the current (next incomplete unlocked) lesson title with a play icon. Clicking it starts the lesson directly.
- Uses `animate-cta-pulse` for a breathing glow. Hidden when no current lesson or when hearts are depleted.

### 4. Streak Freeze Indicator on Home
- The home streak banner now shows an owned-freezes badge (snowflake icon + count) next to the streak banner when the learner owns ≥1 freeze. Teal accent, with a tooltip "Congelamentos de ofensiva disponíveis".
- Makes the freeze protection visible and motivates purchasing more from the shop.

## Verification Results
- **Module progress bars**: VLM confirmed "Yes" — visible under each module header. ✓
- **Difficulty dots**: VLM confirmed "Yes" — visible next to XP on lesson nodes. ✓
- **Module completion counts**: VLM confirmed "Yes" — e.g. "3/3". ✓
- **Continue FAB**: VLM confirmed present (floating button with current lesson). ✓
- **Freeze indicator**: home shows "3" freezes next to streak banner. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM rated Path 9/10** (up from 7/10).

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **VLM noted**: the Continue FAB appears mid-screen rather than strictly at the bottom on some viewports. Low priority.

## Priority Recommendations for Next Phase
1. Add **weekly league reset** logic (actually promote/demote based on standings at week end).
2. Expand the **curriculum** with more lessons (image-generation content).
3. Consider **streaming** the playground response for snappier feel.
4. Add a **"Load More" pagination** to the activity timeline.
5. Add **animated path connector** (glowing circuit trace between nodes).
6. Add a **streak freeze auto-consume toast** when a freeze protects a streak (transient notification).

---
Task ID: 10
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (Module 5 curriculum expansion, freeze toast, unique icon) + styling.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly with no errors.
- VLM review of path: 9/10 — stable and polished. VLM noted Module 5 should have a unique icon (was using Module 1's brain icon).
- Focused on curriculum expansion + freeze notification + icon fix this round.

## Completed Modifications

### 1. New Feature: Module 5 — "IA na Prática" (curriculum expansion)
- Added a 5th module with 3 new lessons (9 new exercises) covering practical AI use in professional contexts:
  - **IA para Marketing**: using AI as a creative intern for campaigns, the strategy→generation→selection→humanization→publishing flow.
  - **IA para Advogados**: safe uses (summarizing, simplifying) vs risky uses (unverified citations, unrevised clauses), with a swipe exercise distinguishing safe/ risky.
  - **IA para Educadores**: AI as a multiplier not a substitute, the "professors who use AI will replace those who don't" insight.
- Updated the `mestre-protocolo` achievement to require 15 lessons (was 12).
- Added a new achievement "Compilador Profissional" (💼) for completing Module 5.
- Updated `evaluateAchievements` to check for `ia-na-pratica` module completion.
- Re-seeded the database — now 5 modules × 3 lessons = 15 lessons total.
- **Verified**: curriculum API returns 5 modules; path view shows "IA na Prática" with "IA para Marketing" lesson (+20 XP).

### 2. New Feature: Streak Freeze Auto-Consume Toast
- **State API**: added `recentFreezeUsed` boolean — checks for a `streak_freeze_used` activity log entry within the last 5 minutes.
- **Store**: added `recentFreezeUsed` + `freezeToastDismissed` state. `refreshState` captures the flag and resets the dismiss flag when a new freeze is detected.
- **FreezeToast component**: a shimmering teal toast that appears when a freeze protected the streak — "Ofensiva protegida! Um Congelamento protegeu sua ofensiva! 🧊". Auto-dismisses after 8s, plays the achievement sound, has a dismiss button.
- Wired into the page alongside AchievementToasts and StreakMilestoneOverlay.

### 3. Unique Module 5 Icon
- Generated a unique icon for Module 5 (`/art/module-practice.png`) — a glowing briefcase made of circuit patterns with a gear and wrench, in warm amber/teal neon. Distinct from Module 1's brain icon.
- Updated the curriculum to use the new icon. Re-seeded.

## Verification Results
- **Module 5 curriculum**: API returns 5 modules (15 lessons); path view shows "IA na Prática" with all 3 lessons. ✓
- **Unique icon**: Module 5 now uses `/art/module-practice.png` (briefcase), distinct from Module 1. ✓
- **Freeze toast**: component created and wired into page; state API exposes `recentFreezeUsed`. ✓
- **New achievement**: "Compilador Profissional" added for Module 5 completion. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM rated Path 9/10** — "visually consistent, correctly adopting the golden/amber color scheme."

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **Freeze toast**: not yet triggered in testing (requires a real missed-day + freeze scenario). The logic is in place but the toast hasn't been visually verified end-to-end.

## Priority Recommendations for Next Phase
1. Add **weekly league reset** logic (actually promote/demote based on standings at week end).
2. Consider **streaming** the playground response for snappier feel.
3. Add a **"Load More" pagination** to the activity timeline.
4. Add **animated path connector** (glowing circuit trace between nodes).
5. Test the **freeze toast** end-to-end by simulating a missed day with an owned freeze.
6. Add **lesson previews** on locked node tap (holographic tooltip).

---
Task ID: 11
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (weekly league reset, activity Load More, league reset toast) + styling.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly with no errors.
- League standings verified: 7 NPCs with XP, league ladder, promotion preview all working.
- Focused on the top 2 priority recommendations: weekly league reset + activity Load More.

## Completed Modifications

### 1. New Feature: Weekly League Reset Logic
- **Schema**: added `lastLeagueReset DateTime?` to the Streak model to track when the last weekly reset was applied. Pushed schema + regenerated Prisma client.
- **Helper** (`src/lib/league-reset.ts`): `checkAndApplyLeagueReset()` runs lazily on every state API call. Uses ISO week keys to determine if a reset is needed. On reset:
  - Fetches all learners in the same league tier, sorted by leagueXp desc.
  - Top 3 promote to the next league; bottom 3 demote to the previous league (if not at the boundaries).
  - Resets leagueXp to 0 and weeklyXp to 0.
  - Logs a `league_promotion`, `league_demotion`, or `league_reset` activity event.
  - First-time reset (no previous reset) just sets the timestamp without promote/demote.
- **State API**: calls `checkAndApplyLeagueReset()` before returning state. Includes a `leagueReset` field in the response when a reset occurred (with promoted/demoted/oldLeague/newLeague).
- **LeagueResetToast component**: a shimmering toast that appears on league reset — teal for promotion ("Você subiu de liga!"), rose for demotion. Shows old→new league transition with emojis. Auto-dismisses after 9s with sound.
- **Store**: added `leagueReset` state, captured in `refreshState`.
- **ActivityFeed**: added `league_promotion`, `league_demotion`, `league_reset` activity types.
- **Verified**: state API returns `leagueReset=None` (first reset, no promote/demote). Activity log shows "Liga reiniciada semanalmente". leagueXp reset to 0.

### 2. New Feature: Activity Timeline Load More Pagination
- **API** (`GET /api/activity`): now supports cursor-based pagination via `?cursor=<iso>&limit=<n>`. Returns `{ activity, hasMore, nextCursor }`. Fetches `limit+1` items to determine if there's a next page.
- **ActivityFeed**: added local `hasMore`/`nextCursor`/`loadingMore` state. A "Ver atividade anterior" button appears when `hasMore` is true. Clicking it fetches the next page and appends to the store's activity. Shows a loading spinner during fetch.
- **Verified**: API returns 10 items with `hasMore=True`; clicking "Ver atividade anterior" loads 10 more (total 20 rows). Button persists for further pages.

### 3. Styling polish
- LeagueResetToast with shimmer sweep, spring animation, color-coded by promotion/demotion.
- Load More button with hover state (teal border) and loading spinner.

## Verification Results
- **League reset**: runs on state API call; first reset logged as "Liga reiniciada semanalmente"; leagueXp reset to 0. ✓
- **LeagueResetToast**: component created and wired into page. ✓
- **Activity Load More**: API returns `hasMore`/`nextCursor`; button appears; clicking loads 10 more items (10→20). ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **League reset toast**: not yet visually triggered (requires a real week-change with promotion/demotion). The logic is in place.
5. **Freeze toast**: still not visually verified end-to-end (requires a real missed-day + freeze scenario).

## Priority Recommendations for Next Phase
1. Consider **streaming** the playground response for snappier feel.
2. Add **animated path connector** (glowing circuit trace between nodes).
3. Add **lesson previews** on locked node tap (holographic tooltip).
4. Test the **league reset toast** end-to-end by simulating a week change with promotion.
5. Add **lesson difficulty indicators** refinement (3-level system).
6. Add a **profile achievements preview** grid (showing recent badges).

---
Task ID: 12
Agent: cron-review (webDevReview)
Task: QA the current build, fix bugs, and advance with new features (profile achievements preview, animated path connector, timeline color borders) + styling.

## Current Project Status Assessment
- Both services (Next via node on :3000, mini-service on :3001) were alive at round start.
- QA via agent-browser confirmed the app loads cleanly with no errors.
- VLM review of profile: 7.5/10 — flagged missing achievements preview, static presentation, timeline all looking identical.
- Focused on 3 new features + styling polish this round.

## Completed Modifications

### 1. New Feature: Profile Achievements Preview Grid
- **AchievementsPreview component** (in `Profile.tsx`): a new "CONQUISTAS RECENTES" section showing up to 8 unlocked badges in a horizontal scroll. Each badge is a circular emoji medallion with the title below. Includes a "Ver todas (X/Y)" link to the full achievements page, a locked teaser badge (🔒 ???) if there are more to unlock, and an empty state for new learners.
- **Profile integration**: added `refreshAchievements` to the Profile's mount useEffect so achievements load on profile view.
- **Verified**: shows "CONQUISTAS RECENTES" with "Ver todas (6/13)" and 6 unlocked badges (🌱🧭🔥💼 etc.). VLM rated 8/10.

### 2. New Feature: Animated Path Connector (Glowing Circuit Trace)
- Upgraded the SkillPath's winding connector line from a static dashed line to a **glowing animated circuit trace**:
  - Base dashed line (dim) for all modules.
  - Glowing overlay (neon gradient + drop-shadow + `dash-flow` animation) for unlocked modules only.
  - `dash-flow` keyframe animates `stroke-dashoffset` for a flowing data-packet effect.
  - Per-module SVG gradient definition (`path-grad-{slug}`).
- **Verified**: VLM rated Path 9/10 — "a standout feature; effectively visualizes the learning journey, making progression feel tangible."

### 3. New Feature: Timeline Color-Coded Left Borders
- Each ActivityRow now has a colored left border (3px) based on the activity type:
  - Amber for `lesson_complete`
  - Teal for `practice`, `daily_challenge`, `league_promotion`
  - Magenta for `achievement`, `streak_milestone`
  - Rose for `heart_lost`, `league_demotion`
  - Default border for others
- Makes the timeline scannable at a glance — different activity types are visually distinct.

### 4. Styling polish
- `dash-flow` keyframe added to globals.css for the animated path connector.
- Achievements preview with horizontal scroll + cozy scrollbar.
- Color-coded timeline borders.

## Verification Results
- **Profile achievements preview**: shows 6/13 badges with "Ver todas" link. ✓
- **Animated path connector**: glowing animated trace on unlocked modules. ✓
- **Timeline color borders**: different colors per activity type. ✓
- **Lint**: clean (0 errors). ✓
- **Both services stable** within the session. ✓
- **VLM ratings**: Profile 8/10, Path 9/10. ✓

## Unresolved Issues / Risks
1. **Dev server cross-session instability**: the `node`-based Next dev server dies between separate Bash tool sessions. Run `bash /home/z/my-project/start-services.sh` if the preview needs restarting.
2. **Mini-service (port 3001) must be running** for the Playground chat.
3. **Preview via port 81** (gateway) for the Playground's `?XTransformPort=3001` routing.
4. **League reset toast** and **freeze toast**: logic in place but not yet visually triggered (require specific scenarios).

## Priority Recommendations for Next Phase
1. Consider **streaming** the playground response for snappier feel.
2. Add **lesson preview tooltip** on locked node tap (holographic preview).
3. Test the **league reset toast** end-to-end by simulating a week change with promotion.
4. Add **XP counter animation** (rolling number on profile/lesson complete).
5. Add **collapsible profile sections** (VLM suggested accordion-style).
6. Add a **share card** feature (let users share their level/rank).

---
Task ID: 13
Agent: dsh-session (k3-256k)
Task: Nova trilha de ensino (engenharia de agentes) + workflow permanente de exemplo, testado de verdade.

## Completed Modifications

### 1. Nova trilha: Módulos 6-9 (11 lições, 44 exercícios)
- **Módulo 6 — Por Dentro da Máquina** (teal, /art/bip-thinking.png): Fundamentos de LLMs (tokens, janela de contexto, tool calling), Harness (Claude Code, Codex, OpenCode = modelo + contexto + execução, loop agêntico), Prompt Engineering (Contexto+Tarefa+Formato+Restrições).
- **Módulo 7 — Contexto & Specs** (amber, /art/module-prompt.png): Context Engineering (seleção de arquivos/regras/memórias, relevância > volume), PRD e Specs (ideia vaga → critérios de aceite testáveis), Execução guiada (Plan Mode, Build Mode, validações automáticas).
- **Módulo 8 — Esquadrão de Agentes** (magenta, /art/odaiba-shrine.png): agentes e subagentes (delegar com escopo claro + resultado verificável), MCP/ACP/Skills (conectar ferramentas, dados e comportamentos reutilizáveis), Loop Engineering (implementar → validar → diagnosticar → corrigir, critério de parada).
- **Módulo 9 — O Protocolo Final** (rose, /art/bip-happy.png): capstone com o passo a passo numerado (1-8) do workflow permanente + lição de caso real (feature de vidas que recarregam, do PRD aos ativos permanentes).
- Conteúdo autorado por 4 subagentes em paralelo com spec de formato rigorosa; validado por import real (26 lições, 92 exercícios totais, 92 IDs únicos) e tsc --strict limpo.
- Conquistas: 4 novos selos de módulo (Abridor de Capô, Curador de Contexto, Comandante de Esquadrão, Guardião do Protocolo) + evaluateAchievements atualizado; Mestre do Protocolo agora exige 26 lições.
- Banco: inserção ADITIVA no SQLite (ids mod-*/les-*), sem wipe — progresso do learner preservado; JSON de exercícios validado linha a linha.

### 2. Workflow permanente de exemplo — workflows/feature-loop/
- feature-loop.workflow.js: orquestra SPEC (Product) -> PLAN (Architect) -> BUILD (Implementer) -> VALIDATE (QA executa node --test de verdade) -> REVIEW (Reviewer) -> LOOP de correção (máx. 3 iterações, critério de parada objetivo) -> ATIVOS.
- Caso de uso real: "sistema de vidas que recarrega sozinho" (1 vida/30min, teto 5, 0 vidas bloqueia) — a mesma feature usada na lição capstone.

### 3. Autoteste executado (workflows/feature-loop/TEST-REPORT.md)
- Run #1 produziu SPEC.md (RF1-RF8, 15 critérios), PLAN.md, hearts.js (9 exports, CommonJS puro, determinístico) e hearts.test.js.
- Verificação independente: 17/17 testes verdes.
- Run #2 (VALIDATE+REVIEW): QA verde, mas Reviewer REPROVOU com achado real — critério CA-13 (0 vidas -> +30min -> desbloqueio) sem teste.
- Run #3 (LOOP): Fixer aplicou correção cirúrgica (teste T17), QA 18/18, Reviewer aprovou. Loop convergiu com critério objetivo.
- Bug do próprio workflow encontrado e corrigido no teste: 'node --test <dir>' falha no Node 24/Windows; QA agora roda 'node --test' de dentro do diretório alvo.

## Verification Results
- curriculum.ts + achievements.ts: tsc --strict --noEmit exit 0. OK
- SQLite: 9 módulos / 26 lições; LessonProgress intacto. OK
- Workflow: 4 artefatos gerados por agentes, 18/18 testes, review aprovado. OK

## Unresolved Issues / Risks
1. O workflow completo excede o teto de 10 min do executor em uma única chamada — foi testado em 3 runs encadeados (mesmas fases/contratos). Em ambientes sem teto, roda direto.
2. Ícones dos módulos 6-9 reutilizam arte existente (geração de imagem via z-ai CLI indisponível nesta máquina).
3. App não foi executado localmente (deps não instaladas nesta cópia Windows); validação foi estática (tsc + import + banco).

