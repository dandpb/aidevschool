#!/usr/bin/env python3
"""Generate graphify chunk 021 extraction JSON."""
import json
from pathlib import Path

ROOT = "/Users/danielbarreto/Development/aidevschool"
OUT = Path(ROOT) / "graphify-out" / ".graphify_chunk_021.json"

# File paths exactly as in the chunk file list
P06_LESSON = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/06_file_upload_pipeline/docs/lesson.md"
P06_REDTEAM = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/06_file_upload_pipeline/docs/redteam.md"
P06_STATUS = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/06_file_upload_pipeline/docs/status.md"
P06_VERDICT = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/06_file_upload_pipeline/docs/verdict.md"
P06_SECURITY = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/06_file_upload_pipeline/docs/security/report.md"

P07_ADR = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/ADR.md"
P07_BENCH = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/benchmark_results.md"
P07_LESSON = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/lesson.md"
P07_REDTEAM = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/redteam.md"
P07_STATUS = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/status.md"
P07_VERDICT = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/verdict.md"
P07_SECURITY = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/07_rest_api_auth/docs/security/report.md"

P08_ADR = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/ADR.md"
P08_BENCH = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/benchmark_results.md"
P08_LESSON = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/lesson.md"
P08_REDTEAM = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/redteam.md"
P08_STATUS = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/status.md"
P08_VERDICT = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/verdict.md"
P08_SECURITY = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/08_event_driven_order_system/docs/security/report.md"

P09_ADR = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/09_plugin_system/docs/ADR.md"
P09_BENCH = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/09_plugin_system/docs/benchmark_results.md"
P09_LESSON = f"{ROOT}/engines/miniMaxEvolutionEngine/curriculum/09_plugin_system/docs/lesson.md"


def n(id_, label, file_type, source_file, rationale=None):
    node = {
        "id": id_,
        "label": label,
        "file_type": file_type,
        "source_file": source_file,
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": None,
        "contributor": None,
    }
    if rationale:
        node["rationale"] = rationale
    return node


def e(src, tgt, relation, confidence, score, source_file):
    return {
        "source": src,
        "target": tgt,
        "relation": relation,
        "confidence": confidence,
        "confidence_score": score,
        "source_file": source_file,
        "source_location": None,
        "weight": 1.0,
    }


nodes = []
edges = []

# Stems for IDs
S06L = "engines_minimaxevolutionengine_curriculum_06_file_upload_pipeline_docs_lesson"
S06R = "engines_minimaxevolutionengine_curriculum_06_file_upload_pipeline_docs_redteam"
S06S = "engines_minimaxevolutionengine_curriculum_06_file_upload_pipeline_docs_status"
S06V = "engines_minimaxevolutionengine_curriculum_06_file_upload_pipeline_docs_verdict"
S06SEC = "engines_minimaxevolutionengine_curriculum_06_file_upload_pipeline_docs_security_report"

S07A = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_adr"
S07B = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_benchmark_results"
S07L = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_lesson"
S07R = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_redteam"
S07S = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_status"
S07V = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_verdict"
S07SEC = "engines_minimaxevolutionengine_curriculum_07_rest_api_auth_docs_security_report"

S08A = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_adr"
S08B = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_benchmark_results"
S08L = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_lesson"
S08R = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_redteam"
S08S = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_status"
S08V = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_verdict"
S08SEC = "engines_minimaxevolutionengine_curriculum_08_event_driven_order_system_docs_security_report"

S09A = "engines_minimaxevolutionengine_curriculum_09_plugin_system_docs_adr"
S09B = "engines_minimaxevolutionengine_curriculum_09_plugin_system_docs_benchmark_results"
S09L = "engines_minimaxevolutionengine_curriculum_09_plugin_system_docs_lesson"

# Project concept nodes
proj_06 = f"{S06L}_file_upload_processing_pipeline"
proj_07 = f"{S07A}_rest_api_with_auth"
proj_08 = f"{S08A}_event_driven_order_system"
proj_09 = f"{S09A}_plugin_system"

nodes.append(n(proj_06, "File Upload/Processing Pipeline", "rationale", P06_LESSON,
    "Build a language-neutral HTTP file upload service in Go, Rust, and Node.js/TypeScript that accepts large files, processes them as streams, validates contents, stores uploads, and exposes status/metadata via REST API."))
nodes.append(n(proj_07, "REST API with Auth", "rationale", P07_ADR,
    "Small REST API service with authentication and authorization implemented in Go, Rust, and Node.js/TypeScript with behavioral equivalence."))
nodes.append(n(proj_08, "Event-Driven Order System", "rationale", P08_ADR,
    "Small event-driven order system where every state change is recorded as an immutable event."))
nodes.append(n(proj_09, "Plugin System", "rationale", P09_ADR,
    "Language-neutral host application in Go, Rust, and Node.js/TypeScript that discovers, validates, loads, runs, and unloads third-party plugins through a stable interface contract."))

# Document nodes for artifacts inside the chunk file list
bench_07 = f"{S07B}_benchmark_results"
bench_08 = f"{S08B}_benchmark_results"
bench_09 = f"{S09B}_benchmark_results"
sec_06 = f"{S06SEC}_security_report"
sec_07 = f"{S07SEC}_security_report"
sec_08 = f"{S08SEC}_security_report"

nodes.append(n(bench_07, "Benchmark Results: 07 REST API with Auth", "document", P07_BENCH))
nodes.append(n(bench_08, "Benchmark Results: 08 Event-Driven Order System", "document", P08_BENCH))
nodes.append(n(bench_09, "Benchmark Results: 09 Plugin System", "document", P09_BENCH))
nodes.append(n(sec_06, "Security Report: 06 File Upload/Processing Pipeline", "document", P06_SECURITY))
nodes.append(n(sec_07, "Security Report: 07 REST API with Auth", "document", P07_SECURITY))
nodes.append(n(sec_08, "Security Report: 08 Event-Driven Order System", "document", P08_SECURITY))

# Hash-map mental model (one per lesson)
hm_06 = f"{S06L}_hash_map_behind_an_api"
hm_07 = f"{S07L}_hash_map_behind_an_api"
hm_08 = f"{S08L}_hash_map_behind_an_api"
hm_09 = f"{S09L}_hash_map_behind_an_api"
hm_rationale = "Mental model: clients address opaque values by string keys and expect predictable create/read/update/delete/expire/enumerate behavior even when many clients race."
nodes.append(n(hm_06, "Hash map behind an API", "rationale", P06_LESSON, hm_rationale))
nodes.append(n(hm_07, "Hash map behind an API", "rationale", P07_LESSON, hm_rationale))
nodes.append(n(hm_08, "Hash map behind an API", "rationale", P08_LESSON, hm_rationale))
nodes.append(n(hm_09, "Hash map behind an API", "rationale", P09_LESSON, hm_rationale))

# Concurrency strategies (anchored in 07 ADR)
sync_rw = f"{S07A}_sync_rwmutex"
borrow_tokio = f"{S07A}_borrow_checker_tokio_async"
event_loop = f"{S07A}_single_threaded_event_loop"
nodes.append(n(sync_rw, "sync.RWMutex", "rationale", P07_ADR,
    "Go concurrency strategy for protecting shared mutable state in the in-memory hash-map API."))
nodes.append(n(borrow_tokio, "Borrow checker + tokio async", "rationale", P07_ADR,
    "Rust concurrency strategy leveraging ownership/borrow checker and tokio async for shared state."))
nodes.append(n(event_loop, "Single-threaded event loop", "rationale", P07_ADR,
    "Node.js concurrency strategy relying on the single-threaded event loop for shared state access."))

# Decision drivers (anchored in 07 ADR)
be = f"{S07A}_behavioral_equivalence"
cc = f"{S07A}_concurrency_correctness"
cmp = f"{S07A}_comparability"
nodes.append(n(be, "Behavioral equivalence", "rationale", P07_ADR,
    "Decision driver requiring identical behavior across Go, Rust, and Node implementations so comparisons measure runtime trade-offs."))
nodes.append(n(cc, "Concurrency correctness", "rationale", P07_ADR,
    "Decision driver requiring correct shared mutable state under read/write pressure."))
nodes.append(n(cmp, "Comparability", "rationale", P07_ADR,
    "Decision driver requiring the benchmark to measure the same workload against each runtime."))

# Shared characterization tests
shared_tests = f"{S07A}_shared_characterization_tests"
nodes.append(n(shared_tests, "Shared characterization tests", "rationale", P07_ADR,
    "Contract tests that hold across Go, Rust, and Node implementations to prevent behavioral drift."))

# ADR architecture decision option nodes (per project ADR)
arch_07 = f"{S07A}_hash_map_behind_synchronous_http_api"
arch_08 = f"{S08A}_hash_map_behind_synchronous_http_api"
arch_09 = f"{S09A}_hash_map_behind_synchronous_http_api"
arch_rationale = "Chosen architecture: in-memory hash-map behind an HTTP API with TTL metadata and capacity limits, protected per-language idiomatically. Persistent/disk-backed and event-sourced options were rejected as out of scope or reserved for later cycles."
nodes.append(n(arch_07, "Hash-map behind a synchronous HTTP API", "rationale", P07_ADR, arch_rationale))
nodes.append(n(arch_08, "Hash-map behind a synchronous HTTP API", "rationale", P08_ADR, arch_rationale))
nodes.append(n(arch_09, "Hash-map behind a synchronous HTTP API", "rationale", P09_ADR, arch_rationale))

rejected_persistent = f"{S07A}_persistent_disk_backed_store"
rejected_event_sourced = f"{S07A}_event_sourced_model"
nodes.append(n(rejected_persistent, "Persistent/disk-backed store", "rationale", P07_ADR,
    "Rejected ADR option: would conflate storage with the concurrency learning objective and is out of scope for a fundamentals-level cycle."))
nodes.append(n(rejected_event_sourced, "Event-sourced model", "rationale", P07_ADR,
    "Rejected ADR option: adds complexity inappropriate to the level; reserved for the event-driven cycle (Project 08)."))

# Lesson primary/secondary concept nodes
# 06
streaming = f"{S06L}_streaming_io_with_bounded_memory"
multipart = f"{S06L}_multipart_parsing"
chunked = f"{S06L}_chunked_processing"
backpressure = f"{S06L}_backpressure"
checksums = f"{S06L}_checksums"
file_validation = f"{S06L}_file_validation"
concurrent_upload = f"{S06L}_concurrent_upload_coordination"
metadata_extraction = f"{S06L}_metadata_extraction"
pipeline_style = f"{S06L}_pipeline_style_processing"
nodes.append(n(streaming, "Streaming I/O with bounded memory", "rationale", P06_LESSON,
    "Primary learning objective: handle large files without whole-file buffering in application memory."))
nodes.append(n(multipart, "Multipart parsing", "rationale", P06_LESSON))
nodes.append(n(chunked, "Chunked processing", "rationale", P06_LESSON))
nodes.append(n(backpressure, "Backpressure", "rationale", P06_LESSON))
nodes.append(n(checksums, "Checksums", "rationale", P06_LESSON))
nodes.append(n(file_validation, "File validation", "rationale", P06_LESSON))
nodes.append(n(concurrent_upload, "Concurrent upload coordination", "rationale", P06_LESSON))
nodes.append(n(metadata_extraction, "Metadata extraction", "rationale", P06_LESSON))
nodes.append(n(pipeline_style, "Pipeline-style processing", "rationale", P06_LESSON))

# 07
auth_middleware = f"{S07L}_authentication_authorization_middleware"
jwt = f"{S07L}_jwt_signing_verification"
rbac = f"{S07L}_rbac"
refresh = f"{S07L}_refresh_token_sessions"
input_val = f"{S07L}_input_validation"
api_ver_07 = f"{S07L}_api_versioning"
dep_inj = f"{S07L}_dependency_injection"
audit = f"{S07L}_audit_logging"
secure_err = f"{S07L}_secure_error_handling"
testable = f"{S07L}_testable_service_boundaries"
nodes.append(n(auth_middleware, "Authentication and authorization middleware", "rationale", P07_LESSON,
    "Primary learning objective: compose authn/authz middleware around a layered REST API."))
nodes.append(n(jwt, "JWT signing and verification", "rationale", P07_LESSON))
nodes.append(n(rbac, "RBAC", "rationale", P07_LESSON))
nodes.append(n(refresh, "Refresh-token sessions", "rationale", P07_LESSON))
nodes.append(n(input_val, "Input validation", "rationale", P07_LESSON))
nodes.append(n(api_ver_07, "API versioning", "rationale", P07_LESSON))
nodes.append(n(dep_inj, "Dependency injection", "rationale", P07_LESSON))
nodes.append(n(audit, "Audit logging", "rationale", P07_LESSON))
nodes.append(n(secure_err, "Secure error handling", "rationale", P07_LESSON))
nodes.append(n(testable, "Testable service boundaries", "rationale", P07_LESSON))

# 08
ev_lifecycle = f"{S08L}_event_sourced_order_lifecycle"
async_proj = f"{S08L}_asynchronous_projections"
cmd_val = f"{S08L}_command_validation"
opt_conc = f"{S08L}_optimistic_concurrency"
pub_sub = f"{S08L}_pub_sub_delivery"
eventual = f"{S08L}_eventual_consistency"
proj_rebuild = f"{S08L}_projection_rebuilds"
saga = f"{S08L}_saga_orchestration"
outbox = f"{S08L}_transactional_outbox"
idemp = f"{S08L}_idempotency"
event_replay = f"{S08L}_event_replay"
cross_lang = f"{S08L}_cross_language_architecture_comparison"
nodes.append(n(ev_lifecycle, "Event-sourced order lifecycle", "rationale", P08_LESSON,
    "Primary learning objective: record every order state change as an immutable event."))
nodes.append(n(async_proj, "Asynchronous projections", "rationale", P08_LESSON))
nodes.append(n(cmd_val, "Command validation", "rationale", P08_LESSON))
nodes.append(n(opt_conc, "Optimistic concurrency", "rationale", P08_LESSON))
nodes.append(n(pub_sub, "Pub/sub delivery", "rationale", P08_LESSON))
nodes.append(n(eventual, "Eventual consistency", "rationale", P08_LESSON))
nodes.append(n(proj_rebuild, "Projection rebuilds", "rationale", P08_LESSON))
nodes.append(n(saga, "Saga orchestration", "rationale", P08_LESSON))
nodes.append(n(outbox, "Transactional outbox", "rationale", P08_LESSON))
nodes.append(n(idemp, "Idempotency", "rationale", P08_LESSON))
nodes.append(n(event_replay, "Event replay", "rationale", P08_LESSON))
nodes.append(n(cross_lang, "Cross-language architecture comparison", "rationale", P08_LESSON))

# 09
stable_ext = f"{S09L}_stable_extension_interfaces"
lifecycle_plugins = f"{S09L}_lifecycle_managed_plugins"
dynamic_load = f"{S09L}_dynamic_loading"
interfaces_traits = f"{S09L}_interfaces_traits"
wasm_ffi = f"{S09L}_wasm_ffi_js_sandboxing"
api_ver_09 = f"{S09L}_api_versioning"
hook_dispatch = f"{S09L}_hook_dispatch"
cap_access = f"{S09L}_capability_based_access"
err_iso = f"{S09L}_error_isolation"
mem_res = f"{S09L}_memory_resource_limits"
graceful = f"{S09L}_graceful_shutdown"
nodes.append(n(stable_ext, "Stable extension interfaces", "rationale", P09_LESSON,
    "Primary learning objective: discover, validate, load, run, and unload third-party plugins through a stable interface contract."))
nodes.append(n(lifecycle_plugins, "Lifecycle-managed plugins", "rationale", P09_LESSON))
nodes.append(n(dynamic_load, "Dynamic loading", "rationale", P09_LESSON))
nodes.append(n(interfaces_traits, "Interfaces/traits", "rationale", P09_LESSON))
nodes.append(n(wasm_ffi, "WASM/FFI/JS sandboxing", "rationale", P09_LESSON))
nodes.append(n(api_ver_09, "API versioning", "rationale", P09_LESSON))
nodes.append(n(hook_dispatch, "Hook dispatch", "rationale", P09_LESSON))
nodes.append(n(cap_access, "Capability-based access", "rationale", P09_LESSON))
nodes.append(n(err_iso, "Error isolation", "rationale", P09_LESSON))
nodes.append(n(mem_res, "Memory/resource limits", "rationale", P09_LESSON))
nodes.append(n(graceful, "Graceful shutdown", "rationale", P09_LESSON))

# Red-team findings
# 06
rt06_state = f"{S06R}_terminal_upload_state_in_memory_only"
rt06_thumb = f"{S06R}_thumbnail_generation_image_dimensions_placeholder"
rt06_registry = f"{S06R}_registry_list_unsorted_map_pagination"
rt06_cancel = f"{S06R}_cancellation_flag_based"
rt06_oversize = f"{S06R}_oversize_uploads_keep_reading"
nodes.append(n(rt06_state, "Terminal upload state is in-memory only", "concept", P06_REDTEAM,
    "Major finding: Go/Rust/Node implementations do not persist terminal upload state across restarts."))
nodes.append(n(rt06_thumb, "Thumbnail generation and image dimensions are placeholders", "concept", P06_REDTEAM,
    "Major finding: documented but not implemented in Go/Rust/Node."))
nodes.append(n(rt06_registry, "Registry.list iterates an unsorted map, making pagination unstable", "concept", P06_REDTEAM))
nodes.append(n(rt06_cancel, "Cancellation is flag-based and only checked between received chunks", "concept", P06_REDTEAM))
nodes.append(n(rt06_oversize, "Oversize uploads keep reading after size is exceeded", "concept", P06_REDTEAM))

# 07
rt07_hash = f"{S07R}_custom_password_hashing_should_not_replace_vetted_kdf"
rt07_refresh = f"{S07R}_refresh_rotation_not_atomic"
rt07_method = f"{S07R}_method_not_allowed_bypass_error_envelope"
rt07_token = f"{S07R}_token_verification_no_session_jti_revocation"
rt07_pbkdf2 = f"{S07R}_blocking_pbkdf2_event_loop"
nodes.append(n(rt07_hash, "Custom password hashing should not replace a vetted KDF", "concept", P07_REDTEAM))
nodes.append(n(rt07_refresh, "Refresh rotation is not atomic for concurrent replay attempts", "concept", P07_REDTEAM))
nodes.append(n(rt07_method, "Method-not-allowed responses bypass the common error envelope", "concept", P07_REDTEAM))
nodes.append(n(rt07_token, "Token verification does not check session/JTI revocation state", "concept", P07_REDTEAM))
nodes.append(n(rt07_pbkdf2, "Blocking PBKDF2 work runs on the event loop", "concept", P07_REDTEAM))

# Security report mitigations / findings
sec06_input = f"{S06SEC}_input_validation_at_serialization_boundary"
sec06_deploy = f"{S06SEC}_secret_management_tls_rate_limiting"
nodes.append(n(sec06_input, "Validate client input at the serialization boundary", "rationale", P06_SECURITY,
    "Mitigation: treat all client input as untrusted and validate before it touches internal state."))
nodes.append(n(sec06_deploy, "Secret management, TLS, and rate-limiting", "rationale", P06_SECURITY,
    "Required before deploying any lab project on a non-localhost interface or with persistence."))

# 07 security findings
sf07_hash = f"{S07SEC}_go_custom_password_hashing"
sf07_refresh = f"{S07SEC}_go_refresh_rotation_not_atomic"
sf07_token = f"{S07SEC}_go_token_verification_no_revocation"
sf07_jwtneg = f"{S07SEC}_go_jwt_negative_tests_missing"
sf07_ntoken = f"{S07SEC}_node_token_verification_no_revocation"
sf07_replay = f"{S07SEC}_node_replay_audit_metadata_mutated_status"
sf07_cfg = f"{S07SEC}_node_config_omits_password_iterations"
sf07_schema = f"{S07SEC}_node_runtime_validation_hand_written"
nodes.append(n(sf07_hash, "[GO] Custom password hashing should not replace a vetted KDF", "concept", P07_SECURITY))
nodes.append(n(sf07_refresh, "[GO] Refresh rotation is not atomic for concurrent replay attempts", "concept", P07_SECURITY))
nodes.append(n(sf07_token, "[GO] Token verification does not check session/JTI revocation state", "concept", P07_SECURITY))
nodes.append(n(sf07_jwtneg, "[GO] Tests do not cover expired/wrong-audience/wrong-signature JWT variants", "concept", P07_SECURITY))
nodes.append(n(sf07_ntoken, "[NODE] Token verification does not consult session/JTI state", "concept", P07_SECURITY))
nodes.append(n(sf07_replay, "[NODE] Replay audit metadata records the mutated status, not previous status", "concept", P07_SECURITY))
nodes.append(n(sf07_cfg, "[NODE] Config source omits password iterations in main.ts", "concept", P07_SECURITY))
nodes.append(n(sf07_schema, "[NODE] Runtime validation hand-written today; schema validation is the next step", "concept", P07_SECURITY))

# Status phase nodes
phase_06 = f"{S06S}_cycle_complete"
next_06 = f"{S06S}_evidence_and_hardening"
next_07 = f"{S07S}_security_hardening_and_benchmarking"
evo_08 = f"{S08S}_evolution_cycle"
nodes.append(n(phase_06, "cycle-complete", "concept", P06_STATUS,
    "Phase indicating implementations are done and reviewable for the current learning cycle, not that all non-functional requirements are proven."))
nodes.append(n(next_06, "evidence-and-hardening", "concept", P06_STATUS,
    "Recommended next phase for Project 06: add durable metadata, chunked client tests, large-concurrent benchmarks, and decide thumbnail generation."))
nodes.append(n(next_07, "security-hardening-and-benchmarking", "concept", P07_STATUS,
    "Recommended next phase for Project 07: refresh-token atomicity, vetted password hashing, JWT negative tests, and auth middleware latency evidence."))
nodes.append(n(evo_08, "evolution cycle", "concept", P08_STATUS,
    "Future work for Project 08: durable persistence, independent workers, real lag benchmarks, and crash-recovery tests."))

# Verdict trade-offs
throughput_mem = f"{S06V}_throughput_vs_memory"
ergonomics_corr = f"{S06V}_ergonomics_vs_correctness_confidence"
p50_p99 = f"{S06V}_p50_vs_p99"
nodes.append(n(throughput_mem, "Throughput vs. memory", "rationale", P06_VERDICT,
    "Trade-off: the highest-RPS runtime is not necessarily the lowest-RSS one; GC'd runtimes buy concurrency ergonomics at a memory cost vs. Rust."))
nodes.append(n(ergonomics_corr, "Ergonomics vs. correctness-confidence", "rationale", P06_VERDICT,
    "Trade-off: Go's sync.RWMutex is easy to write but easy to deadlock/misuse; Rust's borrow checker prevents data races but raises implementation cost."))
nodes.append(n(p50_p99, "p50 vs. p99", "rationale", P06_VERDICT,
    "Trade-off: a runtime can win on average latency while losing on the tail; p99 is the robustness signal."))

lead_06 = f"{S06V}_node_leads_throughput_2368"
lead_07 = f"{S07V}_node_leads_throughput_2691"
lead_08 = f"{S08V}_rust_leads_throughput_2781"
nodes.append(n(lead_06, "node leads on raw throughput (2368 req/s)", "concept", P06_VERDICT))
nodes.append(n(lead_07, "node leads on raw throughput (2691 req/s)", "concept", P07_VERDICT))
nodes.append(n(lead_08, "rust leads on raw throughput (2781 req/s)", "concept", P08_VERDICT))

# Benchmark methodology / caveats
k6_07 = f"{S07B}_k6_healthz_workload"
macos = f"{S07B}_macos_arm64_homebrew_toolchain"
k6_08 = f"{S08B}_k6_health_workload"
rust_demo = f"{S09B}_rust_demo_not_long_running_server"
nodes.append(n(k6_07, "k6 /healthz read workload", "concept", P07_BENCH,
    "Benchmark methodology: ramp 0→50→100→0 VUs over ~25s against a /healthz endpoint."))
nodes.append(n(macos, "macOS arm64 Apple Silicon with Homebrew toolchain", "concept", P07_BENCH))
nodes.append(n(k6_08, "k6 /health read workload", "concept", P08_BENCH,
    "Benchmark methodology: ramp 0→50→100→0 VUs over ~25s against a /health endpoint."))
nodes.append(n(rust_demo, "Rust implementation is a demo/library, not a long-running server", "concept", P09_BENCH,
    "Rust plugin-system did not become ready for HTTP benchmarking; builds and unit tests pass but does not expose a long-running endpoint."))

# Project 08 status functional-area nodes
imm_env = f"{S08S}_immutable_event_envelopes"
agg_fold = f"{S08S}_aggregate_folding"
replay_integ = f"{S08S}_replay_integrity"
at_least_once = f"{S08S}_at_least_once_publish_path"
sub_fail = f"{S08S}_subscriber_failure_visibility"
saga_08 = f"{S08S}_fulfillment_saga"
health_08 = f"{S08S}_health_endpoint_backlog_lag_failure"
nodes.append(n(imm_env, "Immutable event envelopes with per-aggregate sequence and global position", "concept", P08_STATUS))
nodes.append(n(agg_fold, "Aggregate folding", "concept", P08_STATUS))
nodes.append(n(replay_integ, "Replay integrity", "concept", P08_STATUS))
nodes.append(n(at_least_once, "At-least-once-style publish path", "concept", P08_STATUS))
nodes.append(n(sub_fail, "Subscriber failure visibility", "concept", P08_STATUS))
nodes.append(n(saga_08, "Fulfillment saga", "concept", P08_STATUS))
nodes.append(n(health_08, "Health endpoint with backlog/lag/failure fields", "concept", P08_STATUS))


# EDGES

# Project -> mental model
edges.append(e(proj_06, hm_06, "conceptually_related_to", "EXTRACTED", 1.0, P06_LESSON))
edges.append(e(proj_07, hm_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_LESSON))
edges.append(e(proj_08, hm_08, "conceptually_related_to", "EXTRACTED", 1.0, P08_LESSON))
edges.append(e(proj_09, hm_09, "conceptually_related_to", "EXTRACTED", 1.0, P09_LESSON))

# Project -> primary concept
edges.append(e(proj_06, streaming, "conceptually_related_to", "EXTRACTED", 1.0, P06_LESSON))
edges.append(e(proj_07, auth_middleware, "conceptually_related_to", "EXTRACTED", 1.0, P07_LESSON))
edges.append(e(proj_08, ev_lifecycle, "conceptually_related_to", "EXTRACTED", 1.0, P08_LESSON))
edges.append(e(proj_09, stable_ext, "conceptually_related_to", "EXTRACTED", 1.0, P09_LESSON))

# Project -> secondary concepts
for tgt in [multipart, chunked, backpressure, checksums, file_validation, concurrent_upload, metadata_extraction, pipeline_style]:
    edges.append(e(proj_06, tgt, "conceptually_related_to", "EXTRACTED", 1.0, P06_LESSON))
for tgt in [jwt, rbac, refresh, input_val, api_ver_07, dep_inj, audit, secure_err, testable]:
    edges.append(e(proj_07, tgt, "conceptually_related_to", "EXTRACTED", 1.0, P07_LESSON))
for tgt in [async_proj, cmd_val, opt_conc, pub_sub, eventual, proj_rebuild, saga, outbox, idemp, event_replay, cross_lang]:
    edges.append(e(proj_08, tgt, "conceptually_related_to", "EXTRACTED", 1.0, P08_LESSON))
for tgt in [lifecycle_plugins, dynamic_load, interfaces_traits, wasm_ffi, api_ver_09, hook_dispatch, cap_access, err_iso, mem_res, graceful]:
    edges.append(e(proj_09, tgt, "conceptually_related_to", "EXTRACTED", 1.0, P09_LESSON))

# Hash-map mental model -> concurrency strategies (explicit in formal section)
for hm in [hm_06, hm_07, hm_08, hm_09]:
    for strat in [sync_rw, borrow_tokio, event_loop]:
        edges.append(e(hm, strat, "conceptually_related_to", "EXTRACTED", 1.0,
            P06_LESSON if hm == hm_06 else (P07_LESSON if hm == hm_07 else (P08_LESSON if hm == hm_08 else P09_LESSON))))

# Lessons cite benchmark results (explicit)
edges.append(e(hm_07, bench_07, "references", "EXTRACTED", 1.0, P07_LESSON))
edges.append(e(hm_08, bench_08, "references", "EXTRACTED", 1.0, P08_LESSON))
edges.append(e(hm_09, bench_09, "references", "EXTRACTED", 1.0, P09_LESSON))

# ADR architecture decisions
# decision drivers -> chosen architecture
for arch in [arch_07, arch_08, arch_09]:
    edges.append(e(be, arch, "rationale_for", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(cc, arch, "rationale_for", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(cmp, arch, "rationale_for", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(shared_tests, arch, "rationale_for", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(arch, sync_rw, "conceptually_related_to", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(arch, borrow_tokio, "conceptually_related_to", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(arch, event_loop, "conceptually_related_to", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(rejected_persistent, arch, "conceptually_related_to", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(rejected_event_sourced, arch, "conceptually_related_to", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85, P07_ADR))
    edges.append(e(arch, bench_07 if arch == arch_07 else (bench_08 if arch == arch_08 else bench_09), "references", "EXTRACTED" if arch == arch_07 else "INFERRED", 1.0 if arch == arch_07 else 0.85,
        P07_ADR if arch == arch_07 else (P08_ADR if arch == arch_08 else P09_ADR)))

# Architecture -> project rationale
edges.append(e(arch_07, proj_07, "rationale_for", "EXTRACTED", 1.0, P07_ADR))
edges.append(e(arch_08, proj_08, "rationale_for", "INFERRED", 0.85, P08_ADR))
edges.append(e(arch_09, proj_09, "rationale_for", "INFERRED", 0.85, P09_ADR))

# Red-team findings -> project
for finding in [rt06_state, rt06_thumb, rt06_registry, rt06_cancel, rt06_oversize]:
    edges.append(e(finding, proj_06, "conceptually_related_to", "EXTRACTED", 1.0, P06_REDTEAM))
for finding in [rt07_hash, rt07_refresh, rt07_method, rt07_token, rt07_pbkdf2]:
    edges.append(e(finding, proj_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_REDTEAM))

# Security mitigations -> security report
edges.append(e(sec06_input, sec_06, "rationale_for", "EXTRACTED", 1.0, P06_SECURITY))
edges.append(e(sec06_deploy, sec_06, "rationale_for", "EXTRACTED", 1.0, P06_SECURITY))
for finding in [sf07_hash, sf07_refresh, sf07_token, sf07_jwtneg, sf07_ntoken, sf07_replay, sf07_cfg, sf07_schema]:
    edges.append(e(finding, sec_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_SECURITY))
    edges.append(e(finding, proj_07, "conceptually_related_to", "INFERRED", 0.75, P07_SECURITY))

# Security findings <-> red-team findings (semantic cross-cutting)
edges.append(e(rt07_hash, sf07_hash, "semantically_similar_to", "INFERRED", 0.9, P07_REDTEAM))
edges.append(e(rt07_refresh, sf07_refresh, "semantically_similar_to", "INFERRED", 0.9, P07_REDTEAM))
edges.append(e(rt07_token, sf07_token, "semantically_similar_to", "INFERRED", 0.9, P07_REDTEAM))
edges.append(e(rt07_token, sf07_ntoken, "semantically_similar_to", "INFERRED", 0.85, P07_REDTEAM))

# Status phases -> projects
edges.append(e(phase_06, proj_06, "conceptually_related_to", "EXTRACTED", 1.0, P06_STATUS))
edges.append(e(next_06, proj_06, "conceptually_related_to", "EXTRACTED", 1.0, P06_STATUS))
edges.append(e(next_07, proj_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_STATUS))
edges.append(e(evo_08, proj_08, "conceptually_related_to", "EXTRACTED", 1.0, P08_STATUS))

# Verdicts
edges.append(e(lead_07, bench_07, "references", "EXTRACTED", 1.0, P07_VERDICT))
edges.append(e(lead_08, bench_08, "references", "EXTRACTED", 1.0, P08_VERDICT))
# 06 verdict references benchmark_results.md which is not in this chunk, so skip

# Trade-offs appear in all verdicts (06 source, 07/08 inferred references)
for verdict_src, verdict_node, bench_node in [(P07_VERDICT, lead_07, bench_07), (P08_VERDICT, lead_08, bench_08)]:
    for trade in [throughput_mem, ergonomics_corr, p50_p99]:
        edges.append(e(verdict_node, trade, "conceptually_related_to", "INFERRED", 0.85, verdict_src))
    if bench_node:
        edges.append(e(verdict_node, bench_node, "references", "EXTRACTED", 1.0, verdict_src))

# Lead claims are semantically similar across projects
edges.append(e(lead_06, lead_07, "semantically_similar_to", "INFERRED", 0.85, P06_VERDICT))
edges.append(e(lead_07, lead_08, "semantically_similar_to", "INFERRED", 0.85, P07_VERDICT))

# Benchmark methodology -> benchmark document
edges.append(e(k6_07, bench_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_BENCH))
edges.append(e(macos, bench_07, "conceptually_related_to", "EXTRACTED", 1.0, P07_BENCH))
edges.append(e(k6_08, bench_08, "conceptually_related_to", "EXTRACTED", 1.0, P08_BENCH))
edges.append(e(rust_demo, bench_09, "conceptually_related_to", "EXTRACTED", 1.0, P09_BENCH))

# Project 08 status functional areas -> project
for n8 in [imm_env, agg_fold, replay_integ, at_least_once, sub_fail, saga_08, health_08]:
    edges.append(e(n8, proj_08, "conceptually_related_to", "EXTRACTED", 1.0, P08_STATUS))

# Cross-project semantic similarities
edges.append(e(api_ver_07, api_ver_09, "semantically_similar_to", "INFERRED", 0.85, P07_LESSON))
edges.append(e(input_val, sec06_input, "semantically_similar_to", "INFERRED", 0.75, P07_LESSON))
edges.append(e(ev_lifecycle, rejected_event_sourced, "semantically_similar_to", "INFERRED", 0.85, P08_LESSON))
edges.append(e(arch_07, hm_07, "semantically_similar_to", "INFERRED", 0.9, P07_ADR))

# Hyperedges
hyperedges = [
    {
        "id": "shared_hash_map_mental_model",
        "label": "Shared hash-map-behind-API mental model across cycles",
        "nodes": [hm_06, hm_07, hm_08, hm_09],
        "relation": "participate_in",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": P06_LESSON,
    },
    {
        "id": "per_language_concurrency_strategies",
        "label": "Per-language concurrency strategies",
        "nodes": [sync_rw, borrow_tokio, event_loop],
        "relation": "form",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": P07_ADR,
    },
    {
        "id": "verdict_tradeoff_dimensions",
        "label": "Verdict trade-off dimensions",
        "nodes": [throughput_mem, ergonomics_corr, p50_p99],
        "relation": "form",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": P06_VERDICT,
    },
]

output = {
    "nodes": nodes,
    "edges": edges,
    "hyperedges": hyperedges,
    "input_tokens": 0,
    "output_tokens": 0,
}

OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(nodes)} nodes, {len(edges)} edges, {len(hyperedges)} hyperedges to {OUT}")
