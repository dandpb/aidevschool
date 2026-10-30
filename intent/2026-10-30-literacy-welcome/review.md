# Review and verification

Independent fresh-context review inspected the implementation against the intent/spec and `REVIEW.md`. It found and rechecked the corrected DOM order and simulated-exercise copy, and checked the Dev badge contrast. No remaining functional blocker was identified in that review; this is not a formal approval or countersign. Chromium with reduced motion passed keyboard entry, selection, back retention and repeated-click checks at 320, 375 and 1280 widths; axe WCAG 2/2.1 A/AA returned zero violations at these widths. At cycle 1, the button remained below the fold at 320×740; at 375×812 it ended at y=720. Cycle 2 subsequently corrected the 320px case.

Producer checks: `npm run lint` passed; `npm run build` passed with an existing bundle-size warning; `npm run test` passed 392 and skipped 1; focused Playwright suite (`welcome-briefing`, `onboarding-a11y`, `vertical-slice`, `reflow-320`) passed 11. At cycle 1 the full end-to-end suite was not run; the later cycle 3 run passed all 50 browser tests. The changed source was simplified and `git diff --check` passed. The local baseline and after captures and videos are under `/workspace/ux-evidence/`; remote production rendering was not verified because Chromium rejected the proxy certificate.

## Follow-up: narrow welcome

At 320×740 the test failed before the change at y=799.8 and passed afterward at y=737.1. Independent browser review confirmed the result and reported zero axe WCAG 2/2.1 A/AA violations at 320, 375 and 1280. A map shortcut was removed after review identified duplicated start events and broader navigation/write race risks; the prototype is not shipped or counted.

## Task artwork accessibility

Independent review confirmed that all three task choices have their label and guidance as the radio name without repeated artwork descriptions; keyboard selection worked. The named image role was verified in the intro and result, and axe WCAG 2/2.1 A/AA returned zero violations on those screens and the task-choice screen. The two resolved entries were removed from the axe baseline, making the gate stricter. A lesson-intro reorder was discarded because essential educational context would have moved below the action that leaves the screen.

Cycle 3 final verification: `npm run test:e2e` passed all 50 browser tests with one worker, including the axe ratchet, hosted/PWA flows and the new task-art test; `npm run lint` and `npm run build` passed. Unit suite before this last semantics-only change: 392 passed, 1 skipped.

## Map wayfinding

Independent browser review at 320/375/1280 verified keyboard focus and Tab to the original launcher, repeated activation with no `lesson_started` event or IndexedDB mutation, resumed IA and fresh Dev destinations, and zero axe WCAG 2/2.1 A/AA violations on the map. Review found that an initial fragment URL persisted misleadingly after navigation; the implementation was changed to focus and scroll without a fragment. A visible 3px focus outline and targeted test were added.

## CI font correction

The GitHub runner exposed a 320×740 failure at y=782.7 on 6b521e3d despite the previous local pass at y=737.1. The layout was compacted without shrinking the consent text or hiding content, and the proof was extended with a wider alternate font. Local CTA bottoms were y=671 (system), 693 (DejaVu Sans) and 714 (monospace); the four targeted browser checks and axe smoke passed. The new head needs CI to confirm the runner result. This is a correction to cycle 2, not another cycle.
