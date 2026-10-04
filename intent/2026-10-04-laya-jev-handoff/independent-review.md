# Independent review — Laya/Jev handoff

Reviewer: separate Codex agent `/root/verify_laya_handoff`, 2026-10-04 UTC. Scope: working-tree/staged `docs/research/laya-jev/` and this change intent. Read root AGENTS.md, CLAUDE.md, REVIEW.md, docs/AGENTS.md, local ai-native-sdlc SKILL.md, plan and spec. No implementation files were edited by this reviewer. No network/API calls or checkpoint downloads were performed.

## Verdict

PASS — portable offline handoff verified; no outstanding Blocker or Important findings. The producer fixed the local evidence-overwrite finding, and this reviewer independently verified the correction. No credentials or production/substrate changes found. Neural quality comparison remains pending; historical failures are not model predictions.

## Findings

- **Important — resolved: preserve local neural evidence.** The initial review found that run_local_models.py used write_text, allowing a repeat default invocation to replace earlier local-models.json. The producer added refusal before manifest/weight loading and exclusive open('x') for final persistence. Independent recheck with a pre-existing sentinel output: nonzero exit with “Refusing to overwrite evidence,” sentinel bytes unchanged, and no missing-checkpoint message. Final source uses exclusive creation. No outstanding findings.

## REVIEW.md passes

1. **Correctness vs plan:** pinned upstream commit, checkpoint manifest and corpus preserved; defaults derive from checkout and write into ignored `.scratch/laya-jev/`; LAYA_ROOT override works. No learning-gate, backend production, or learner-state change. The initial evidence-preservation finding is resolved.
2. **Tests and evidence:** historical logs support the report's offline scope, including `247 passed, 1 skipped` for HTTP and `24 passed, 2 skipped` for Jev integration. The reviewer independently ran the offline checks below. No neural-quality claim is inferred from those tests, routing, or `/health` with no loaded models.
3. **Conventions:** intent/spec/plan exist and bound the task to research/handoff. No canonical or derived substrate files changed. No engine curriculum/learner copies. The root `rtk` wrapper is unavailable in this environment; standard shell commands were used after its executable returned not found.
4. **Security and hygiene:** Git candidates contain no venv, weights, cache, `.env`, or credential patterns. Python bytecode present on disk is ignored and excluded from Git candidates. Root `.env` and `.scratch` output ignore rules verified. Curated historical logs are included intentionally. Logs contain infrastructure paths/instance metadata, not end-user PII or credential values.
5. **Simplification:** checkout-relative defaults are centralized in paths.py; reused pinned upstream downloader avoids duplicating the Hub transport. No broad refactor recommended. Output preservation now aligns with run_comparison.py.

## Independent executed validation

Python executable: `/workspace/laya/.venv/bin/python`. Checks ran against source and a copied checkout under a temporary path containing spaces; temporary copies and results were removed automatically.

- Parsed all five Python scripts with `ast.parse`; `bash -n` passed for both shell scripts.
- Corpus verified: 62 unique cases, 220 questions, 142 labelled answers, six preferred-engine references; all expected keys belong to question keys. Frozen dataset SHA-256 matched dataset.sha256.
- Bundled checkpoint-manifest.json equals the pinned installed upstream verify/checkpoints.json.
- `sha256sum -c SHA256SUMS.txt`: 49 entries OK at review time. Producer must regenerate/recheck this if artifact files change afterward.
- Git-candidate scan: no prohibited runtime files; credential-pattern matches zero. Secret scans printed only file names/counts, never credential values.
- Relocated `analyze.py`: zero successful requests for jev-jev-latest and laya-auto; paired labelled answers zero; quality_measured false for both.
- Relocated `run_local_models.py` with absent LAYA_ROOT: exit 2, explicit “No neural inference performed” error, no output file.
- Relocated `run_comparison.py --backend laya --limit 1` with Hub offline and absent local models: exit 2, exactly one status=error record, no result/model answer.
- Existing local output refusal independently verified after fix: exit 1, refusal before checkpoint loading, existing sentinel bytes unchanged; final persistence uses exclusive creation.

## Limits

Installation/download success and inference accuracy cannot be verified without accessible checkpoint files and upstream network. No new live inference was attempted. Future measurement hardening: analyze.py currently trusts producer status=ok and does not independently validate recorded input_sha256 against the corpus; verify provenance before importing arbitrary or older successful runs. This is advisory for resumed measurements and does not affect the present zero-response historical analysis.
