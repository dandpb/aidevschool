# Plan

Reproduce a pre-write IndexedDB failure at the final action in Chromium; check that feedback remains and a deliberate retry succeeds. Do not transition local session to completed before persistence resolves and the parent accepts completion. Catch failure or rejected outcome, show an uncertainty-aware alert, and keep the completion control usable. Cover both initial and review failure paths with component tests and independent review, explicitly document uncertain post-commit retry effects. Run focused app and browser tests, lint/build and review.
