/**
 * L3 crate TTL constant — the canonical value shared between the sim's level
 * config and the scene's TTL-decay visual window.
 *
 * Both call sites MUST read from this single export — the previous code
 * carried a literal `350` in two places, and one of them (the scene's
 * `decayScale` window) only had a comment ("matches L3 crateTtlMs") to
 * express the coupling. Importing the constant turns the cross-module link
 * into a compile-time edge that cannot silently drift.
 *
 * Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20.
 */

/** L3 crate TTL, in milliseconds. Drives both put-side expiry and the scene's
 *  pre-deadline visual scale ramp. */
export const L3_CRATE_TTL_MS = 350 as const
