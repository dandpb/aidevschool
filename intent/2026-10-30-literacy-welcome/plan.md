# Plan

Update `engines/literacyDojo/src/screens/OnboardingScreen.tsx` and its existing stylesheet to make a mission briefing the first-screen focal point, place consent adjacent to its action, retain Lumi, the village artwork and the Dev route. No new data or persistence. Check radio and step transition behavior using existing suites plus focused browser checks for action visibility, keyboard navigation, back/repeated interaction and reduced motion. Run literacy lint, tests and build; capture local before/after screenshots. Review against `REVIEW.md` in an independent context before representing the change as verified. Keep a cycle ledger with real results only.

Follow-up: compact only the welcome heading and spacing on narrow screens, testing the original failure at 320×740 before fixing it. Prove keyboard, responsive reflow and the existing end-to-end path; independently review the batch. The post-onboarding map shortcut was explored but deferred because its asynchronous launch path exposes a wider concurrency and stale-state risk.

The first lesson CTA is distant on narrow screens, but an attempted rearrangement placed learning context after the action. That prototype was discarded. The independent inspection exposed a task illustration ARIA defect; preserve its named illustration semantics and tighten the axe baseline after verifying the repaired screens.
