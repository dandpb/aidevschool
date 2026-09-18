# Semantic substrate seam — Verification

**Verdict**: PASS (round-1 gaps 1-3 closed; 12/12 proofs green at HEAD)
**Profile**: light
**Diff range**: c26d976..HEAD (076cebe, 5e1aaa9, 2ed9746)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: the fix's diff (`2ed9746`) plus every round-1 verdict that was not PASS
(gaps 1-3) and the non-blocking gitignore observation. Everything else carried
from 5e1aaa9; citations in `test_judgments.py` refreshed because the fix
touched that file (protocol, re-verify rules).

## Round-1 gaps re-judged

**Gap 1 — receipt record `kind` must be the primitive (`noul`|`choice`) — FIXED.**
`_write_ok_receipt` writes `"kind": question.get("type", sweep)` (`judgments.py:227`);
every question dict carries `type` at construction — `"noul"` (`judgments.py:324`,
pitfalls), `"choice"` (`judgments.py:403,412`, profile) — so the record is the
primitive on every reachable path. `_write_fallback_receipt` takes an explicit
`primitive` (`judgments.py:258`); all six call sites pass it: `"noul"` at
`judgments.py:316,359,363`, `"choice"` at `judgments.py:394,431,435`. The sweep
name lives only in the filename (`judgments.py:220,272`). Assertion:
`test_judgments.py:111` — `assert line["kind"] in {"noul", "choice"}` over every
ok line. Matches the design Receipt-home decision and task criterion 1. The
`kind`→`sweep` parameter rename changed no filename behavior round 1 had verified.

**Gap 2 — C9 must discriminate bloom against a differing parser baseline — FIXED.**
Canned `bloom_overall -> evaluate (0.95)` (`test_judgments.py:252-253`) against
parser baseline `analyze`: both axes now override a differing deterministic value
(dreyfus `competent` vs `proficient`, bloom `evaluate` vs `analyze`). Assertions:
`test_judgments.py:256-257` — `enriched["profile"]["dreyfus"] == "competent"`,
`enriched["profile"]["bloom"] == "evaluate"`; no-client clause asserts the parser
literals at the assertion site — `test_judgments.py:259-260` —
`plain["profile"]["dreyfus"] == "proficient"`, `plain["profile"]["bloom"] == "analyze"`
(no longer a fixture-built expected; round-1 weakness removed). Checklist C9 was
amended in the same commit to the corrected literals; the amendment matches
round-1 evidence — the task's `apply` literal was unreachable (parser bloom is
`analyze`), so this is a correction, not a renegotiation against the design.

**Gap 3 — C1 filename clause must match digest naming, asserted textually — FIXED.**
Checklist C1 now reads `learner/judgment_receipts/<sweep>-<input_digest[:16]>.ndjson`.
Assertion: `test_judgments.py:109` —
`assert _re.match(r"^(pitfalls|profile)-[0-9a-f]{16}\.ndjson$", path.name)` over
both written files.

**Non-blocking — receipts gitignored — ADDRESSED.** `.gitignore:177`
`learner/judgment_receipts/`; `git check-ignore -v learner/judgment_receipts/anything.ndjson`
matches the rule.

## Proofs (re-run in full at HEAD 2ed9746)

`python3 -m pytest learner/substrate/tests/test_judgments.py -v` — **12 passed in
2.60s**, each test listed individually as run+passed, `test_live_smoke_occurrences`
PASSED (ran live, not skipped). Proofs live on diff-touched code
(`judgments.py`, `test_judgments.py`, `dashboard_snapshot.py` all in range).

## Checks

C1 and C9 re-judged above. The rest carried from 5e1aaa9; `test_judgments.py`
line numbers refreshed to HEAD.

| Check | Claim | Proof run at HEAD | Evidence | Result |
|---|---|---|---|---|
| C1 | digest-named receipt per sweep, one JSON object per question, all provenance fields, `kind` primitive | `test_receipt_written_on_success` PASSED | `test_judgments.py:109` filename regex; `:111` `kind in {"noul","choice"}`; `:117-118` 64-char lowercase hex digest; `:104` `len(files)==2` | PASS |
| C2 | no client → no receipts, byte-identical (sorted-key) to regenerated golden | `test_no_client_is_byte_identical_to_golden` PASSED | `test_judgments.py:127` `receipt_files == []`; `:129-131` sorted-key JSON equality vs golden | PASS (carried, citations refreshed) |
| C3a | client raises → fallback values + fallback receipt with error class | `test_fallback_on_client_failure` PASSED | `test_judgments.py:143` sorted-key equality vs no-client build; `:146` `error_class == "HTTPError"` | PASS (carried, citations refreshed) |
| C3b | mismatched answer keys → fallback | `test_fallback_on_mismatched_answer_keys` PASSED | `test_judgments.py:156` equality vs baseline; `:158-160` `error_class == "JudgmentError"` | PASS (carried, citations refreshed) |
| C4 | key value never in any receipt | `test_key_never_in_receipt` PASSED | `test_judgments.py:171` `"sk-sentinel-do-not-leak" not in path.read_text()` | PASS (carried, citation refreshed) |
| C5 | `nextReviews` unchanged by enrichment | `test_next_reviews_unchanged_by_enrichment` PASSED | `test_judgments.py:179` `enriched["nextReviews"] == plain["nextReviews"]` | PASS (carried, citation refreshed) |
| C6 | 21 canned hits → `occurrences == 21`, `id`/`lastSeen` unchanged | `test_occurrences_count_semantic_hits` PASSED | `test_judgments.py:190-192` `== 21`, `id == "P-001"`, `lastSeen == "2026-06-18"` | PASS (carried, citations refreshed) |
| C7 | new repeating entry → +1 count, one more digest-named receipt; sub-threshold does not | `test_new_recurrence_updates_count_and_receipt` PASSED | `test_judgments.py:214` `== 22`; `:217` `len == files_before + 1` (unchanged sweep overwrites); `:220` back to `== 21` | PASS (carried, citations refreshed) |
| C8 | live run over repo journal → `occurrences >= 15` | `test_live_smoke_occurrences` PASSED (ran, not skipped) | `test_judgments.py:231` `http_client(os.environ["TYPESAFE_API_KEY"])`; `:237` `>= 15` | PASS (carried, citations refreshed) |
| C9 | canned choices override dreyfus AND bloom vs differing parser baseline; no client keeps parser values | `test_profile_choice_overrides` PASSED | `test_judgments.py:256-257` override literals; `:259-260` parser literals asserted in place | PASS — re-judged, gap 2 closed |
| C10 | PT-only cells: parser default `"competent"` kept; canned → `"proficient"` | `test_profile_portuguese_only_cells` PASSED | `test_judgments.py:268` `== "competent"`; `:276` `== "proficient"` | PASS (carried, citations refreshed) |
| C11 | `masteredCount == 2` from units_log; catalog status flip leaves it 2 | `test_mastered_count_from_units_log` PASSED | `test_judgments.py:286` `== 2`; `:295` after `scaffolded` → `✅ Implemented` still `== 2` | PASS (carried, citations refreshed) |

## Landing literal shapes (carried from 5e1aaa9)

Untouched by 2ed9746 except the receipt writers; re-read at HEAD for the touched
helper: filename `judgments.py:220` `f"{sweep}-{digest[:16]}.ndjson"`, fallback
`judgments.py:272` — matches the amended Landing row. Remaining rows unchanged
and carried: memoized `default_client()` (`judgments.py:164-173`), one client per
sync (`__init__.py:851,863`), injection-only `build_snapshot` (env reads only in
`default_client()`), `masteredCount` from units_log both branches
(`dashboard_snapshot.py:132,177`), scheduling boundary untouched
(`dashboard_snapshot.py:172`). Swept "existing" rows (authorization `.gitignore:44`
`.env`, concurrency `atomic_write_text` at `judgments.py:241,271`, retention
`RECEIPT_RETENTION = 30` pruned in-run) carried from 5e1aaa9; receipt-writer line
numbers refreshed.

## Binding sources (carried from 5e1aaa9)

Step 1 does not run under `light`. Round-1 contradictions resolved by 2ed9746:
the design/task `kind` (`noul`|`choice`) contradiction is closed (gap 1), and the
checklist C1/C9 text now agrees with the binding receipt shape. Still carried:
`.tasks` criterion 2's exit-code-0 clause appears in no proof (task-vs-checklist
divergence noted round 1; not a ranked gap).

## Faults injected

Skipped — step 4 does not run under `light` (carried from round 1).

## Gate

`python3 -m pytest learner/substrate/tests/test_judgments.py -v` — 12 passed, 0 failed (includes 1 live-API test)

## Remaining observations (non-blocking, ranked)

1. `judgments.py:227` — the `question.get("type", sweep)` default is unreachable
   today (all questions carry `type`), but a future sweep adding a question
   without `type` would silently regress the record `kind` to the sweep name;
   `question["type"]` would fail loudly.
2. Carried: C7's negative case uses 0.05 rather than the check's 0.2 (both below
   the 0.5 threshold, non-material).
3. Carried: `.tasks` criterion 2's exit-code-0 clause is in no proof.
4. Wording, carried: the Landing filename placeholder still reads `<kind>-` while
   code and amended C1 say sweep — round 1 accepted this reading; 2ed9746's
   variable rename (`kind`→`sweep`) makes the code honest without behavior change.
