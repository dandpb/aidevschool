#!/usr/bin/env python3
"""Generate graphify chunk 015 JSON extraction."""
import json
import re
import os

ROOT = "/Users/danielbarreto/Development/aidevschool"

def stem(path: str) -> str:
    rel = path.replace(ROOT + "/", "")
    rel_no_ext = rel.rsplit(".", 1)[0]
    return re.sub(r"[^a-z0-9]+", "_", rel_no_ext.lower()).strip("_")

def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(s).lower()).strip("_")

def doc_id(path: str) -> str:
    base = os.path.basename(path).rsplit(".", 1)[0]
    return f"{stem(path)}_{norm(base)}"

def cid(path: str, label: str) -> str:
    return f"{stem(path)}_{norm(label)}"

# Concept labels per file
CONCEPTS = {
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md": [
        "Event-Driven Order System",
        "Immutable event",
        "Deterministic under concurrency",
        "Hash map behind an API",
        "Throughput vs correctness trade-off",
        "Behavioral equivalence",
        "Cross-language architecture comparison",
        "Event-sourced order lifecycle",
        "Asynchronous projections",
        "Command validation",
        "Optimistic concurrency",
        "Pub/sub delivery",
        "Eventual consistency",
        "Projection rebuilds",
        "Saga orchestration",
        "Transactional outbox",
        "Idempotency",
        "Event replay",
        "k6 workload",
        "TTL expiry races",
        "Capacity eviction",
        "Serialization-boundary validation",
        "Go sync.RWMutex",
        "Rust borrow checker",
        "tokio async",
        "Node event loop",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/redteam.md": [
        "Concurrent read/write on shared state",
        "Empty / oversized / malformed input",
        "TTL expiry races (reader vs. expirer)",
        "Capacity / memory exhaustion",
        "Cross-language behavioral drift",
        "Signed off with mitigations",
        "Code review remediation",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/status.md": [
        "cycle-complete",
        "Node/TypeScript implementation",
        "Go implementation",
        "Rust implementation",
        "Command API",
        "Immutable event envelopes",
        "Aggregate folding",
        "Idempotent command handling",
        "Transactional-outbox boundary",
        "Order summary projection",
        "Replay operation",
        "Fulfillment saga",
        "Health endpoint",
        "Automated tests",
        "In-memory event store caveat",
        "Synchronous background work caveat",
        "Synchronous replay caveat",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/verdict.md": [
        "rust leads throughput (2781 req/s)",
        "Evidence summary",
        "Throughput vs memory trade-off",
        "Ergonomics vs correctness-confidence trade-off",
        "p50 vs p99 trade-off",
        "N≥3 independent benchmark reruns",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/security/report.md": [
        "Static review scope",
        "Input validation",
        "Secret management",
        "TLS",
        "Rate-limiting",
        "No critical findings",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/ADR.md": [
        "Hash-map behind a synchronous HTTP API",
        "Behavioral equivalence driver",
        "Concurrency correctness driver",
        "Comparability driver",
        "Persistent/disk-backed store (rejected)",
        "Event-sourced model (rejected)",
        "Shared characterization contract",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/benchmark_results.md": [
        "k6 health read workload",
        "Go benchmark result (2331 req/s)",
        "Node benchmark result (2349 req/s)",
        "Rust not benchmarked (demo/library)",
        "Peak RSS metric",
        "Latency percentile metric",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/lesson.md": [
        "Plugin System",
        "Stable extension interfaces",
        "Lifecycle-managed plugins",
        "Dynamic loading",
        "Interfaces/traits",
        "WASM/FFI/JS sandboxing",
        "API versioning",
        "Hook dispatch",
        "Capability-based access",
        "Error isolation",
        "Memory/resource limits",
        "Graceful shutdown",
        "Hash map behind an API",
        "Deterministic under concurrency",
        "Throughput vs correctness trade-off",
        "k6 workload",
        "TTL expiry races",
        "Capacity eviction",
        "Serialization-boundary validation",
        "Go sync.RWMutex",
        "Rust borrow checker",
        "tokio async",
        "Node event loop",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/redteam.md": [
        "Concurrent read/write on shared state",
        "Empty / oversized / malformed input",
        "TTL expiry races (reader vs. expirer)",
        "Capacity / memory exhaustion",
        "Cross-language behavioral drift",
        "Signed off with mitigations",
        "Code review remediation",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/status.md": [
        "cycle-complete",
        "Node/TypeScript implementation",
        "Go implementation",
        "Rust implementation",
        "Manifest-first plugin registration",
        "API compatibility check host version 1.2.0",
        "Lifecycle state machine load/init/start/stop/unload",
        "Hook subscriptions with priority",
        "Capability grants and denials",
        "Disabled plugin behavior",
        "Plugin-scoped failure capture",
        "Metrics lifecycle/hook calls/failures/crashes/durations",
        "HTTP management APIs",
        "In-process isolation caveat",
        "Timeout/memory budget caveat",
        "Registry persistence caveat",
        "Rust lacks full HTTP API caveat",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/verdict.md": [
        "node leads throughput (2349 req/s)",
        "Evidence summary",
        "Throughput vs memory trade-off",
        "Ergonomics vs correctness-confidence trade-off",
        "p50 vs p99 trade-off",
        "N≥3 independent benchmark reruns",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/security/report.md": [
        "Static review scope",
        "Input validation",
        "Secret management",
        "TLS",
        "Rate-limiting",
        "No critical findings",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/ADR.md": [
        "Hash-map behind a synchronous HTTP API",
        "Behavioral equivalence driver",
        "Concurrency correctness driver",
        "Comparability driver",
        "Persistent/disk-backed store (rejected)",
        "Event-sourced model (rejected)",
        "Shared characterization contract",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/benchmark_results.md": [
        "k6 health read workload",
        "Go benchmark result (2512 req/s)",
        "Rust not benchmarked (demo/library)",
        "Node build failed or no server binary",
        "Peak RSS metric",
        "Latency percentile metric",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/lesson.md": [
        "Distributed Cache",
        "Consistent hashing",
        "Freshness/eviction semantics",
        "TTL expiration",
        "LRU/LFU policy tradeoffs",
        "Cache-aside vs write-through",
        "Invalidation",
        "Gossip membership",
        "Request coalescing/singleflight",
        "Sharding",
        "Hot-key behavior",
        "Failure-aware API design",
        "Hash map behind an API",
        "Deterministic under concurrency",
        "Throughput vs correctness trade-off",
        "k6 workload",
        "TTL expiry races",
        "Capacity eviction",
        "Serialization-boundary validation",
        "Go sync.RWMutex",
        "Rust borrow checker",
        "tokio async",
        "Node event loop",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/redteam.md": [
        "[CRITICAL] unspecified",
        "No real remote-shard path",
        "Gossip membership not implemented",
        "Concurrent read/write on shared state",
        "Empty / oversized / malformed input",
        "TTL expiry races (reader vs. expirer)",
        "Capacity / memory exhaustion",
        "Cross-language behavioral drift",
        "Signed off with mitigations",
        "Code review remediation",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/status.md": [
        "cycle-complete",
        "Local cache API",
        "TTL and eviction",
        "Consistent hashing scaffolded",
        "Cache-aside/write-through scaffolded",
        "Gossip membership planned",
        "Stampede prevention scaffolded",
        "Observability scaffolded",
        "Remote shard routing gap",
        "Node removal gap",
        "Data migration gap",
        "Failure simulation gap",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/verdict.md": [
        "go leads throughput (2512 req/s)",
        "Evidence summary",
        "Throughput vs memory trade-off",
        "Ergonomics vs correctness-confidence trade-off",
        "p50 vs p99 trade-off",
        "N≥3 independent benchmark reruns",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/security/report.md": [
        "Static review scope",
        "Input validation",
        "Secret management",
        "TLS",
        "Rate-limiting",
        "No critical findings",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/ADR.md": [
        "Hash-map behind a synchronous HTTP API",
        "Behavioral equivalence driver",
        "Concurrency correctness driver",
        "Comparability driver",
        "Persistent/disk-backed store (rejected)",
        "Event-sourced model (rejected)",
        "Shared characterization contract",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/benchmark_results.md": [
        "k6 /__lb/health workload",
        "Go benchmark result (2762 req/s)",
        "Rust benchmark result (2787 req/s)",
        "Node benchmark result (2784 req/s)",
        "Peak RSS metric",
        "Latency percentile metric",
    ],
    "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/lesson.md": [
        "Load Balancer",
        "Reverse proxy load balancing",
        "Health-aware request routing",
        "Active/passive health checks",
        "Backend pools",
        "Round-robin",
        "Least-connections",
        "Consistent hashing",
        "Weighted distribution",
        "Sticky sessions",
        "TLS termination",
        "Circuit breakers",
        "Failover",
        "Connection pooling",
        "High-throughput HTTP handling",
        "Hash map behind an API",
        "Deterministic under concurrency",
        "Throughput vs correctness trade-off",
        "k6 workload",
        "TTL expiry races",
        "Capacity eviction",
        "Serialization-boundary validation",
        "Go sync.RWMutex",
        "Rust borrow checker",
        "tokio async",
        "Node event loop",
    ],
}

DOC_LABELS = {
    "lesson.md": "Lesson",
    "redteam.md": "Red Team",
    "status.md": "Status",
    "verdict.md": "Verdict",
    "report.md": "Security Report",
    "ADR.md": "ADR",
    "benchmark_results.md": "Benchmark Results",
}

RATIONALES = {
    ("/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md", "Event-Driven Order System"):
        "Build a small event-driven order system where every state change is recorded as an immutable event.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md", "Deterministic under concurrency"):
        '"Correct" means deterministic under concurrency, not just works on my machine.',
    ("/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md", "Hash map behind an API"):
        "Mental model: clients address opaque values by string keys and expect predictable CRUD/expire/enumerate behavior under concurrency.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md", "Throughput vs correctness trade-off"):
        "Formal tension between throughput (lock-free/channel-based concurrency) and correctness (serializability of read/write on shared state).",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md", "Behavioral equivalence"):
        "Three implementations expose behaviorally-equivalent contracts over the same data model (hash-map string→value with TTL).",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/ADR.md", "Hash-map behind a synchronous HTTP API"):
        "Chosen option: in-memory hash-map behind an HTTP API, protected per-language idiomatically. Isolates concurrency + serialization learning objective.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/ADR.md", "Persistent/disk-backed store (rejected)"):
        "Rejected: out of scope for a fundamentals-level cycle and would conflate storage with the concurrency learning objective.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/ADR.md", "Event-sourced model (rejected)"):
        "Rejected: adds complexity inappropriate to the level; reserved for Project 08 event-driven cycle.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/lesson.md", "Plugin System"):
        "Build a language-neutral host application that discovers, validates, loads, runs, and unloads third-party plugins through a stable interface contract.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/lesson.md", "Distributed Cache"):
        "Build a language-neutral distributed cache exposing an HTTP API for key-value operations while spreading entries across shard nodes with consistent hashing.",
    ("/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/lesson.md", "Load Balancer"):
        "Build a language-neutral Layer 7 HTTP/HTTPS load balancer.",
}

nodes = []
edges = []

# Build document and concept nodes
for path, labels in CONCEPTS.items():
    d_id = doc_id(path)
    base = os.path.basename(path)
    doc_label = DOC_LABELS.get(base, base)
    nodes.append({
        "id": d_id,
        "label": doc_label,
        "file_type": "document",
        "source_file": path,
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": None,
        "contributor": None,
    })
    for label in labels:
        c_id = cid(path, label)
        node = {
            "id": c_id,
            "label": label,
            "file_type": "rationale",
            "source_file": path,
            "source_location": None,
            "source_url": None,
            "captured_at": None,
            "author": None,
            "contributor": None,
        }
        if (path, label) in RATIONALES:
            node["rationale"] = RATIONALES[(path, label)]
        nodes.append(node)
        edges.append({
            "source": d_id,
            "target": c_id,
            "relation": "conceptually_related_to",
            "confidence": "EXTRACTED",
            "confidence_score": 1.0,
            "source_file": path,
            "source_location": None,
            "weight": 1.0,
        })

def e(src_path, src_label, tgt_path, tgt_label, relation, conf, score):
    edges.append({
        "source": cid(src_path, src_label),
        "target": cid(tgt_path, tgt_label),
        "relation": relation,
        "confidence": conf,
        "confidence_score": score,
        "source_file": src_path,
        "source_location": None,
        "weight": 1.0,
    })

def ref(src_path, tgt_path):
    edges.append({
        "source": doc_id(src_path),
        "target": doc_id(tgt_path),
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": src_path,
        "source_location": None,
        "weight": 1.0,
    })

# ---------- Project 08 lesson internal edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md"
e(p, "Event-Driven Order System", p, "Immutable event", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Event-Driven Order System", p, "Deterministic under concurrency", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Event-Driven Order System", p, "Hash map behind an API", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Event-Driven Order System", p, "Event-sourced order lifecycle", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Event-sourced order lifecycle", p, "Immutable event", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Event replay", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Asynchronous projections", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Projection rebuilds", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Saga orchestration", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Transactional outbox", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Event-sourced order lifecycle", p, "Idempotency", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Hash map behind an API", p, "Deterministic under concurrency", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Deterministic under concurrency", p, "Throughput vs correctness trade-off", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Throughput vs correctness trade-off", p, "k6 workload", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Behavioral equivalence", p, "Cross-language architecture comparison", "conceptually_related_to", "EXTRACTED", 1.0)
for lang_model in ["Go sync.RWMutex", "Rust borrow checker", "tokio async", "Node event loop"]:
    e(p, lang_model, p, "Deterministic under concurrency", "conceptually_related_to", "INFERRED", 0.75)

# ---------- Project 08 cross-doc references ----------
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/benchmark_results.md")
vp08 = "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/verdict.md"
ref(vp08, "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/benchmark_results.md")
ref(vp08, "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/security/report.md")

# ---------- Project 09 ADR edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/ADR.md"
e(p, "Behavioral equivalence driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Concurrency correctness driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Comparability driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Persistent/disk-backed store (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Event-sourced model (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Shared characterization contract", p, "Behavioral equivalence driver", "conceptually_related_to", "EXTRACTED", 1.0)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/benchmark_results.md")

# ---------- Project 09 lesson internal edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/lesson.md"
e(p, "Plugin System", p, "Stable extension interfaces", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Lifecycle-managed plugins", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Dynamic loading", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Interfaces/traits", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "WASM/FFI/JS sandboxing", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "API versioning", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Hook dispatch", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Capability-based access", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Error isolation", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Memory/resource limits", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Plugin System", p, "Graceful shutdown", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Capability-based access", p, "Error isolation", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Hook dispatch", p, "Lifecycle-managed plugins", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Hash map behind an API", p, "Deterministic under concurrency", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Deterministic under concurrency", p, "Throughput vs correctness trade-off", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Throughput vs correctness trade-off", p, "k6 workload", "conceptually_related_to", "INFERRED", 0.75)
for lang_model in ["Go sync.RWMutex", "Rust borrow checker", "tokio async", "Node event loop"]:
    e(p, lang_model, p, "Deterministic under concurrency", "conceptually_related_to", "INFERRED", 0.75)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/benchmark_results.md")

# ---------- Project 09 verdict / benchmark edges ----------
vp09 = "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/verdict.md"
ref(vp09, "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/benchmark_results.md")
ref(vp09, "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/security/report.md")

# ---------- Project 10 ADR edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/ADR.md"
e(p, "Behavioral equivalence driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Concurrency correctness driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Comparability driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Persistent/disk-backed store (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Event-sourced model (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Shared characterization contract", p, "Behavioral equivalence driver", "conceptually_related_to", "EXTRACTED", 1.0)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/benchmark_results.md")

# ---------- Project 10 lesson internal edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/lesson.md"
e(p, "Distributed Cache", p, "Consistent hashing", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Freshness/eviction semantics", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "TTL expiration", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "LRU/LFU policy tradeoffs", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Cache-aside vs write-through", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Invalidation", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Gossip membership", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Request coalescing/singleflight", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Sharding", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Hot-key behavior", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Distributed Cache", p, "Failure-aware API design", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Consistent hashing", p, "Sharding", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Request coalescing/singleflight", p, "Hot-key behavior", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Hash map behind an API", p, "Deterministic under concurrency", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Deterministic under concurrency", p, "Throughput vs correctness trade-off", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Throughput vs correctness trade-off", p, "k6 workload", "conceptually_related_to", "INFERRED", 0.75)
for lang_model in ["Go sync.RWMutex", "Rust borrow checker", "tokio async", "Node event loop"]:
    e(p, lang_model, p, "Deterministic under concurrency", "conceptually_related_to", "INFERRED", 0.75)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/benchmark_results.md")

# ---------- Project 10 redteam internal edges ----------
rtp10 = "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/redteam.md"
e(rtp10, "No real remote-shard path", rtp10, "Gossip membership not implemented", "conceptually_related_to", "INFERRED", 0.85)

# ---------- Project 10 verdict / benchmark edges ----------
vp10 = "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/verdict.md"
ref(vp10, "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/benchmark_results.md")
ref(vp10, "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/security/report.md")

# ---------- Project 11 ADR edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/ADR.md"
e(p, "Behavioral equivalence driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Concurrency correctness driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Comparability driver", p, "Hash-map behind a synchronous HTTP API", "rationale_for", "EXTRACTED", 1.0)
e(p, "Persistent/disk-backed store (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Event-sourced model (rejected)", p, "Hash-map behind a synchronous HTTP API", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Shared characterization contract", p, "Behavioral equivalence driver", "conceptually_related_to", "EXTRACTED", 1.0)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/benchmark_results.md")

# ---------- Project 11 lesson internal edges ----------
p = "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/lesson.md"
e(p, "Load Balancer", p, "Reverse proxy load balancing", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Health-aware request routing", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Active/passive health checks", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Backend pools", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Round-robin", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Least-connections", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Consistent hashing", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Weighted distribution", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Sticky sessions", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "TLS termination", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Circuit breakers", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Failover", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "Connection pooling", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Load Balancer", p, "High-throughput HTTP handling", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Health-aware request routing", p, "Active/passive health checks", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Backend pools", p, "Round-robin", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Backend pools", p, "Least-connections", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Backend pools", p, "Consistent hashing", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Backend pools", p, "Weighted distribution", "conceptually_related_to", "INFERRED", 0.75)
e(p, "Circuit breakers", p, "Failover", "conceptually_related_to", "INFERRED", 0.85)
e(p, "Hash map behind an API", p, "Deterministic under concurrency", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Deterministic under concurrency", p, "Throughput vs correctness trade-off", "conceptually_related_to", "EXTRACTED", 1.0)
e(p, "Throughput vs correctness trade-off", p, "k6 workload", "conceptually_related_to", "INFERRED", 0.75)
for lang_model in ["Go sync.RWMutex", "Rust borrow checker", "tokio async", "Node event loop"]:
    e(p, lang_model, p, "Deterministic under concurrency", "conceptually_related_to", "INFERRED", 0.75)
ref(p, "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/benchmark_results.md")

# ---------- Cross-project semantic similarity (non-obvious, cross-cutting) ----------
lessons = [
    "/Users/danielbarreto/Development/aidevschool/curriculum/08_event_driven_order_system/docs/lesson.md",
    "/Users/danielbarreto/Development/aidevschool/curriculum/09_plugin_system/docs/lesson.md",
    "/Users/danielbarreto/Development/aidevschool/curriculum/10_distributed_cache/docs/lesson.md",
    "/Users/danielbarreto/Development/aidevschool/curriculum/11_load_balancer/docs/lesson.md",
]
for i in range(len(lessons) - 1):
    a, b = lessons[i], lessons[i + 1]
    e(a, "Hash map behind an API", b, "Hash map behind an API", "semantically_similar_to", "INFERRED", 0.85)
    e(a, "Deterministic under concurrency", b, "Deterministic under concurrency", "semantically_similar_to", "INFERRED", 0.85)
    e(a, "Throughput vs correctness trade-off", b, "Throughput vs correctness trade-off", "semantically_similar_to", "INFERRED", 0.85)

# ---------- Hyperedges ----------
hyperedges = [
    {
        "id": "shared_pedagogical_mental_model_hash_map_api",
        "label": "Shared pedagogical mental model: hash map behind an API",
        "nodes": [cid(l, "Hash map behind an API") for l in lessons],
        "relation": "participate_in",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": lessons[0],
    },
    {
        "id": "shared_concurrency_correctness_principle",
        "label": "Shared concurrency correctness principle: deterministic under concurrency",
        "nodes": [cid(l, "Deterministic under concurrency") for l in lessons],
        "relation": "participate_in",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": lessons[0],
    },
]

payload = {
    "nodes": nodes,
    "edges": edges,
    "hyperedges": hyperedges,
    "input_tokens": 0,
    "output_tokens": 0,
}

out_path = "/Users/danielbarreto/Development/aidevschool/graphify-out/.graphify_chunk_015.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(nodes)} nodes, {len(edges)} edges, {len(hyperedges)} hyperedges to {out_path}")
