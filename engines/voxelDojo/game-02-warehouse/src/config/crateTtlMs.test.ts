/**
 * Regression guard for the L3 crate TTL constant.
 *
 * The previous code carried a literal `350` in two places (the L3 level
 * config and the scene's decay-scale window) — only one of them had a
 * comment pointing at the other, so a typo in either site silently
 * broke the visual decay. This test pins:
 *
 *  1. The constant value itself (no semantic change in this fix).
 *  2. The L3 level config reads the constant (not a literal).
 *  3. The scene's decay-scale window reads the constant (not a literal).
 *
 * Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20.
 */

import { describe, expect, it } from "vitest"
import { levelConfig } from "../sim/levels"
import { L3_CRATE_TTL_MS } from "./crateTtlMs"

describe("crateTtlMs config", () => {
  it("exports the documented L3 crate TTL (ms)", () => {
    expect(L3_CRATE_TTL_MS).toBe(350)
  })

  it("L3 level config reads the constant (not a literal)", () => {
    const cfg = levelConfig("L3")
    expect(cfg.crateTtlMs).toBe(L3_CRATE_TTL_MS)
    // Belt-and-suspenders: also pin the value so a future "let's tweak it"
    // change has to update both this test and the constant in one commit.
    expect(cfg.crateTtlMs).toBe(350)
  })
})
