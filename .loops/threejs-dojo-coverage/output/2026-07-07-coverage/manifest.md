# threejs-dojo-coverage — run 2026-07-07-coverage (FINAL)

- **Result: 18/18 CLOSED — FULL COVERAGE**
- Engine: voxelDojo (16 games) + pixel-quest encounters (01 token-bucket, 04 task-queue)
- Mode: OFF (autonomous, ultracode); fresh-context per-slug verifiers (producer = 2026-07-05 buildout, gone)

| NN | slug | eng | score | result | gate(L/T/TC/B/SM) | ev | plan | shot | plan-path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 01_rate_limiter | pix | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/pixelDojo/docs/plans/01_rate_limiter.md` |
| 02 | 02_key_value_store | vox | 9 | PASS | ?/?/?/?/? | N | N | N | `engines/voxelDojo/docs/plans/02_key_value_store.md` |
| 03 | 03_url_shortener | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/03_url_shortener.md` |
| 04 | 04_concurrent_task_queue | pix | 9 | PASS | P/P/P/P/P | N | Y | N | `engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` |
| 05 | 05_websocket_chat | vox | 9 | PASS | ?/?/?/?/? | N | N | N | `engines/voxelDojo/docs/plans/05_websocket_chat.md` |
| 06 | 06_file_upload_pipeline | vox | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/06_file_upload_pipeline.md` |
| 07 | 07_rest_api_auth | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/07_rest_api_auth.md` |
| 08 | 08_event_driven_order_system | vox | 9 | PASS | ?/?/?/?/? | N | N | N | `engines/voxelDojo/docs/plans/08_event_driven_order_system.md` |
| 09 | 09_plugin_system | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/09_plugin_system.md` |
| 10 | 10_distributed_cache | vox | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/10_distributed_cache.md` |
| 11 | 11_load_balancer | vox | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/11_load_balancer.md` |
| 12 | 12_distributed_job_scheduler | vox | 9 | PASS | ?/?/?/?/? | N | N | N | `engines/voxelDojo/docs/plans/12_distributed_job_scheduler.md` |
| 13 | 13_api_gateway_circuit_breaker | vox | 9 | PASS | ?/?/?/?/? | N | N | N | `engines/voxelDojo/docs/plans/13_api_gateway_circuit_breaker.md` |
| 14 | 14_log_aggregator | vox | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/14_log_aggregator.md` |
| 15 | 15_metrics_collector | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/15_metrics_collector.md` |
| 16 | 16_mini_message_queue | vox | 9 | PASS | P/P/P/P/P | Y | Y | Y | `engines/voxelDojo/docs/plans/16_mini_message_queue.md` |
| 17 | 17_distributed_config_service | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/17_distributed_config_service.md` |
| 18 | 18_search_engine | vox | 9 | PASS | P/P/P/P/P | N | N | N | `engines/voxelDojo/docs/plans/18_search_engine.md` |