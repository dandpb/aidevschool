import { vi } from "vitest"
import { setMissionEvidenceForwarder } from "../hostProtocol"
import { configureEvidenceParentOrigin } from "../evidenceTransport"
import { resetFunnelBatchers } from "../funnelTelemetry"

export type FakeParent = { postMessage: ReturnType<typeof vi.fn> }

export type FakeWindow = {
  parent: unknown
  addEventListener: ReturnType<typeof vi.fn>
  [key: string]: unknown
}

/**
 * Minimal window/document stubs for the transport seams (the package code
 * only needs `window.parent`, `window.addEventListener`, and
 * `document.referrer` — jsdom is unnecessary).
 */
export function stubBrowserWindow(options: { referrer?: string; topLevel?: boolean } = {}): {
  window: FakeWindow
  parent: FakeParent
} {
  const parent: FakeParent = { postMessage: vi.fn() }
  const window: FakeWindow = {
    parent,
    addEventListener: vi.fn(),
  }
  if (options.topLevel) {
    window.parent = window
  }
  vi.stubGlobal("window", window)
  vi.stubGlobal("document", { referrer: options.referrer ?? "" })
  return { window, parent }
}

/** Capture the `pagehide` listener a batcher registers, to drive a flush. */
export function capturedPageHideHandler(window: FakeWindow): () => void {
  const calls = window.addEventListener.mock.calls as Array<[string, () => void]>
  const call = calls.find(([type]) => type === "pagehide")
  if (call === undefined) {
    throw new Error("no pagehide listener was registered on the window stub")
  }
  return call[1]
}

/** Reset every module-level singleton the package exposes for tests. */
export function resetEvidenceSeams(): void {
  setMissionEvidenceForwarder(null)
  configureEvidenceParentOrigin(undefined)
  resetFunnelBatchers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}
