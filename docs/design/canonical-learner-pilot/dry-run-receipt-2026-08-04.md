# AID-10 fixture dry-run receipt — 2026-08-04

| Field | Receipt |
| --- | --- |
| Protocol | canonical learner pilot 1.0 |
| Repository revision | `dac40786ecabaf36eafbc22b2a1584f1809765e6` plus the uncommitted AID-10 protocol artifacts |
| Mission fixtures | IA Prática `l02` / content `2026-07-25.1`; Trilha Dev `game-02-warehouse` / content `game-02-warehouse@0.1.0` |
| Persona kind | automated fixture; no person and no personal data |
| Learner-session count | 0 |
| Real-user validation | not claimed |

## Attempts

1. The documented command could not start before dependencies were installed:
   `vitest: not found`.
2. `npm ci` inherited `omit=dev` from the environment and installed runtime
   packages only; the same command again returned `vitest: not found`.
3. `npm ci --include=dev` installed the lockfile's test dependencies. Running
   without an explicit test environment executed React's production build:
   5/7 files passed and 34/38 tests passed; four component tests failed with
   `TypeError: React.act is not a function`. This was a harness-mode failure, not
   an accepted journey result.
4. The protocol command was corrected to make the environment explicit:

```bash
NODE_ENV=test npm test -- src/progress/domain.test.ts \
  src/missions/recommendation.test.ts src/host/MissionShell.test.tsx \
  src/verification/evidenceIntake.test.ts \
  src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/evidenceIntakePersistence.test.ts \
  src/journey/ResultScreen.test.tsx
```

Result: **7 test files passed; 38 tests passed; exit 0**.

## What this proves

At this revision, the selected fixtures execute onboarding/track continuity,
Literacy and teaching-game intake, mission completion persistence, and visible
separation of local result from verification/mastery under the test harness.

It does not prove usability, comprehension by either audience, live engine
integration, performance, release readiness, or mastery. Those claims require
the ten consented sessions and independent synthesis acceptance defined by the
protocol.

## Producer and review state

- Producer: Founding Product Engineer, fixture run on 2026-08-04 UTC.
- Independent review: `/root/aid10_pilot_review` returned `ACCEPT` on 2026-08-04
  UTC after checking all protocol artifacts, link targets, threshold arithmetic,
  the 7-file/38-test bounded run, and `git diff --check`. The reviewer made no
  edits and remains distinct from the producer.
