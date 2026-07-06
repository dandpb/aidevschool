// Deterministic wave schedule for the Breaker Grid.
//
// Each pulse is one inbound request orb waiting at the breaker. The player
// resolves it with Z (ADMIT -> reactor) or X (REJECT -> fallback bank). The
// breaker state decides which action is correct; the wave script tags each
// pulse with the reactor result it WOULD return if admitted, and the phase the
// pulse is meant to be handled in (informational — drives the HUD briefing and
// the "expected action" metric).
//
// Wave 1 schedule (deterministic; documented in the HUD briefing):
//
//   threshold = 0.5, minimum_requests = 4, cooldown = 1500ms, probes_to_close = 3
//
//   CLOSED phase (4 pulses; failures at 3,4 -> 2/4 = 50% crosses threshold):
//     1  GET /users     success     ADMIT (Z)
//     2  GET /orders    success     ADMIT (Z)
//     3  POST /charge   FAILURE     ADMIT (Z)  [reactor flaky]
//     4  POST /charge   FAILURE     ADMIT (Z)  [2/4 >= 0.5 -> TRIP cue flashes]
//        --- player presses C (TRIP) -> breaker OPEN, cooldown lights ---
//   OPEN phase (3 pulses; fail-fast to fallback, never touch reactor):
//     5  GET /users     (blocked)   REJECT (X) -> fallback 503
//     6  GET /orders    (blocked)   REJECT (X) -> fallback 503
//     7  POST /charge   (blocked)   REJECT (X) -> fallback 503
//        --- cooldown drains (~1500ms) ---
//        --- player presses C (PROBE) -> breaker HALF_OPEN, 3 probe slots ---
//   HALF_OPEN phase (5 pulses; 3 probes admitted, 2 regular-traffic rejected):
//     8  GET /health    (regular)   REJECT (X)  [wait for the next probe slot]
//     9  GET /probe     success     ADMIT  (Z)  [probe slot 1]
//     10 GET /health    (regular)   REJECT (X)
//     11 GET /probe     success     ADMIT  (Z)  [probe slot 2]
//     12 GET /probe     success     ADMIT  (Z)  [probe slot 3 -> close cue]
//        --- player presses C (CLOSE) -> breaker CLOSED ---

export type ReactorResult = "SUCCESS" | "FAILURE"

export type WavePhase = "CLOSED" | "OPEN" | "HALF_OPEN"

export type Pulse = {
  readonly id: number
  readonly label: string
  readonly reactorResult: ReactorResult
  readonly phase: WavePhase
  readonly expected: "ADMIT" | "REJECT"
}

export type BreakerMetrics = {
  closed_admits_total: number
  closed_admits_correct: number
  trips_total: number
  trips_correct: number
  trips_late: number
  trips_early: number
  open_rejects_total: number
  open_rejects_correct: number
  open_leaks: number
  probes_total: number
  probes_correct: number
  probes_premature: number
  halfopen_admit_leaks: number
  closes_correct: number
  fallbacks_served: number
  reactor_overloads: number
  overflow: boolean
}

export function emptyMetrics(): BreakerMetrics {
  return {
    closed_admits_total: 0,
    closed_admits_correct: 0,
    trips_total: 0,
    trips_correct: 0,
    trips_late: 0,
    trips_early: 0,
    open_rejects_total: 0,
    open_rejects_correct: 0,
    open_leaks: 0,
    probes_total: 0,
    probes_correct: 0,
    probes_premature: 0,
    halfopen_admit_leaks: 0,
    closes_correct: 0,
    fallbacks_served: 0,
    reactor_overloads: 0,
    overflow: false,
  }
}

export function defaultWave(): readonly Pulse[] {
  return [
    { id: 1, label: "GET /users", reactorResult: "SUCCESS", phase: "CLOSED", expected: "ADMIT" },
    { id: 2, label: "GET /orders", reactorResult: "SUCCESS", phase: "CLOSED", expected: "ADMIT" },
    { id: 3, label: "POST /charge", reactorResult: "FAILURE", phase: "CLOSED", expected: "ADMIT" },
    { id: 4, label: "POST /charge", reactorResult: "FAILURE", phase: "CLOSED", expected: "ADMIT" },
    { id: 5, label: "GET /users", reactorResult: "SUCCESS", phase: "OPEN", expected: "REJECT" },
    { id: 6, label: "GET /orders", reactorResult: "SUCCESS", phase: "OPEN", expected: "REJECT" },
    { id: 7, label: "POST /charge", reactorResult: "FAILURE", phase: "OPEN", expected: "REJECT" },
    { id: 8, label: "GET /health", reactorResult: "SUCCESS", phase: "HALF_OPEN", expected: "REJECT" },
    { id: 9, label: "GET /probe", reactorResult: "SUCCESS", phase: "HALF_OPEN", expected: "ADMIT" },
    {
      id: 10,
      label: "GET /health",
      reactorResult: "SUCCESS",
      phase: "HALF_OPEN",
      expected: "REJECT",
    },
    { id: 11, label: "GET /probe", reactorResult: "SUCCESS", phase: "HALF_OPEN", expected: "ADMIT" },
    { id: 12, label: "GET /probe", reactorResult: "SUCCESS", phase: "HALF_OPEN", expected: "ADMIT" },
  ]
}
