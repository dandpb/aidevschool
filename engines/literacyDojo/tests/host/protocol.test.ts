import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiteracyEvidenceRecord } from "../../src/domain/evidence";
import { LiteracyMissionAdapter } from "../../src/host/LiteracyMissionAdapter";
import { expectedHostOrigin } from "../../src/host/protocol";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("LiteracyDojo hosted mission protocol", () => {
  it("binds the exact parent correlation and forwards the unchanged evidence object", () => {
    window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
    vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
    const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    const adapter = new LiteracyMissionAdapter();
    const stop = adapter.start(async () => undefined, "test.1");
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window.parent,
        origin: "http://host.test",
        data: {
          protocol: "aidevschool.host-engine",
          version: "1.0",
          type: "host.hello",
          messageId: "message-1",
          hostSessionId: "host-1",
          missionRunId: "run-1",
          engineId: "literacyDojo",
          sentAt: "2026-07-25T12:00:00.000Z",
          payload: { missionId: "l02", protocolVersion: "1.0" },
        },
      }),
    );
    const record = {
      schemaVersion: 1,
      source: "literacydojo",
      attemptId: "att-1",
      lessonId: "l02",
      lessonVersion: 3,
      activityId: "l02-a1",
      activityType: "output_comparison",
      skillIds: ["avaliar"],
      deterministicChecks: { better: true },
      score: 1,
      pass: true,
      timestamp: "2026-07-25T12:00:00.000Z",
      verifierRequired: true,
      context: "initial",
    } satisfies LiteracyEvidenceRecord;

    adapter.emit(record);

    const evidenceEnvelope = postMessage.mock.calls
      .map(([message]) => message as { type?: string; payload?: { record?: unknown } })
      .find((message) => message.type === "evidence.submitted");
    expect(evidenceEnvelope?.payload?.record).toBe(record);
    expect(
      postMessage.mock.calls.every(([, origin]) => String(origin) === "http://host.test"),
    ).toBe(true);
    const callsBeforeStop = postMessage.mock.calls.length;
    stop();
    adapter.emit(record);
    expect(postMessage).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it("rejects a declared host origin without an exact referrer match", () => {
    window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
    expect(expectedHostOrigin()).toBeNull();

    vi.spyOn(document, "referrer", "get").mockReturnValue("http://other.test/");
    expect(expectedHostOrigin()).toBeNull();
  });

  it.each([
    ["l01", 1, "l02"],
    ["l02", 3, "l03"],
    ["l03", 1, undefined],
  ] as const)(
    "launches declared chapter mission %s and publishes its next route",
    async (missionId, missionVersion, nextMissionId) => {
      window.history.replaceState(null, "", "/?hosted=1&hostOrigin=http%3A%2F%2Fhost.test");
      vi.spyOn(document, "referrer", "get").mockReturnValue("http://host.test/");
      const postMessage = vi
        .spyOn(window.parent, "postMessage")
        .mockImplementation(() => undefined);
      const onLaunch = vi.fn(async () => undefined);
      const adapter = new LiteracyMissionAdapter();
      const stop = adapter.start(onLaunch, "test.1");
      const envelope = (type: string, payload: Record<string, unknown>) => ({
        protocol: "aidevschool.host-engine",
        version: "1.0",
        type,
        messageId: `${type}-1`,
        hostSessionId: "host-1",
        missionRunId: "run-1",
        engineId: "literacyDojo",
        sentAt: "2026-07-25T12:00:00.000Z",
        payload,
      });
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("host.hello", { missionId, protocolVersion: "1.0" }),
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window.parent,
          origin: "http://host.test",
          data: envelope("mission.launch", {
            missionId,
            missionVersion,
            mode: "initial",
            locale: "pt-BR",
          }),
        }),
      );

      await vi.waitFor(() =>
        expect(onLaunch).toHaveBeenCalledWith({
          missionId,
          missionVersion,
          mode: "initial",
          locale: "pt-BR",
        }),
      );
      adapter.publishCompleted(nextMissionId);
      const completed = postMessage.mock.calls
        .map(([message]) => message as { type?: string; payload?: Record<string, unknown> })
        .find(
          (message) => message.type === "mission.state" && message.payload?.status === "completed",
        );
      expect(completed?.payload).not.toHaveProperty("checkpoint");
      expect(completed?.payload?.nextMissionId).toBe(nextMissionId);
      stop();
    },
  );
});
