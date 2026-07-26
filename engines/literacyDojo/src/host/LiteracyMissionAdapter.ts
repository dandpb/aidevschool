import type { EvidenceSink } from "../application/ports";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import {
  type HostHelloMessage,
  type MissionLaunchMessage,
  createEngineEnvelope,
  decodeHostMessage,
  expectedHostOrigin,
} from "./protocol";

type Correlation = {
  hostSessionId: string;
  missionRunId: string;
  missionId: string;
};

export type LiteracyMissionLaunch = MissionLaunchMessage["payload"];

function uniqueId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function isHostedMission(): boolean {
  return (
    typeof window !== "undefined" &&
    window.parent !== window &&
    new URLSearchParams(window.location.search).get("hosted") === "1"
  );
}

export class LiteracyMissionAdapter implements EvidenceSink {
  private readonly origin = expectedHostOrigin();
  private correlation: Correlation | null = null;
  private revision = 0;
  private contentVersion = "unknown";
  private onLaunch: ((launch: LiteracyMissionLaunch) => Promise<void>) | null = null;

  start(
    onLaunch: (launch: LiteracyMissionLaunch) => Promise<void>,
    contentVersion: string,
  ): () => void {
    this.onLaunch = onLaunch;
    this.contentVersion = contentVersion;
    window.addEventListener("message", this.handleMessage);
    return () => {
      window.removeEventListener("message", this.handleMessage);
      this.correlation = null;
      this.onLaunch = null;
    };
  }

  emit(record: LiteracyEvidenceRecord): void {
    if (this.correlation === null) return;
    this.post("evidence.submitted", {
      schemaId: "literacy-evidence",
      schemaVersion: 1,
      subject: {
        missionId: this.correlation.missionId,
        unitId: `ai-literacy:${this.correlation.missionId}`,
      },
      record,
    });
    this.publishState("running", "apply", 0.8);
  }

  publishCompleted(): void {
    this.publishState("completed", "apply", 1);
  }

  private post<TType extends string, TPayload>(type: TType, payload: TPayload): void {
    if (this.origin === null || this.correlation === null) return;
    window.parent.postMessage(
      createEngineEnvelope({
        type,
        payload,
        messageId: uniqueId(),
        hostSessionId: this.correlation.hostSessionId,
        missionRunId: this.correlation.missionRunId,
      }),
      this.origin,
    );
  }

  private publishState(
    status: "running" | "completed" | "failed",
    stage: "understand" | "respond" | "apply",
    progress: number,
  ): void {
    this.revision += 1;
    this.post("mission.state", { revision: this.revision, status, stage, progress });
  }

  private handleHello(message: HostHelloMessage): void {
    this.correlation = {
      hostSessionId: message.hostSessionId,
      missionRunId: message.missionRunId,
      missionId: message.payload.missionId,
    };
    this.post("engine.ready", {
      engineVersion: "0.1.0",
      contentVersion: this.contentVersion,
      capabilities: ["mission-state", "evidence"],
    });
  }

  private handleMessage = (event: MessageEvent<unknown>): void => {
    if (this.origin === null) return;
    const message = decodeHostMessage(event, this.origin);
    if (message === null) return;
    if (message.type === "host.hello") {
      this.handleHello(message);
      return;
    }
    if (
      this.correlation === null ||
      message.hostSessionId !== this.correlation.hostSessionId ||
      message.missionRunId !== this.correlation.missionRunId
    ) {
      return;
    }
    if (message.type !== "mission.launch" || this.onLaunch === null) return;
    if (message.payload.missionId !== this.correlation.missionId) return;
    void this.onLaunch(message.payload)
      .then(() => {
        this.post("protocol.ack", {
          acknowledgedMessageId: message.messageId,
          accepted: true,
        });
        this.publishState("running", "understand", 0.1);
      })
      .catch(() => {
        this.post("protocol.ack", {
          acknowledgedMessageId: message.messageId,
          accepted: false,
          code: "mission-unavailable",
        });
        this.publishState("failed", "understand", 0);
      });
  };
}
