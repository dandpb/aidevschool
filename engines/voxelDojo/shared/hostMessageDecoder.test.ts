import { describe, expect, it } from "vitest"
import { decodeHostMessage } from "../../shared/teaching-evidence/hostMessageDecoder"

const hostOrigin = "https://host.example"
const context = {
  engineId: "voxelDojo",
  expectedOrigin: hostOrigin,
  expectedSource: null,
}

function message(data: unknown, origin = hostOrigin, source: unknown = null) {
  return { data, origin, source }
}

function envelope() {
  return {
    protocol: "aidevschool.host-engine",
    version: "1.0",
    type: "host.hello",
    messageId: "message-1",
    hostSessionId: "host-1",
    missionRunId: "run-1",
    engineId: "voxelDojo",
    payload: { missionId: "game-02-warehouse", protocolVersion: "1.0" },
  }
}

describe("host message decoder", () => {
  it("accepts a source-bound, correlated host envelope", () => {
    const accepted = decodeHostMessage(message(envelope()), context)

    expect(accepted).toEqual(envelope())
  })

  it.each([
    ["wrong source", message(envelope(), hostOrigin, {})],
    ["wrong origin", message(envelope(), "https://other.example")],
    ["wrong protocol", message({ ...envelope(), protocol: "other" })],
    ["wrong version", message({ ...envelope(), version: "2.0" })],
    ["wrong engine", message({ ...envelope(), engineId: "literacyDojo" })],
    ["missing message id", message({ ...envelope(), messageId: 1 })],
    ["missing host session", message({ ...envelope(), hostSessionId: 1 })],
    ["missing mission run", message({ ...envelope(), missionRunId: 1 })],
    ["non-record payload", message({ ...envelope(), payload: [] })],
  ])("rejects an envelope with %s", (_reason, event) => {
    expect(decodeHostMessage(event, context)).toBeNull()
  })
})
