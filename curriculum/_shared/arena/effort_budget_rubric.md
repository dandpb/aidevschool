# Effort-Budget Rubric — Polyglot Comparison Arena

The arena compares **languages**, not the agent's per-language effort. A benchmark
where one implementation is naively written and another is hand-tuned measures the
gap in effort, not the gap in languages — and teaches the wrong lesson. The
`fairness-auditor` agent (see ADR-005) checks each implementation against this
rubric **before** benchmarking; any `flag` blocks the benchmark stage.

## Shared rules (all three languages)

1. **Same algorithm / data-structure class.** All three solve the problem the same
   way (e.g. all use a hash map; not "Rust uses a custom B-tree, Node uses an
   object"). Different *idioms* are fine; different *algorithms* are not.
2. **Idiomatic stdlib first.** Prefer the standard library / common framework a
   competent developer would reach for. No exotic third-party performance crates
   or native addons unless all three get an equivalent.
3. **No hand-tuned micro-optimizations** (cache-line padding, manual SIMD,
   hand-rolled allocators, escape-analysis tricks) unless the problem mandates it
   for all three.
4. **Comparable allocation strategy.** No pre-allocating giant pools in one
   language while another allocates per-request, unless that *is* the idiomatic
   difference being taught.
5. **Equal build posture.** Optimized/release builds for all (Rust `--release`,
   Go default, Node production) — not debug-vs-release.
6. **Same concurrency-model class** for the problem (e.g. all event-loop, or all
   thread-pool) unless the contrast *is* the lesson and is stated as such.

## Per-language flags

| Language | Flag if… |
|---|---|
| **Go** | `unsafe.Pointer` / manual escape hacks; non-idiomatic hand-rolled HTTP parsing; non-default `GOMAXPROCS` tuning the others don't get. |
| **Rust** | any `unsafe` block; SIMD intrinsics / `std::simd`; hand-rolled allocator; debug build. |
| **Node** | native C++ addons; manual V8 flags beyond defaults; non-strict TS that hides cost; worker-thread pools the others don't get. |

## Verdict contract (consumed by `/devschool-arena`)

```
[FAIRNESS-AUDITOR] alvo=<project_id>
VEREDICTO: PASS | FLAG
go:   pass | flag — <reason citing the rule violated>
rust: pass | flag — <reason>
node: pass | flag — <reason>
```

`PASS` only if all three are `pass`. Any `flag` blocks the benchmark stage; the
producer must rebalance the flagged implementation and re-submit.
