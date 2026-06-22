# Pipeline Status — Rate Limiter

- **project_id:** 01_rate_limiter
- **project_name:** Rate Limiter (Token Bucket)
- **cycle_id:** 2026-06-03-01-rate-limiter
- **complexity_level:** 2
- **phase:** cycle-complete
- **awaiting:** next-curator
- **last_update:** 2026-06-18T00:00:00-03:00
- **updated_by:** optimizer

## Implementations

### Go
- **status:** done
- **coverage:** 99% (ratelimit) / 86% (main)
- **tests:** all pass with -race
- **lint:** clean
- **docker:** ~13MB image

### Rust
- **status:** done
- **coverage:** 19/19 tests (1 ignored)
- **lint:** clippy clean
- **docker:** builds clean

### Node
- **status:** done
- **coverage:** 91.86%
- **tests:** 40/40 pass
- **lint:** clean

## Code Review
- 27 issues (0 Critical / 10 Major / 11 Minor / 6 Educational)
- All 7 categories covered

## Benchmarks
- 4 scenarios × 3 langs × **N=3** (see `benchmarks/results-N3-optimized/aggregated.json`; analysis script: `benchmarks/render_n3_summary.py`)
- p99 leaders (median of N=3):
  - baseline: Go 9.72ms (±0.33, CV 3.39%)
  - stress: Rust 7.88ms (±3.83, CV 48.63%) — noisy
  - spike: Go 7.41ms (±1.86, CV 25.13%) — CV borderline
  - endurance: Rust 10.28ms (±13.53, CV 131.5%) — very noisy, requires re-run

## Evolution
- 3 optimizations shipped (Go shard mutex, Rust shard mutex, Node pre-allocate)
- Re-benchmarked post-optimization (N=3 above); only the stress CV% is acceptable; spike and endurance are noisy and need re-runs.

## Known Limitations
1. **Endurance CV% > 20% on Rust + Node** — variance too high to claim winners; needs re-run.
2. Mutation testing pending
3. Node single-process limitation
