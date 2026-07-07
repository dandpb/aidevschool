# threejs-dojo-coverage — batch report

## Verdict: **14/18 closed** — batch FAIL (score 4/10)

Verify-only run: the all-18 voxelDojo buildout already existed (2026-07-05) and was green, but only
`01_rate_limiter` had a fresh-context `verifier-report.json`. This batch closed the gate for the other 17
via one fresh-context verifier per slug (producer=2026-07-05 buildout, long gone, so producer!=verifier
holds), then a separate fresh-context batch verifier confirmed coverage.

### Closed (14)
`02_key_value_store`, `03_url_shortener`, `07_rest_api_auth`, `08_event_driven_order_system`, `09_plugin_system`, `10_distributed_cache`, `11_load_balancer`, `12_distributed_job_scheduler`, `13_api_gateway_circuit_breaker`, `14_log_aggregator`, `15_metrics_collector`, `16_mini_message_queue`, `17_distributed_config_service`, `18_search_engine`

### Open (4)
- **01_rate_limiter** (4/10): DONE-RULE playable mechanic FAILS: the 01_rate_limiter slug dispatches encounterKind='sequence_flow' (mechanicName='Agent Quest'), an orchestration duel where the player 
- **04_concurrent_task_queue** (4/10): Playwright smoke emits NO EVIDENCE record (voxeldojo or pixelquest schema) for the 04_concurrent_task_queue / U4-task-queue core scenario. The voxelDojo 'TASK FORGE' game
- **05_websocket_chat** (8/10): Four-command gate is RED (test+typecheck+build all fail) and the PLAN slice for 05_websocket_chat is MISSING on every searched path (docs/plans/05_05_websocket_chat.md, g
- **06_file_upload_pipeline** (6/10): Four-command gate (REQUIRED for PASS) fails on test+typecheck+build. Root cause: src/game/controller.test.ts is a stale test written against a GameController API that no 


### Batch verifier failed_criteria (full)

4 of 18 slugs have result=FAIL in their verifier-report.json (done-rule requires result=PASS AND score>=8 for all 18):
- 01_rate_limiter: result=FAIL score=4. Didactic-fit failure: the playable mechanic dispatches encounterKind='sequence_flow' (Agent Quest orchestration duel), NOT token-bucket capacity/refill admit-reject. tokenBucket.ts exists+registered but is dispatched only for modules lacking an explicit encounterKind; the emitted EVIDENCE has metrics.kind='pixelquest-sequence-flow' (orchestration evidence), so it evidences the wrong scenario. Gate lint/test/typecheck/build/smoke all green; gap is purely didactic-fit vs the assigned done-rule.
- 04_concurrent_task_queue: result=FAIL score=4. No Playwright smoke emits a task_queue EVIDENCE record (voxeldojo OR pixelquest schema). The voxelDojo 'TASK FORGE' game (Shape B) was never built: engines/voxelDojo/game-04-task-queue/ does not exist and zero references to task-forge/U4-task-queue exist in voxelDojo. The shared pixel-quest smoke (playwright/pixel-quest.spec.ts) only plays labs 01/02/07/11/13 and never reaches lab-04. Only coverage is a logic-level vitest unit test (src/tests/taskQueue.test.ts), which is not a Playwright smoke and not a voxeldojo-schema record.
- 05_websocket_chat: result=FAIL score=8. Score>=8 but result=FAIL. The 4-command gate is not all green (verifier summary: 'PASS requires the four-command gate green AND a PLAN slice, and neither holds'). Didactic design is strong (L1 connected-set / L2 fan-out / L3 heartbeat pruning / L4 reconnect, 17 sim tests pass, smoke green, real schema-conformant EVIDENCE), but the gate failure sinks the PASS verdict.
- 06_file_upload_pipeline: result=FAIL score=6. Four-command gate fails on test+typecheck+build. Root cause: src/game/controller.test.ts is a stale orphan test against a GameController API that no longer exists (calls bufferedResult/predictWillOverflow/runUpload/streamingTruthResult/predictPeak/setChunk/predictStreamOutcome/predictBufferOverflow/LevelConfig.fileSize, none of which exist). Current API is start/loadLevel/predictOverflow/predictBounded/setChunkSize/bufferedOverflows. The 21 sim tests + 3 Playwright smoke tests pass (game is healthy); only this stale test file breaks the gate.

The 14 PASS slugs (02,03,07,08,09,10,11,12,13,14,15,16,17,18) each have result=PASS + score 8-9 + non-empty evidence.json with pass=true + screenshot.png + PLAN slice on disk. Spot-checked evidence_checked/notes for slugs 03,10,14,18 show real commands with exit codes (pnpm lint/test/typecheck/build/smoke) and live EVIDENCE captures - not rubber stamps.

CAVEAT on producer!=verifier invariant: the verifier-report.json files do not carry structured producer/builder vs verifier/author identity fields (only slug 07 self-labels verifier='fresh-context independent'), so this invariant cannot be fully machine-verified from the JSON alone. However the detailed, specific evidence_checked/notes content across slugs is consistent with independent verification. This caveat is moot for the verdict since 4 hard result=FAILs already force FAIL.