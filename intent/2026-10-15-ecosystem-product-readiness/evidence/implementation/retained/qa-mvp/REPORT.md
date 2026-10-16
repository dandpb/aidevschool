# C17 aiDevschoolMvp — blocked

Source `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`; real Hermes / configured Alibaba `qwen3.8-max`; private complete checkout and native profile. This is a QA producer record, not independent whole-feature verification.

Installation and first C01 lesson worked. On synthetic raw answer `A A B`, Hermes called `gate_check.py` with `raw_reply` instead of required `reply_text`: script exit 1, `Missing required argument reply_text.` A fresh C14 scenario omitted concept/attempt fields too: exit 1, `Missing required argument concept_id.` Both errors were relayed literally and tutoring stopped. Outer Hermes exit 0 does not make these gate calls pass.

A fresh C12 call used the correct JSON schema and reached the existing G4 adapter. It stopped with `no recorded G4 judgments for rubric c12_prompt_rewrite.` Actual separate model judgments for three synthetic artifacts were retained, but were not consumed by product gates; they do not close the G4 path. No fixture was relabelled as live verification.

No pedagogical verdict, retry, scheduler/recompute/card journey or all-24 live coverage was observed after the errors. Remaining gate families and return/recovery remain unverified. Full 24-concept primary/teach-back/fallback census: `concept-gate-census.json`. Detailed cases, evidence digests and timestamps: `qa-report.json` and `commands.json`.

Cleanup: own local-only cron was removed and the list was empty. Own profile home was deleted, although native deletion returned exit 1 for pending identity settlement. No retry, restoration or overwrite of shared DB occurred. Default config/env/auth/MVP skill+state/cron/session-file hashes match; default state.db/WAL/SHM hashes changed. Read-only SQL found zero of the four QA session IDs in default sessions/messages. This does not establish complete byte invariance or user-chat corruption. Exact hashes and sanitized diagnostics are retained.

No source or frozen-check changes, pushes, deploys, new keys, real messages, gateway/daemon, or canonical learner promotion. All model subprocesses completed in this turn. The clean managed runtime worktree was archived; the checkout directory is absent and the archived_worktree attachment is retained.
