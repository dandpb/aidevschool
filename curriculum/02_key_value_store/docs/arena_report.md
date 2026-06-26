---
project: 02_key_value_store
run: 2026-06-25T-kv-mvp
gate: locked
---

# Arena Report — 02_key_value_store

> Polyglot Comparison Arena. This artifact remains `gate: locked`: the live
> benchmark produced one trustworthy metric (throughput) but latency and memory
> failed the decision trust gate. A report is only revealed when all decision
> metrics are trustworthy and verifier-confirmed.

## Prediction

| Metric | Your guess | Actual | Hit? |
|---|---|---|---|
| latency | rust | locked: untrustworthy | n/a |
| memory | rust | locked: untrustworthy | n/a |
| throughput | go | locked until full gate passes | n/a |

## Scoreboard

| Metric | go | node | rust | Winner |
|---|---|---|---|---|
| latency (p99 ↓) | 7.32 | 5.22 | 4.43 | _untrustworthy (CV 186%)_ |
| throughput (n_requests ↑) | 24002.00 | 24000.00 | 24002.00 | **go** |
| memory (mem_mb ↓) | 16.50 | 59.91 | 3.43 | _untrustworthy (CV 20%)_ |

## Narrative

_pending — produced by the arena-narrator, then verifier-confirmed_

## Code Study

_pending — produced by the reviewer (CRITICO) cross-language study_

## Links

- [benchmark_results.md](./benchmark_results.md)
- [code_review.md](./code_review.md)
- [evolution_report.md](./evolution_report.md)
