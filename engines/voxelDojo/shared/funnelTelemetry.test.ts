import { describe, expect, it } from "vitest"
import {
  FUNNEL_BATCH_MAX_EVENTS,
  FUNNEL_EVENT_PROPS,
  FunnelBatcher,
  InMemoryFunnelTransport,
  funnelEndpointPath,
  funnelEventIsValid,
  type FunnelEventName,
} from "../../shared/teaching-evidence/funnelTelemetry"

// AID-987/T1b: unidade do módulo de funil anônimo compartilhado
// (@aidevschool/evidence/funnel-telemetry). O coletor espelha os vocabulários
// e o CI trava a paridade pelo lado recebedor
// (learner/gate/tests/dojo_analytics_collector_v3.test.mjs); aqui trava-se o
// comportamento do lado emissor.

const UUID_A = "0f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b"
const UUID_B = "1f0a6b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b"
const FIXED_CLOCK = () => new Date("2026-09-07T12:00:00.000Z")

function event(name: FunnelEventName, props: Record<string, string> = {}) {
  return {
    schemaVersion: 3 as const,
    source: "voxeldojo",
    event: name,
    eventId: UUID_A,
    sessionId: UUID_B,
    occurredAt: "2026-09-07T12:00:00.000Z",
    props,
  }
}

describe("funnelEventIsValid (vocabulário fechado, zero PII)", () => {
  it("aceita cada evento com exatamente suas props permitidas", () => {
    expect(funnelEventIsValid(event("daily-view-open"))).toBe(true)
    expect(
      funnelEventIsValid(event("voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" })),
    ).toBe(true)
    expect(
      funnelEventIsValid(event("pixelquest-encounter-complete", { unitId: "U0-sonda-rate-limiter-robustness", result: "failed" })),
    ).toBe(true)
    expect(funnelEventIsValid(event("evidence-handoff", { unitId: "U2-key-value-store" }))).toBe(true)
  })

  it("rejeita prop fora do vocabulário, texto livre e identidades fracas", () => {
    expect(funnelEventIsValid(event("daily-view-open", { unitId: "U2-key-value-store" }))).toBe(false)
    expect(
      funnelEventIsValid(event("voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed", freeText: "oi" })),
    ).toBe(false)
    expect(funnelEventIsValid(event("evidence-handoff", { unitId: "texto livre com espaços" }))).toBe(false)
    expect(funnelEventIsValid(event("voxel-loop-complete", { unitId: "U2-key-value-store", result: "quase" }))).toBe(false)
    expect(funnelEventIsValid({ ...event("voxel-loop-complete"), eventId: "não-uuid" })).toBe(false)
    expect(funnelEventIsValid({ ...event("voxel-loop-complete"), source: "minitown" })).toBe(false)
  })

  it("as props canônicas de evidence-handoff não incluem result (e vice-versa)", () => {
    expect(FUNNEL_EVENT_PROPS["evidence-handoff"]).toEqual(["unitId"])
    expect(FUNNEL_EVENT_PROPS["daily-view-open"]).toEqual([])
  })
})

describe("funnelEndpointPath (ativação same-origin só pelo deploy)", () => {
  it("sem env não há endpoint; caminho absoluto same-origin é aceito", () => {
    expect(funnelEndpointPath({})).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "" })).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "https://evil.example/collect" })).toBeNull()
    expect(funnelEndpointPath({ VITE_ANALYTICS_ENDPOINT: "/__dojo/bridge/v1/analytics" })).toBe(
      "/__dojo/bridge/v1/analytics",
    )
  })
})

describe("FunnelBatcher", () => {
  it("enfileira e entrega o batch no flush com a forma do envelope v3", () => {
    const transport = new InMemoryFunnelTransport()
    const batcher = new FunnelBatcher("voxeldojo", transport, {
      createId: (() => {
        let n = 0
        return () => [UUID_A, UUID_B][n++ % 2] as string
      })(),
      clock: FIXED_CLOCK,
    })
    expect(batcher.emit("voxel-loop-complete", { unitId: "U2-key-value-store", result: "completed" })).toBe(true)
    expect(batcher.emit("evidence-handoff", { unitId: "U2-key-value-store" })).toBe(true)
    expect(batcher.pending).toBe(2)
    expect(transport.batches).toHaveLength(0)

    batcher.flush("manual")
    expect(transport.batches).toHaveLength(1)
    const batch = transport.batches[0]
    expect(batch.schemaVersion).toBe(3)
    expect(batch.source).toBe("voxeldojo")
    expect(batch.events).toHaveLength(2)
    // Sessão anônima compartilhada pelos eventos do mesmo page-load.
    expect(batch.events[0]?.sessionId).toBe(batch.events[1]?.sessionId)
    expect(batcher.pending).toBe(0)
  })

  it("rejeita eventos inválidos SEM enviar e flush vazio não envia nada", () => {
    const transport = new InMemoryFunnelTransport()
    const batcher = new FunnelBatcher("dojotoday", transport, {
      createId: () => UUID_A,
      clock: FIXED_CLOCK,
    })
    expect(batcher.emit("daily-view-open", { unitId: "injetado" })).toBe(false)
    batcher.flush("manual")
    expect(transport.batches).toHaveLength(0)
  })

  it("flush automático por tamanho respeita o limite do coletor", () => {
    const transport = new InMemoryFunnelTransport()
    const batcher = new FunnelBatcher("pixelquest", transport, {
      createId: () => UUID_A,
      clock: FIXED_CLOCK,
    })
    for (let i = 0; i < FUNNEL_BATCH_MAX_EVENTS; i += 1) {
      batcher.emit("pixelquest-encounter-complete", {
        unitId: "U0-sonda-rate-limiter-robustness",
        result: "completed",
      })
    }
    expect(transport.batches).toHaveLength(1)
    expect(transport.batches[0]?.events).toHaveLength(FUNNEL_BATCH_MAX_EVENTS)
    expect(transport.batches[0]?.events.every((e) => e.eventId === UUID_A)).toBe(true)
  })
})
