import { createContext, useContext } from "react";
import { createAnalyticsIdentity } from "../adapters/analyticsIdentity";
import type { AnalyticsIdentity } from "../adapters/analyticsIdentity";
import { analyticsSinkFromEnv, noopAnalyticsSink } from "../adapters/analyticsSinks";
import type { Clock } from "../adapters/clock";
import { systemClock } from "../adapters/clock";
import { DeterministicFeedbackProvider } from "../adapters/deterministicFeedbackProvider";
import {
  CompositeEvidenceSink,
  DevtoolsBridgeEvidenceSink,
  consoleEvidenceSink,
} from "../adapters/evidenceSinks";
import * as generatedContent from "../adapters/generatedContentRepository";
import {
  HttpVerificationClient,
  UnavailableVerificationClient,
} from "../adapters/httpVerificationClient";
import { IndexedDbLearnerStateStore } from "../adapters/learnerStateStore";
import type {
  AnalyticsSink,
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  LearnerStateStore,
  VerificationClient,
} from "../application/ports";
import { LiteracyUseCases } from "../application/useCases";
import {
  activateStateFromSnapshot,
  buildCutoverSnapshot,
  legacyFingerprintNow,
} from "../domain/learnerState";
import { UnmigratableProgressError } from "../domain/migration";
import { createInitialProgress } from "../domain/progress";
import {
  type CutoverSnapshotV1,
  type KeyRead,
  type LearnerStateV1,
  type ResetIntentV1,
  emptyXpLedger,
} from "../domain/xpLedger";

/** Raiz de composição: único lugar que conhece os adapters concretos. */
export type Services = {
  content: ContentRepository;
  stateStore: LearnerStateStore;
  evidence: EvidenceSink;
  feedback: FeedbackProvider;
  clock: Clock;
  useCases: LiteracyUseCases;
  verification: VerificationClient;
  analytics: AnalyticsSink;
  /** Identidade anônima efêmera de analytics (emenda AID-913). */
  analyticsIdentity: AnalyticsIdentity;
};

export function createServices(overrides?: {
  content?: ContentRepository;
  stateStore?: LearnerStateStore;
  evidence?: EvidenceSink;
  feedback?: FeedbackProvider;
  clock?: Clock;
  hostAdapter?: EvidenceSink;
  verification?: VerificationClient;
  analytics?: AnalyticsSink;
}): Services {
  const content = overrides?.content ?? generatedContent;
  const stateStore = overrides?.stateStore ?? new IndexedDbLearnerStateStore();
  const primaryEvidence = overrides?.evidence ?? consoleEvidenceSink;
  const baseEvidence = overrides?.hostAdapter
    ? new CompositeEvidenceSink([primaryEvidence, overrides.hostAdapter])
    : primaryEvidence;
  // A ponte window.__literacydojo só existe em dev ou no servidor dedicado do
  // Playwright. A flag explícita evita que o contrato E2E dependa do NODE_ENV
  // herdado pelo processo que iniciou o Vite.
  const evidence =
    import.meta.env.DEV || import.meta.env.VITE_LITERACY_E2E === "1"
      ? new DevtoolsBridgeEvidenceSink(baseEvidence)
      : baseEvidence;
  const feedback = overrides?.feedback ?? new DeterministicFeedbackProvider();
  const clock = overrides?.clock ?? systemClock;
  const verifierEndpoint = import.meta.env.VITE_LITERACY_VERIFIER_URL?.trim();
  const verification =
    overrides?.verification ??
    (verifierEndpoint
      ? new HttpVerificationClient(verifierEndpoint)
      : new UnavailableVerificationClient());
  // Analytics (ADR-0009, emenda AID-913): transporte ON nas superfícies
  // autorizadas — VITE_ANALYTICS_ENDPOINT é definido somente nos
  // [build.environment] dos dois netlify.toml, sempre same-origin; sem o env
  // o sink é noop (produção) ou console (dev). Em missão hospedada o sink
  // literacy continua sempre noop: o host OS já mede as missões com os 12
  // eventos do vocabulário dele (contexto engineId: literacyDojo) — emitir
  // aqui duplicaria a contagem.
  const analytics =
    overrides?.analytics ??
    (overrides?.hostAdapter
      ? noopAnalyticsSink
      : analyticsSinkFromEnv(import.meta.env.VITE_ANALYTICS_ENDPOINT, import.meta.env.DEV));
  const analyticsIdentity = createAnalyticsIdentity();
  const useCases = new LiteracyUseCases({
    content,
    state: stateStore,
    evidence,
    feedback,
    clock,
    analytics,
    analyticsIdentity,
  });
  return {
    content,
    stateStore,
    evidence,
    feedback,
    clock,
    useCases,
    verification,
    analytics,
    analyticsIdentity,
  };
}

/**
 * Boot bloqueado (AID-3888, errata `25b51990`): NENHUM caminho descarta,
 * reseta ou sobrescreve progresso/XP válidos. O dado bruto permanece
 * preservado no armazenamento; a UI oferece retry/recarregamento.
 */
export type BootBlockedReason =
  | "state-read-error"
  | "state-invalid"
  | "snapshot-read-error"
  | "snapshot-invalid"
  | "intent-read-error"
  | "intent-invalid"
  | "intent-mismatch"
  | "legacy-read-error"
  | "legacy-invalid"
  | "legacy-diverged";

export class BootBlockedError extends Error {
  constructor(
    public readonly reason: BootBlockedReason,
    detail: string,
  ) {
    super(
      `Seu progresso local está em um formato não reconhecido por esta versão (${detail}). Nada foi apagado — os dados estão preservados neste navegador. Recarregar a página é seguro; se o problema persistir, use a versão mais recente do app.`,
    );
    this.name = "BootBlockedError";
  }
}

function noReadError<T>(
  read: KeyRead<T>,
  reason: BootBlockedReason,
): Exclude<KeyRead<T>, { status: "read-error" }> {
  if (read.status === "read-error") {
    throw new BootBlockedError(reason, String((read.error as Error)?.message ?? read.error));
  }
  return read as Exclude<KeyRead<T>, { status: "read-error" }>;
}

function seedSnapshotFirst(
  services: Services,
  legacyCapture: CutoverSnapshotV1["legacyCapture"],
): Promise<CutoverSnapshotV1> {
  const snapshot = buildCutoverSnapshot({
    legacyCapture,
    contentVersion: services.content.getContentVersion(),
    now: services.clock(),
  });
  return services.stateStore.persistSnapshot(snapshot).then(() => snapshot);
}

async function activate(services: Services, state: LearnerStateV1): Promise<LearnerStateV1> {
  await services.stateStore.activateState(state);
  return state;
}

function freshState(services: Services, origin: LearnerStateV1["origin"]): LearnerStateV1 {
  return {
    stateVersion: 1,
    origin,
    progress: createInitialProgress(
      services.content.listModules(),
      services.content.getContentVersion(),
    ),
    xpLedger: emptyXpLedger(),
  };
}

/**
 * Boot do estado autoritativo (AID-3888; contrato `a0bf3e8a` + errata
 * `25b51990` + correções `3b9e7f8a`/`46086ca0`/`e3ad989e`).
 *
 * 1. Precedência: estado novo VÁLIDO é autoritativo — carrega
 *    independentemente do ramo legado (inválido/ilegível/ausente).
 * 2. Verificações próprias do estado novo bloqueiam (read-error, corrupção,
 *    schema futuro) com dados preservados.
 * 3. Estado ausente: reset-intent (marker-first) distingue reset explícito
 *    de ativação interrompida — reset semeia do zero SEM restaurar do
 *    snapshot (que permanece preservado como histórico).
 * 4. Snapshot presente sem intent: retoma a ativação SOMENTE se o legado
 *    não divergiu (fingerprint da projeção canônica); divergiu → bloqueado,
 *    ramos preservados, sem remigração/mescla.
 * 5. Sem estado/snapshot: corte (snapshot persistido ANTES da ativação) ou
 *    seed fresco (somente com ausência CONFIRMADA do legado — nunca
 *    inferida de erro ou valor inválido).
 */
export async function loadOrActivateState(services: Services): Promise<LearnerStateV1> {
  const store = services.stateStore;

  // 1-2. Estado novo: autoritativo quando válido; bloqueia nos seus próprios defeitos.
  const stateRead = await store.readState();
  if (stateRead.status === "present-valid") return stateRead.value;
  if (stateRead.status === "read-error")
    throw new BootBlockedError(
      "state-read-error",
      String((stateRead.error as Error)?.message ?? stateRead.error),
    );
  if (stateRead.status === "present-invalid")
    throw new BootBlockedError("state-invalid", stateRead.reason ?? "forma inválida");

  // Estado ausente: decisões dependem de snapshot/intent/legado.
  const snapshotRead = noReadError(await store.readSnapshot(), "snapshot-read-error");
  const intentRead = noReadError(await store.readResetIntent(), "intent-read-error");
  const legacyRead = noReadError(await store.readLegacyRaw(), "legacy-read-error");

  // 3. Reset explícito (marker-first): semeia do zero, não restaura.
  if (intentRead.status !== "absent") {
    if (intentRead.status === "present-invalid")
      throw new BootBlockedError("intent-invalid", intentRead.reason ?? "forma inválida");
    const intent = intentRead.value;
    const snapshotFp =
      snapshotRead.status === "present-valid"
        ? snapshotRead.value.legacyFingerprint
        : snapshotRead.status === "absent"
          ? "none"
          : null;
    if (snapshotFp === null)
      throw new BootBlockedError("snapshot-invalid", "snapshot ilegível com intent presente");
    if (intent.supersedesSnapshotFingerprint !== snapshotFp)
      throw new BootBlockedError(
        "intent-mismatch",
        "intent de reset não corresponde ao snapshot vigente — registros inconsistentes",
      );
    const state = freshState(services, "reset-seed");
    await activate(services, state);
    await store.deleteResetIntent();
    return state;
  }

  // 4. Snapshot presente (sem intent): retomada de corte interrompido.
  if (snapshotRead.status === "present-invalid")
    throw new BootBlockedError("snapshot-invalid", snapshotRead.reason ?? "forma inválida");
  if (snapshotRead.status === "present-valid") {
    const snapshot = snapshotRead.value;
    if (snapshot.legacyCapture.legacy === "confirmed-absent") {
      // Fresh-seed interrompido após o snapshot: legado tem de continuar ausente.
      if (legacyRead.status !== "absent")
        throw new BootBlockedError(
          "legacy-diverged",
          "ramo legado apareceu após snapshot de instalação nova — divergência preservada",
        );
      return activate(services, freshState(services, "fresh-seed"));
    }
    if (legacyRead.status === "absent")
      throw new BootBlockedError(
        "legacy-diverged",
        "ramo legado foi apagado após o corte (cliente antigo?) — snapshot preservado",
      );
    if (legacyRead.status === "present-invalid")
      throw new BootBlockedError(
        "legacy-invalid",
        legacyRead.reason ?? "legado ilegível no momento da retomada",
      );
    if (legacyFingerprintNow(legacyRead.value) !== snapshot.legacyFingerprint)
      throw new BootBlockedError(
        "legacy-diverged",
        "ramo legado mudou após o corte — sem remigração/mescla automática",
      );
    return activate(
      services,
      activateStateFromSnapshot(snapshot, services.content.getContentVersion(), services.clock()),
    );
  }

  // 5. Sem estado/snapshot: corte ou seed fresco.
  if (legacyRead.status === "present-invalid")
    throw new BootBlockedError("legacy-invalid", legacyRead.reason ?? "progresso legado ilegível");
  if (legacyRead.status === "absent") {
    // Ausência CONFIRMADA pelo port — seed com snapshot de ausência antes.
    await seedSnapshotFirst(services, { legacy: "confirmed-absent" });
    return activate(services, freshState(services, "fresh-seed"));
  }
  let snapshot: CutoverSnapshotV1;
  try {
    snapshot = await seedSnapshotFirst(services, {
      legacy: "present",
      value: legacyRead.value,
    });
  } catch (error) {
    if (error instanceof UnmigratableProgressError) {
      // Legado presente mas não migrável (corrupt/prototype-schema-5/future):
      // blocked com preservação — o valor bruto permanece no armazenamento.
      throw new BootBlockedError("legacy-invalid", error.message);
    }
    throw error;
  }
  return activate(
    services,
    activateStateFromSnapshot(snapshot, services.content.getContentVersion(), services.clock()),
  );
}

/**
 * Reset explícito (AID-3888, `46086ca0` Precisão 2): marker ANTES de apagar
 * o estado — interrupção nunca produz estado-apagado-sem-marker. Snapshot
 * e ramo legado são preservados; o boot subsequente semeia do zero SEM
 * restaurar do snapshot.
 */
export async function explicitReset(services: Services): Promise<void> {
  const snapshotRead = await services.stateStore.readSnapshot();
  if (snapshotRead.status === "read-error")
    throw new BootBlockedError(
      "snapshot-read-error",
      String((snapshotRead.error as Error)?.message ?? snapshotRead.error),
    );
  const fingerprint =
    snapshotRead.status === "present-valid" ? snapshotRead.value.legacyFingerprint : "none";
  const intent: ResetIntentV1 = {
    intentVersion: 1,
    kind: "explicit-reset",
    performedAt: services.clock().toISOString(),
    supersedesSnapshotFingerprint: fingerprint,
  };
  await services.stateStore.saveResetIntent(intent);
  await services.stateStore.deleteState();
}

const ServicesContext = createContext<Services | null>(null);

export const ServicesProvider = ServicesContext.Provider;

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("ServicesContext ausente — envolva o app em ServicesProvider");
  return services;
}
