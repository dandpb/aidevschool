# Pipeline write authority Verification

> Verificação histórica do commit 2f89358. A lacuna de saída CLI foi corrigida
> em 4abb418; a entrega consolidada tem verificação em
> [context-authority.verified.md](context-authority.verified.md).

**Verdict**: PASS — 7/7 checks proven with located evidence; ranked gaps below (none is a check-level failure; #1 is an uncovered binding-source surface found incidentally, step 1 does not run under `light`)
**Profile**: light (repo declares none; default) — steps 2, 3, 5 ran; step 1 (binding screens) and step 4 (fault injection) did NOT run, per profile
**Diff range**: d723f7b..2f89358 (feature commit 2f89358 = HEAD, single commit)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier); read-only except this file

## Binding sources

| Source | Opened | Contradiction | Uncovered |
|---|---|---|---|
| task `.tasks/pipeline-write-authority.md` | yes | none — all 7 criteria map 1:1 to C1–C7; closed enum (Decided row 2) implemented exactly (`pipeline_status.py:25-37`, 3 members); dual-truth model (Decided row 1) honored — openclaw still advances simulate, ADR-0002 not broken; Unresolved 1 default (provenance) is what shipped | Observable row 1: "`python3 -m engines.openclaw` output de avanço inclui grade/advanced_by (2, 4)" — CLI stdout (`__main__.py:134-161`) never prints grade/advanced_by; criteria 2/4 and checks assert YAML only. Gap #1 |
| ADR-0002 `docs/design/adr/0002-openclaw-role.md` | yes | none — openclaw remains simulate-grade tracer runner; rule 3 now documents simulate as legal-but-not-verifier-backed, which resolves (not contradicts) the ADR | - |
| `phaserunner.md:36-38` (checklist source) | yes — rule 3 at :38 names `grade` and the consumption rule; :53 names the PASS stamping contract | none | - |
| task States mermaid | yes — invariant checked (see below) | none | - |

Step 1 did not run beyond the States invariant mandated by the verifier brief; the Observable-row gap above was found incidentally, not by a systematic sweep.

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | legacy file loads with defaults; unknown grade fails loud naming valid set | pytest openclaw target, individually verified | `test_pipeline_status.py:80` `assert loaded.grade.value == "unspecified"` · `:81` `assert loaded.advanced_by == ""` · `:98` `assert "simulate" in str(exc) and "verified" in str(exc)` (raise branch `:99`); backing `pipeline_status.py:60,68-69,75` | PASS |
| C2 | Scheduler checklist advance stamps simulate/openclaw-checklist | same | `test_scheduler.py:223` `assert final.grade.value == "simulate", "checklist advances are simulate-grade"` · `:224` `assert final.advanced_by == "openclaw-checklist"`; code `scheduler.py:144-145` | PASS |
| C3 | supervisor advance stamps verified/mme-supervisor; planned digest == sha256 of saved file | pytest MME target, individually verified | `test_supervisor_autonomous.py:726` `assert pipeline["grade"] == "verified"` · `:727` `assert pipeline["advanced_by"] == "mme-supervisor"` · `:748` `assert authorized["resulting_pipeline_digest"] == saved_sha` where `saved_sha = sha256(workspace.pipeline.read_bytes())`; code `autonomous.py:232-233` (advance stamps), `:208-209` (planned stamps), `:201` `dump_status(status).encode("utf-8")` | PASS |
| C4 | CLI `--phase` override stamps simulate via stamped helper | pytest openclaw target | `test_cli_override.py:28` `assert "grade: simulate" in text` · `:29` `assert "advanced_by: openclaw-cli-override" in text` · `:31` `assert loaded.grade.value == "simulate"`; code `__main__.py:129-130` then `scheduler.write_status` → `save_status` | PASS |
| C5 | no serialization/write outside save_status/dump_status in the two scopes | grep reproduced by verifier + both suites | verifier ran `git grep -nE "yaml\.safe_dump\|atomic_write_text" -- engines/openclaw/__main__.py engines/miniMaxEvolutionEngine/supervisor/` → **0 hits** (exit 1); `safe_dump` in non-test engines code exists only at `pipeline_status.py:101` (inside `dump_status`); full suites 29+113 passed | PASS |
| C6 | after two sequential saves the file identifies the last writer | pytest openclaw target | `test_pipeline_status.py:118` `assert loaded.grade is Grade.VERIFIED` · `:119` `assert loaded.advanced_by == "mme-supervisor"` (two `save_status` calls at :109-116, second one MME-stamped) | PASS |
| C7 | phaserunner rule 3 names grade + consumption rule; os_adapter prints grade; `_PHASE_MAP` pinned (6 edges) | pytest both targets + grep | `test_phase_map_pinned.py:16` `assert _PHASE_MAP == {…6-entry literal dict…}` · `test_os_adapter.py:162-163` `assert "grade: verified" in out` / `assert "advanced_by: mme-supervisor" in out`; `git grep -c grade phaserunner.md` = 2 (`:38` rule 3, `:53` PASS step); `os_adapter.py:60` prints `grade:`/`advanced_by:` beside phase; `_PHASE_MAP` at `scheduler.py:32-39` (module level, 6 edges) | PASS |

## Coverage (recomputed from code, not read from the row)

| Set (size) | Members taken from code | Proof asserts each | Result |
|---|---|---|---|
| writers do pipeline (3) | 3 stamping sites: `scheduler.py:144-145` (checklist) · `__main__.py:129-130` (CLI override) · `autonomous.py:232-233` (supervisor; + planned `:208-209`). Only 2 physical write sites, both via `save_status` (`scheduler.py:70`, `autonomous.py:234`); no other write path (`write_text`/`write_bytes`/`atomic_write_text` sweep: only `_restore` `scheduler.py:106` and `save_status` `pipeline_status.py:119`). A 4th writer exists as prose contract (`phaserunner.md:53` `/devschool-<command>`) — prompt-level, covered by C7's doc constraint, not code-provable | C2 · C4 · C3 | match |
| valores de grade (3) | `Grade` enum `pipeline_status.py:25-37`: simulate/verified/unspecified, exactly the closed set | simulate C2+C4 · verified C3 · unspecified C1 (`:80`) | match |
| consumers do campo grade (2) | briefing surface = `briefing.sh:8` → `python3 -m …os_adapter` → `main()` `os_adapter.py:68-70` prints `prepare_workflow()` verbatim, so os_adapter/briefing is one code surface (`:60`); prose contract `phaserunner.md:38` | C7 (`test_os_adapter.py:162-163`) · C7 (grep = 2 lines) | match |
| arestas do `_PHASE_MAP` (6) | `scheduler.py:32-39`: SPEC→SPEC, SPEC_DONE→IMPL, IMPL_DONE→REVIEW, REVIEW_DONE→BENCHMARK, BENCHMARK_DONE→OPTIMIZE, CYCLE_COMPLETE→CYCLE_COMPLETE — 6 entries, no 7th | `test_phase_map_pinned.py:16-23` full-dict equality | match |
| serializações do status (2→1) | `yaml.safe_dump` only at `pipeline_status.py:101` inside `dump_status`; `save_status` calls it (`:121`); `_status_bytes` calls it (`autonomous.py:201`); C5 grep = 0 elsewhere | C3 digest test (`:748`) proves byte-exactness end-to-end | match |

## Swept `existing` rows read against code

- two-file rollback in `scheduler.step`: present — `scheduler.py:149-150` (mirror_before + pipeline_before), `:156-157` restore both.
- one transition per step / atomic rewrite: `step` at `scheduler.py:108`, single `next_status` write via `save_status` (`:70` → `pipeline_status.py:117-122` atomic).
- learning gate guard: `scheduler.py:77` `if gate.get("implementation_blocked"):`.
- supervisor authorization: `autonomous.py:220` (authorization filtered on exact digests incl. `resulting_pipeline_digest`), `:323` verifier PASS gate (`outcome.structured["verdict"] != "PASS"`), `:333` `advancement_authorized` event, `:334` `_compare_and_advance` only after. Checklist's ":325" is line-drift (actual :323); constraint exists — gap #2.

## States invariant (binding mermaid)

Phase enum `pipeline_status.py:17-22`: 6 values (spec, spec-done, impl-done, review-done, benchmark-done, cycle-complete) — **untouched by the diff** (feature diff's only +/- lines matching phase names are `UNSPECIFIED`/Grade additions). Mermaid nodes = exactly these 6; no Phase value added/removed. `_PHASE_MAP` moved verbatim from local (old `step` body) to module (`scheduler.py:32-39`), same 6 edges. Edges now carry provenance via the three stamping sites — machine unchanged, edges annotated. Invariant holds.

## Landing one-way doors

- Closed `Grade` StrEnum + rejection naming valid set: `pipeline_status.py:25-37`, `:60`, `:68`, `:70-77` — matches literal shape.
- Single serialization: `dump_status` `:94-107` exported; `save_status` = `atomic_write_text(yaml_path_for(path), dump_status(status))` `:117-122`; `autonomous._status_bytes` = `dump_status(planned).encode("utf-8")` `autonomous.py:195-201` — field-list duplication gone (C5 grep: 0 hits in supervisor/).

## Ranked gaps (non-blocking)

1. **Binding task Observable row 1 not implemented/unchecked**: `python3 -m engines.openclaw` advance output (`__main__.py:134-161`) prints phase/project but never `grade`/`advanced_by`; task decides "output de avanço inclui grade/advanced_by (2, 4)" while criteria 2/4 and C2/C4 assert YAML only. Found incidentally; a `ui`/`standard` round (step 1) would sweep systematically. Fix: print grade/advanced_by in the final-status block, or amend the task row.
2. **Citation drift in checklist Swept**: "verifier PASS (:325)" → actual `autonomous.py:323` (PASS gate), `:333-334` (authorize → advance). Constraint exists.
3. **Test-strength note (C1)**: reject-test's first clause is a disjunction (`test_pipeline_status.py:97` `"probably-fine" in str(exc) or "grade" in str(exc)`); the claim is settled by the second conjunct (`:98`, valid set named) — weak-first-clause only.

## Not run (profile light)

- Step 1 (binding screens enumeration): not run; only the States-invariant check mandated by the verifier brief was performed.
- Step 4 (fault injection): not run — no mutants injected, no kill claims.
- No `## Test policy` section in the checklist; nothing to judge under light.

## Gate

- `.venv-linux/bin/python -m pytest engines/openclaw/tests -p no:cacheprovider` — **29 passed, 0 failed** (C5 proof).
- `.venv-linux/bin/python -m pytest engines/miniMaxEvolutionEngine/tests -p no:cacheprovider` — **113 passed, 0 failed** (C5 proof).
- Same two targets with `-v -k "<9 named tests>"` — **6 + 3 passed, 0 failed**; every named test appears individually as PASSED (no filter-matched-nothing).
- `git grep -nE "yaml\.safe_dump|atomic_write_text" -- engines/openclaw/__main__.py engines/miniMaxEvolutionEngine/supervisor/` — **0 hits** (C5 grep, reproduced by verifier).
