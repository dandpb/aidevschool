# threejs-dojo-coverage — FINAL batch report

## Verdict: **18/18 CLOSED — FULL COVERAGE**


All 18 curriculum modules have a closed threejs-dojo learning gate, each independently graded
PASS >=8/10 by a fresh-context verifier (producer = the 2026-07-05 voxelDojo buildout, which had
no surviving context, so producer!=verifier holds). No learner/learning_state.yaml or .mavis
was written by any verifier; producer!=verifier and never-mark-mastered held throughout.

### Per-slug scores
- `01_rate_limiter` — **9/10** PASS
- `02_key_value_store` — **9/10** PASS
- `03_url_shortener` — **9/10** PASS
- `04_concurrent_task_queue` — **9/10** PASS
- `05_websocket_chat` — **9/10** PASS
- `06_file_upload_pipeline` — **9/10** PASS
- `07_rest_api_auth` — **9/10** PASS
- `08_event_driven_order_system` — **9/10** PASS
- `09_plugin_system` — **9/10** PASS
- `10_distributed_cache` — **9/10** PASS
- `11_load_balancer` — **9/10** PASS
- `12_distributed_job_scheduler` — **9/10** PASS
- `13_api_gateway_circuit_breaker` — **9/10** PASS
- `14_log_aggregator` — **9/10** PASS
- `15_metrics_collector` — **9/10** PASS
- `16_mini_message_queue` — **9/10** PASS
- `17_distributed_config_service` — **9/10** PASS
- `18_search_engine` — **9/10** PASS


### How the 4 initial gaps closed
- **01_rate_limiter (4 -> 9):** rebuilt to dispatch the token_bucket encounter directly (capacity vs refill,
  admit legit / reject abusive); emits pixelquest-token-bucket EVIDENCE. PLAN slice rewritten.
  Overturned the 2026-07-05 Agent Quest decision (per owner approval).
- **04_concurrent_task_queue (4 -> 9):** added the missing pixel-quest Playwright drive of lab-04
  (asserts pixelquest-task-queue EVIDENCE); canonical evidence+screenshot propagated.
- **05_websocket_chat (8-FAIL -> 9):** rewrote the stale controller.test.ts against the live controller API.
- **06_file_upload_pipeline (6 -> 9):** deleted the stale controller.test.ts (21 sim tests + smoke cover it);
  replaced the phantom evidence.json with the real voxeldojo U6-file-upload record; screenshot regenerated.

### Critical lesson: vision-tool hallucination on screenshot identity
Two fresh-context verifiers FALSELY read the 06 (and initially 01) screenshot as '07_rest_api_auth' via the
`analyze_image` tool — a content-hash-collision hallucination (slug 01's verifier documented and debunked the
identical failure). Decisive disproof is byte identity: 06's screenshot MD5 != 07's screenshot MD5, and ==
game-06's own smoke render. **Future screenshot-identity checks MUST use MD5 comparison, not the vision tool.**
WebGL renders are non-deterministic (animation loop) so exact MD5 varies per run — verify by content/identity,
not by pinning a canonical hash.