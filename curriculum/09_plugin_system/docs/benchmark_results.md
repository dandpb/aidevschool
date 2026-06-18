# Benchmark Results - Project 09: Plugin System

## Methodology

Benchmark evidence is collected per runtime with repeatable command lines and at least three samples before cross-runtime comparison. The target scenario set is:

1. Unit/runtime microbenchmarks for plugin registration and manifest validation.
2. HTTP/API scenario load using `k6` or `autocannon` against plugin lifecycle endpoints.
3. Hook dispatch and payload transformation under repeated execution.
4. Fault-isolation scenario for panic handling, disabled plugins, and unsupported API ranges.

Acceptance for comparable benchmark claims requires N >= 3 samples and coefficient of variation (CV) < 20%. This run used N=5 for Go. No Go `Benchmark*` functions were present, so Go benchmark execution fell back to verbose test timing as required. Service-level `k6`/`autocannon` scenarios remain pending and should be run without Docker unless a future task explicitly allows it.

## Environment

- OS/arch: macOS arm64
- Go: go1.26.4 darwin/arm64
- Working directory: `curriculum/09_plugin_system/go-impl/`
- Date: 2026-06-18

## Go Results

### Benchmark command

Command:

```bash
go test -bench=. -benchmem -count=5 ./... 2>&1
```

Result: no `Benchmark*` rows were emitted; tests passed.

```text
PASS
ok  plugin-system-go  1.282s
```

### Fallback verbose timing command

Command:

```bash
go test -count=5 -v ./... 2>&1
```

Result: tests passed across five repetitions.

```text
PASS
ok  plugin-system-go  1.898s
```

Selected real test timings observed in the verbose output:

| Test | Observed timings |
| --- | --- |
| `TestRegisterRejectsInvalidManifestBeforeRuntimeExecution` | 0.00s |
| `TestLifecycleTransitionsAndCapabilityDenial` | 0.00s |
| `TestHooksRunInPriorityOrderAndTransformPayload` | 0.00s |
| `TestPanicIsolationKeepsHostHealthy` | 0.00s |
| `TestHTTPRegistersListsLifecycleAndHealth` | 0.09s, 0.04s, 0.03s, 0.01s, 0.03s |
| `TestDisabledPluginCannotStartOrReceiveHooks` | 0.00s |
| `TestUnsupportedAPIRangeAndHookPanicAreIsolated` | 0.00s |

## Rust Results

Pending execution. No Rust benchmark/test numbers were collected in this run.

## Node Results

Pending execution. No Node benchmark/test numbers were collected in this run.

## Analysis and Recommendations

The Go implementation passes its N=5 fallback run. Most plugin-domain tests complete below the visible timer resolution, while the HTTP lifecycle test is the measurable path at 0.01s-0.09s per repetition.

Recommended next steps: add Go benchmarks for manifest registration, hook dispatch, and panic-isolated execution; then run HTTP lifecycle load with `k6` or `autocannon` using N >= 3 and CV < 20% before comparing with Rust or Node.
