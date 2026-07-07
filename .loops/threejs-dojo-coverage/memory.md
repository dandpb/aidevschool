# Loop Memory — `threejs-dojo-coverage`

> Append-only run log for the `/threejs-dojo-coverage` batch loop. Read this
> file first on every new batch; the previous lessons shape parallelism
> decisions, shape bias, and preflight tightening.

## Schema

Each entry uses this shape (see SKILL.md §"Output & Memory"):

```markdown
## Batch <ISO-8601 timestamp> — run-id <run-id>
- mode: ON | OFF
- scope: 18 slugs (01_rate_limiter … 18_search_engine); shape distribution <N>B / <M>A / <K>accept
- concurrency: <cap actually used>
- skipped: <slugs that hit the accept-only path>
- rerun: <slugs whose worker crashed or needed a re-dispatch>
- per-slug scores: <comma-separated slug:score pairs>
- coverage: <closed>/18 — <PASS|PARTIAL> — <one-line reason>
- verification: <score>/10 — <PASS|FAIL> — <one-line reason>
- output: <path to this run's deliverable>
- lessons:
  - <parallelism lesson>
  - <shape lesson>
  - <failure cluster lesson>
```

---

## Batch 2026-07-05T19:34:59-03:00 — run-id bootstrap
- mode: ON
- inputs: (skill bootstrap run; no batch executed yet)
- skipped: none
- rerun: none
- verification: n/a — bootstrap run, no batch artifact yet
- output: `.claude/skills/threejs-dojo-coverage/SKILL.md` created
- lessons:
  1. **Scope per batch = 18 slugs** (full catalog sweep). The per-concept
     `/threejs-dojo` loop remains the unit of work; this loop is the
     fan-out + coverage gate around it.
  2. **Shape bias = B.** This is the parallelism enabler: each Shape B app
     lives in its own `engines/pixelDojo/games/<NN>_<slug>/` directory with
     its own `node_modules`, Vite port, Biome/tsc state, Playwright smoke.
     18 Shape B workers in parallel = no working-tree contention.
  3. **Shape A is allowed but serialized.** If a slug's pedagogical fit
     demands Shape A (e.g. 01_rate_limiter's existing Agent Quest lab),
     that one worker runs alone while the other 17 wait. Shape A workers
     share `pixel-quest/src/` and cannot run in parallel safely.
  4. **Best-effort on per-slug fail.** Inner `/threejs-dojo` retry cap is 3
     (inherited). On exhaustion, the orchestrator records FAIL with
     `retry_target` and continues the batch. The batch verifier judges
     `closed == 18`; partial coverage exits with the gap list, not a fake
     PASS.
  5. **First batch will validate the design.** Watch for: per-slug port
     collisions across Shape B apps (Vite's default port assignment can
     collide on rapid spin-up), `pnpm install` contention when many Shape B
     workers hit `node_modules` simultaneously, and the orchestrator's
     `mavis communication send` payload size (18 manifests × per-slug brief
     can balloon). Mitigation candidates per observation will land in the
     next batch's lessons.
  6. **Next:** invoke `/threejs-dojo-coverage` to run the first batch.
     Memory file will be re-read at the top of every subsequent batch.
## Batch 2026-07-07 — run-id 2026-07-07-coverage
- mode: OFF (autonomous, ultracode)
- scope: 18 slugs; 16 voxelDojo + 2 pixel-quest (01,04); verify-only (buildout pre-existed)
- concurrency: workflow cap; 18 verifiers + 1 batch = 19 agents, 0 errors, ~1.14M tokens, ~18.6 min
- skipped: none (01's prior 9/10 NOT accepted — re-verified, correctly FAILED under strict didactic-fit rule)
- rerun: none yet — 4 gaps queued for a fix wave (04,05,06 mechanical; 01 design-level)
- per-slug scores: 01_rate_limiter:4, 02_key_value_store:8, 03_url_shortener:9, 04_concurrent_task_queue:4, 05_websocket_chat:8, 06_file_upload_pipeline:6, 07_rest_api_auth:9, 08_event_driven_order_system:9, 09_plugin_system:9, 10_distributed_cache:9, 11_load_balancer:9, 12_distributed_job_scheduler:9, 13_api_gateway_circuit_breaker:9, 14_log_aggregator:9, 15_metrics_collector:9, 16_mini_message_queue:9, 17_distributed_config_service:9, 18_search_engine:9
- coverage: 14/18 — PARTIAL — open: 01_rate_limiter, 04_concurrent_task_queue, 05_websocket_chat, 06_file_upload_pipeline
- verification: 4/10 — FAIL — closed 14/18, confidence high (no threshold relaxed)
- output: .loops/threejs-dojo-coverage/output/2026-07-07-coverage/
- lessons:
  - **Strict didactic-fit rule correctly FAILS 01_rate_limiter (overturns prior 9/10).** Playable surface = sequence_flow (Agent Quest); tokenBucket.ts registered but NOT dispatched for slug 01; EVIDENCE carries metrics.kind=pixelquest-sequence-flow. The 2026-07-05 run accepted this at 9/10 under a looser rule and admitted 'no actual token-bucket arithmetic.' Honest grade = 4/10 FAIL. Fix = re-author curriculumPack.ts to dispatch token_bucket for 01 (or a dedicated token-bucket arcade). OVERTURNS a deliberate prior decision — flag to owner before rebuilding.
  - **05/06 are mechanical gate breaks, not design gaps.** 06 = stale src/game/controller.test.ts vs current GameController API (delete/rewrite; 21 sim tests + green smoke already cover it). 05 = test/typecheck/build failing in game-05-relay-station (diagnose+fix). Didactic fit already strong on both.
  - **04_concurrent_task_queue has NO Playwright smoke emitting a task-queue EVIDENCE record.** taskQueue.ts encounter exists but no spec drives it. Fix = extend pixel-quest.spec.ts to drive lab-04 and assert a pixelquest-task-queue EVIDENCE, OR build voxelDojo game-04.
  - **02 PASS@8 with artifact defect:** contract-path screenshot renders 07_rest_api_auth (mislabeled); live smoke shots correct in game-02-warehouse/.logs/. Regenerate contract screenshot.
  - **Manifest plan-path bug (mine):** prompts used <nn>_<slug>.md but real files are <slug>.md; verifiers found real files anyway; on-disk manifest corrected.
  - **Evidence pipeline sound:** all 14 PASS games emit schema-conformant voxeldojo records (verifier_required:true, scheduler_source:learner-substrate, never imports learner state). No verifier wrote learner/learning_state.yaml (producer!=verifier + never-mark-mastered held).
