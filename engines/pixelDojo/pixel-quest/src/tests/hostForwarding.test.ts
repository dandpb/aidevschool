import { configureEvidenceParentOrigin, dualEmit } from "@aidevschool/evidence"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  configureEvidenceParentOrigin(undefined)
  vi.unstubAllGlobals()
})

describe("teaching evidence host forwarding", () => {
  it("forwards raw evidence to an embedding parent without changing the record", () => {
    const postMessage = vi.fn()
    vi.stubGlobal("window", { parent: { postMessage } })
    vi.stubGlobal("document", { referrer: "http://127.0.0.1:4174/" })
    configureEvidenceParentOrigin("http://127.0.0.1:4174")
    const record = {
      source: "pixelquest",
      project: "01_rate_limiter",
      encounter_id: "encounter-agent-quest-01",
      game: "PixelDojo Quest",
      ts: "2026-07-10T18:00:00.000Z",
      pass: true,
      review_context: { verifier_required: true },
    }

    expect(dualEmit(record, "pixelquest")).toBe(record)
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "aidevschool:teaching-evidence",
        version: 1,
        evidence: record,
      },
      "http://127.0.0.1:4174",
    )
  })

  it("does not disclose raw evidence to an untrusted embedding origin", () => {
    const postMessage = vi.fn()
    vi.stubGlobal("window", { parent: { postMessage } })
    vi.stubGlobal("document", { referrer: "https://attacker.example/" })
    configureEvidenceParentOrigin("http://127.0.0.1:4174")

    dualEmit({ source: "pixelquest", pass: true }, "pixelquest")

    expect(postMessage).not.toHaveBeenCalled()
  })
})
