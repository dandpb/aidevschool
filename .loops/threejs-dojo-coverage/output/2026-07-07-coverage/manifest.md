# threejs-dojo-coverage — run 2026-07-07-coverage

- Engine: voxelDojo (16 games) + pixel-quest encounters (01, 04)
- Mode: OFF (autonomous, ultracode)
- Batch verifier: score 4 / result FAIL / closed 14/18 / confidence high

| NN | slug | engine | score | result | done | gate(L/T/TC/B/SM) | ev | plan | shot | plan-path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 01_rate_limiter | pixelquest | 4 | FAIL | FAIL | P/P/P/P/P | Y | Y | Y | `engines/pixelDojo/docs/plans/01_rate_limiter.md` |
| 02 | 02_key_value_store | voxel | 8 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/02_key_value_store.md` |
| 03 | 03_url_shortener | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/03_url_shortener.md` |
| 04 | 04_concurrent_task_queue | pixelquest | 4 | FAIL | FAIL | P/P/P/P/F | N | Y | Y | `engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` |
| 05 | 05_websocket_chat | voxel | 8 | FAIL | FAIL | P/F/F/F/P | Y | N | Y | `engines/voxelDojo/docs/plans/05_websocket_chat.md` |
| 06 | 06_file_upload_pipeline | voxel | 6 | FAIL | FAIL | P/F/F/F/P | Y | Y | Y | `engines/voxelDojo/docs/plans/06_file_upload_pipeline.md` |
| 07 | 07_rest_api_auth | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/07_rest_api_auth.md` |
| 08 | 08_event_driven_order_system | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/08_event_driven_order_system.md` |
| 09 | 09_plugin_system | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/09_plugin_system.md` |
| 10 | 10_distributed_cache | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/10_distributed_cache.md` |
| 11 | 11_load_balancer | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/11_load_balancer.md` |
| 12 | 12_distributed_job_scheduler | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/12_distributed_job_scheduler.md` |
| 13 | 13_api_gateway_circuit_breaker | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/13_api_gateway_circuit_breaker.md` |
| 14 | 14_log_aggregator | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/14_log_aggregator.md` |
| 15 | 15_metrics_collector | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/15_metrics_collector.md` |
| 16 | 16_mini_message_queue | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/16_mini_message_queue.md` |
| 17 | 17_distributed_config_service | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/17_distributed_config_service.md` |
| 18 | 18_search_engine | voxel | 9 | PASS | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/18_search_engine.md` |


## Open slugs (FAIL) — retry_targets

### 01_rate_limiter (score 4/10)
- **failed_criteria:** DONE-RULE playable mechanic FAILS: the 01_rate_limiter slug dispatches encounterKind='sequence_flow' (mechanicName='Agent Quest'), an orchestration duel where the player advances 10 plan-act-observe-verify steps with Z/X. No token-bucket capacity/refill arithmetic and no admit/reject-under-refill decision exist in the playable surface. tokenBucket.ts exists and is registered but is dispatched ONLY for modules without an explicit encounterKind (03/05/10/14/15), NOT for 01_rate_limiter. Token-bucket is narrative framing only (concept string + briefing). PLAN.md section 3 admits 'the token-bucket algorithm is the target under verification, not the direct arcade mechanic'. DONE-RULE evidence scenario FAILS: the emitted record has metrics.kind='pixelquest-sequence-flow' (orchestration), not 'pixelquest-token-bucket', so it evidences the wrong scenario. The evidence is schema-valid and the smoke asserting it is green, but it proves orchestration discipline, not token-bucket admit/reject-under-refill.
- **retry_target:** Re-author the 01_rate_limiter module in src/content/curriculumPack.ts to dispatch the token_bucket encounter kind (remove/replace encounterKind:'sequence_flow' so it falls through to the token_bucket default, or set an explicit token-bucket config), so the playable surface exercises capacity-vs-refill admit/reject and the emitted EVIDENCE carries metrics.kind='pixelquest-token-bucket' for encounter-agent-quest-01. Then re-run this verifier.

### 04_concurrent_task_queue (score 4/10)
- **failed_criteria:** Playwright smoke emits NO EVIDENCE record (voxeldojo or pixelquest schema) for the 04_concurrent_task_queue / U4-task-queue core scenario. The voxelDojo 'TASK FORGE' game (Shape B) described in decision.md + PLAN slice was never built: engines/voxelDojo/game-04-task-queue/ does not exist and there are zero references to task-forge/U4-task-queue/voxeldojo-task-queue anywhere in voxelDojo. The pixel-quest shared smoke (playwright/pixel-quest.spec.ts, 251 lines) plays only labs 01/02/07/11/13 and never reaches lab-04_concurrent_task_queue; its .logs/evidence.ndjson contains only sequence-flow/policy-gate/route-health records, zero *task-queue* metrics. The only task_queue coverage is a logic-level vitest unit test (src/tests/taskQueue.test.ts), not a Playwright smoke and not a voxeldojo-schema record. The cross-check .loops/.../04_concurrent_task_queue/evidence.json is a phantom record from the unbuilt voxelDojo game whose metrics kind ('task-forge-task-queue') even contradicts the PLAN-specified 'voxeldojo-task-queue'; it is not reproducible by any smoke. Required item 'Playwright smoke emits >=1 valid EVIDENCE record (voxeldojo schema) for the core scenario with review_context' is entirely unmet.
- **retry_target:** step-4-smoke: the slug was re-routed to Shape B (voxelDojo 'TASK FORGE') but the game was never built. Either (a) build engines/voxelDojo/game-04-task-queue/ per the PLAN slice with a Playwright smoke that emits a pass:true voxeldojo-task-queue record carrying review_context for unit U4-task-queue, OR (b) extend playwright/pixel-quest.spec.ts to drive lab-04_concurrent_task_queue (the existing pixel-quest task_queue encounter) and assert the emitted pixelquest-task-queue EVIDENCE record. A Playwright smoke MUST emit a valid task-queue EVIDENCE record with the required review_context fields for this slug to PASS.

### 05_websocket_chat (score 8/10)
- **failed_criteria:** Four-command gate is RED (test+typecheck+build all fail) and the PLAN slice for 05_websocket_chat is MISSING on every searched path (docs/plans/05_05_websocket_chat.md, game-05-relay-station/PLAN.md absent; engines/voxelDojo/PLAN.md exists but is the HASH RING game-10 worked example only). Gate root cause: src/game/controller.test.ts is stale — imports non-existent exports {deliverySet, liveSet, survivorsAfterSweep} from sim/levels (actual exports are evaluateConnectedPrediction/evaluateDeliveryPrediction/evaluateSurvivorPrediction), calls non-existent GameController.lockIn() (actual: submit()), references non-existent state.level.recoverClientId and state.relay. This single file breaks test, typecheck, and build.
- **retry_target:** Fix src/game/controller.test.ts: rewrite it against the actual API (GameController.submit/togglePredict/reconnect + truthConnected/truthDelivery/truthSurvivors/truthReconnectTarget, and sim/levels evaluate* exports) so test+typecheck+build go green; then author the missing PLAN slice at engines/voxelDojo/docs/plans/05_05_websocket_chat.md.

### 06_file_upload_pipeline (score 6/10)
- **failed_criteria:** Four-command gate (REQUIRED for PASS) fails on test+typecheck+build. Root cause: src/game/controller.test.ts is a stale test written against a GameController API that no longer exists. It calls bufferedResult(), predictWillOverflow(), runUpload(), streamingTruthResult(), predictPeak(), setChunk(), predictStreamOutcome(), predictBufferOverflow(), and LevelConfig.fileSize -- none of which exist on the current GameController. The 21 src/sim/pipeline.test.ts tests pass and the 3 Playwright smoke tests pass (smoke uses the current API: start/loadLevel/predictOverflow/predictBounded/setChunkSize/bufferedOverflows), so the game itself is healthy -- only this one orphan test file breaks the gate. lint PASS, smoke PASS, evidence valid, PLAN present, screenshot present.
- **retry_target:** step-2-test/step-3-typecheck/step-4-build: rewrite or delete src/game/controller.test.ts against the current GameController API. The 21 sim tests + green smoke already cover the concept math and wiring, so the stale controller test is redundant -- deleting or rewriting it to the renamed methods (predictOverflow/predictBounded/setChunkSize/bufferedOverflows) makes all four gate commands green and the slug passes.
