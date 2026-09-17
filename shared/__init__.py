"""Neutral home for cross-context primitives.

The root `shared/` package hosts the small primitives every context consumes —
errors, timestamps, and guarded filesystem writes — so no context imports
another context's internals for them. Precedent: `docs/TECH_DEBT_AUDIT_2026-07-08.md`
Phase 1 ("extract `fsio` to a top-level `shared/`").
"""
