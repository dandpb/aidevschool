# Metric-rubric-lint Verification

**Verdict**: PASS
**Profile**: light (no tlc-implement profile in AGENTS.md) — step 1 (checklist vs binding sources, `ui`) skipped; step 4 (fault injection, `standard`/`ui`) skipped; steps 2, 3, 5 run in full
**Diff range**: 36f2543..f847d2d (HEAD)
**Round**: 2 - scoped
**Scope**: fix diff `f847d2d` (simplify-review round) plus everything it touched; all other judgments carried from round 1 (`5d032cc`, precision-fixed at `b78c90d`)
**Verifier**: independent sub-agent (author != verifier)

## Gate — proofs re-run in full at HEAD, one invocation each

- `python3 -m pytest learner/gate/tests/test_metric_lint.py learner/substrate/tests/test_judgments.py -v` — **29 passed, 0 failed** (16 metric-lint incl. 5 parametrized C3 cases + 13 judgments; every test listed individually as PASSED in the verbose output)
- `python3 -m learner.gate.metric_lint --check` — **exit 0**
- `python3 scripts/check_python_complexity.py --max 8 --baseline scripts/python_complexity_baseline.txt learner engines/minimaxDojo engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp` — **exit 0**

## Round-2 re-judged items (from the f847d2d diff)

### game-04 coverage via typed-declaration regex — PASS

- Regex at `learner/gate/metric_lint.py:42-45`: `_METRICS_BLOCK = re.compile(r"\bmetrics\s*:\s*(?:[A-Za-z_][A-Za-z0-9_.<>\[\]]*\s*=\s*)?\{")` — optional typed annotation between `metrics:` and the brace.
- Live census re-run: `game-04-task-queue: ['dispatch_correct', 'dispatch_predictions', 'max_concurrent_running']` — exactly the three claimed names. Source shape confirmed: `engines/voxelDojo/game-04-task-queue/src/game/controller.ts:241` is `const metrics: WaveMetrics = {` (the only brace-literal `metrics` shape in the game; the other occurrences — `controller.ts:77,126`, `hud.ts:26` — carry no brace, so the typed alternative is what captures them).
- Second seed receipt `learner/judgment_receipts/metric-lint-1cf2c923a405753c.ndjson`: 13 lines, all `"kind": "choice"`, `input_digest` first 16 = filename. Fidelity: `dispatch_correct`/`dispatch_predictions`/`max_concurrent_running` all answered `not_failure` (p=1.0/0.86/0.9) and pasted verbatim as `not_failure, provenance: receipt:1cf2c923a405753c` (`metric_failure_snapshot.yaml:57-59`).
- `--check` exit 0 with `declared_games()` wired at `metric_lint.py:306` — and 6 snapshot entries cite receipt `1cf2c923a405753c` (3 game-04 + `legit_rejected`, `observed_admit_rate`, `target_rate` in shared), 7 more overridden with the seed-review marker: 6 + 7 = 13 receipt lines reconciled, none silent.

### New Landing doors vs shipped code — all three match

| Door | Shipped code | Result |
|---|---|---|
| Census membership catalog-declared | `declared_games()` at `metric_lint.py:129-136` reads `engines/voxelDojo/catalog.json` (17 game ids, incl. `game-04-task-queue`); `check()` at `:286-299` appends a `declared in catalog, nothing enumerated` gap for any declared game with empty census; `main` passes `declared_games()` at `:306`; test asserts the door — `test_metric_lint.py:227,230` (`declared={"game-88-bw"}` → `"declared in catalog" in g`) | PASS |
| One public ask seam | `judgments.ask_and_record(sweep, primitive, state, questions, client, receipts_root=None) -> (answers, digest16) \| None` at `learner/substrate/judgments.py:325` — validates answer keys, writes fallback receipt AND returns `None` on failure, computes digest once and writes ok-receipt on success. Repo-wide grep (non-test): the only callers are the semantic helpers (`judgments.py:434` pitfalls, `:495` profile) and `metric_lint.py:217`. `_ask` and `record_judgment` no longer exist anywhere; no cross-module private calls | PASS |
| Vocabularies lazy + injectable | `game_metric_violations(evidence, *, vocabularies=None)` at `standards.py:347-357` (`vocabularies or _failure_vocabularies_cached()`); `@lru_cache(maxsize=1)` at `:262-268`; module constants dropped (diff confirms `_NONZERO/_TRUE` assignment removed). **Empirical**: `_failure_vocabularies_cached.cache_info()` immediately after `import learner.gate.standards` = `misses=0, currsize=0` (no snapshot load at import); first violation check → `misses=1` and still detects `['abusive_admitted=2']`. The `import yaml` at `standards.py:31` is pre-existing seam-threshold code, unrelated to the snapshot | PASS |

### New overrides — spot-checks (2 of 8+1, per scope)

| Override | Evidence | Verdict |
|---|---|---|
| `legit_rejected → failure(nonzero)` (receipt accepted, p=0.79) | Every passing pixelquest fixture carries `legit_rejected: 0` — `engines/pixelDojo/pixel-quest/src/tests/fixtures/evidence.ts:9`, `evidence.test.ts:20,57`, `evidencePolymorphism.test.ts:38`. Nonzero = legitimate traffic false-denied = learner failure. Accepting the receipt answer is correct | sound |
| `abusive_rejected → not_failure` (override; receipt said failure_nonzero p=0.59) | The correct-behavior default fixture carries `abusive_rejected: 5` (`fixtures/evidence.ts:11`, also `evidence.test.ts:22,59`, `evidencePolymorphism.test.ts:40`) — the rate limiter rejecting abusive traffic is the system working; `failure(nonzero)` would flag every healthy run. Override defensible, and it is a real override (receipt line 4 answered `failure_nonzero`) | sound |

### Citations refreshed for checks the fix touched

- C2: test now injects via the new kwarg — `test_metric_lint.py:56-59` `standards.game_metric_violations({"metrics": {"crashes": 3}}, vocabularies=(nonzero, frozenset())) == ["crashes=3"]` (monkeypatching gone, as the door requires). PASS.
- C5: assertion changed equality → subset with the scope merge — `test_metric_lint.py:135` `expected <= census["shared"]`. The checklist claim is presence-based ("all 16 present in the seeded census"), which subset proves; exact equality is incoherent for the merged `shared = rubrics ∪ evidence` scope. The "nothing else" clause remains owned by C4's exact-set fixture (`test_metric_lint.py:111` `census["game-99-fx"] == {...}`, b78c90d fix, green at HEAD). PASS.
- C9: test extended with the declared-game gap — `test_metric_lint.py:227,230`. Exit mapping and gap wording confirmed in `_coverage_gaps`/`check` (`metric_lint.py:269-299`). PASS.
- C6: probability now asserted — `test_metric_lint.py:183` `assert "# p=0.97" in snippet` (b78c90d fix, green at HEAD). PASS.
- Census shape change (`rubrics`/`evidence-disk` merged into `shared`, `metric_lint.py:139-158`) is covered by C5 + C10 both green; shared-scope check unions all snapshot scopes (`_entry_for`, `metric_lint.py:257-266`).

## Carried from 5d032cc / b78c90d (round 1, untouched by f847d2d; proofs re-run green above)

- **Binding sources table** — design/task/PR #486 comparison and the `unknown`-rule precision finding; design not renegotiated between rounds.
- **C1, C3, C4, C7, C8, C10, C11 judgments** — checks the fix did not alter; C11's ci.yml citation (`.github/workflows/ci.yml:315-316`, keyless, job `learner:`) re-read at HEAD, unchanged by the diff.
- **Literal shapes vs shipped code** (round-1 section) — snapshot schema, provenance regex, exit codes, choice primitive; all re-confirmed in the current file while counting entries below.
- **Swept rows** (authorization, concurrency via `atomic_write_text`) — re-confirmed: `ask_and_record` writes receipts through the same `_write_ok_receipt`/`_write_fallback_receipt` path; no key material anywhere in the diff.
- **Round-1 gaps 1, 3, 4** — closed by `b78c90d` (C9 wording recorded in checklist; C4 exact-set at `:111`; C6 probability at `:183`). Round-1 gap 2 **recurred**, see gap 1 below.

## Gaps (ranked; none flips the verdict)

1. **Snapshot header override count off by one (recurrence of round-1 gap 2)**: `metric_failure_snapshot.yaml:11` says "twenty-one overrides marked manual:seed-review-2026-09-17"; actual marked entries = **20** (13 carried + 7 new; YAML parse and the 20 grep entry-lines — `:31,41-45,47,49,73,86,109,161,178,197,261,288,290,296,297,303` — agree). Likely counts `legit_rejected`, which carries `receipt:` provenance, not the marker. Stale comment; no check asserts the count.
2. **Stale comment contradicting the lazy door**: `standards.py:253-257` still reads "derive … at import" and "A missing/malformed snapshot fails import loudly" — now false (empirically: import succeeds with `misses=0`; the snapshot loads on first violation check, as the adjacent docstring at `:262-268` correctly states). Comment-only; fail-closed behavior preserved at every judgment.
3. **Typed-declaration branch has no hermetic fixture**: `FIXTURE_GAME` (`test_metric_lint.py:93-102`) covers only the plain `metrics: {` form, not `const metrics: SomeType = {`. The branch is proven live (census enumerates game-04's three names) and the catalog door makes a regression loud (declared-but-empty census → `--check` exit 1), so the failure mode is not silent — but a one-line fixture case would pin the regex hermetically. Note.

## Faults injected

Skipped — `standard`/`ui` only; profile is light.

## Checklist vs binding sources (step 1)

Skipped — `ui` only; profile is light. The design was not renegotiated; the three build-time doors appended to the checklist by the fix were instead judged against shipped code above (the round-2 scope the orchestrator set).


---

## Round 2 (scoped) — f847d2d (simplify-review round)

Verdict: **PASS**. Scope: the fix diff plus the surfaces it touched; everything
else carried from 5d032cc/b78c90d. Re-judged by the round-2 verifier:

- game-04-task-queue re-enters the census via the typed-declaration regex
  (dispatch_correct, dispatch_predictions, max_concurrent_running); second
  seed sweep receipt 1cf2c923a405753c committed; `--check` exit 0.
- New Landing doors match shipped code: catalog-declared membership with
  empty-census failure; `judgments.ask_and_record` as the single public ask
  seam (no cross-module private calls remain); vocabularies lazy (`lru_cache`)
  and injectable — no import-time yaml load in `standards.py`.
- 8 new seed-review overrides spot-checked (abusive_rejected, denied, held,
  isolated, heat_peak, max_burst_1s, poison_dead_lettered → not_failure,
  correct behavior; legit_rejected accepted failure, false-deny class).
- Proofs re-run in full at HEAD: 29/29 (16 metric-lint + 13 judgments),
  `--check` exit 0, complexity gate exit 0.

Round-1 gaps resolved: #2 (override count) and #3 (C4 equality) and #4 (C6
probability) fixed in b78c90d; #1 remains the recorded precision note on C9
(the implemented rule — any `unknown` fails check — is the stricter side of
an intra-design split; zero `unknown` entries shipped).
