import { createContext, useContext } from "react";
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
import { IndexedDbProgressRepository } from "../adapters/indexedDbProgressRepository";
import type {
  AnalyticsSink,
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  ProgressRepository,
  VerificationClient,
} from "../application/ports";
import { LiteracyUseCases } from "../application/useCases";
import { type LearnerProgress, createInitialProgress } from "../domain/progress";

/** Raiz de composição: único lugar que conhece os adapters concretos. */
export type Services = {
  content: ContentRepository;
  progressRepo: ProgressRepository;
  evidence: EvidenceSink;
  feedback: FeedbackProvider;
  clock: Clock;
  useCases: LiteracyUseCases;
  verification: VerificationClient;
  analytics: AnalyticsSink;
};

export function createServices(overrides?: {
  content?: ContentRepository;
  progressRepo?: ProgressRepository;
  evidence?: EvidenceSink;
  feedback?: FeedbackProvider;
  clock?: Clock;
  hostAdapter?: EvidenceSink;
  verification?: VerificationClient;
  analytics?: AnalyticsSink;
}): Services {
  const content = overrides?.content ?? generatedContent;
  const progressRepo = overrides?.progressRepo ?? new IndexedDbProgressRepository();
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
  // Analytics (ADR-0009, AID-676): transporte OFF por padrão — sem env o sink
  // é noop (produção) ou console (dev); nenhuma superfície de build define
  // VITE_ANALYTICS_ENDPOINT (ativação é gate do board, ADR-0010 §4). Em
  // missão hospedada o sink literacy é sempre noop: o host OS já mede as
  // missões com os 12 eventos do vocabulário dele (contexto engineId:
  // literacyDojo) — emitir aqui duplicaria a contagem numa futura ativação.
  const analytics =
    overrides?.analytics ??
    (overrides?.hostAdapter
      ? noopAnalyticsSink
      : analyticsSinkFromEnv(import.meta.env.VITE_ANALYTICS_ENDPOINT, import.meta.env.DEV));
  const useCases = new LiteracyUseCases({
    content,
    progress: progressRepo,
    evidence,
    feedback,
    clock,
    analytics,
  });
  return { content, progressRepo, evidence, feedback, clock, useCases, verification, analytics };
}

/**
 * Boot: carrega o progresso ou semeia o estado inicial. Estado antigo
 * incompatível (migração forward-only falhou) é descartado e recomeçado —
 * nunca migrado parcialmente em silêncio.
 */
export async function loadOrSeedProgress(services: Services): Promise<LearnerProgress> {
  try {
    const loaded = await services.progressRepo.load();
    if (loaded) return loaded;
  } catch (error) {
    console.warn("[literacydojo] progresso anterior incompatível; reiniciando do zero.", error);
    await services.progressRepo.reset();
  }
  const fresh = createInitialProgress(
    services.content.listModules(),
    services.content.getContentVersion(),
  );
  await services.progressRepo.save(fresh);
  return fresh;
}

const ServicesContext = createContext<Services | null>(null);

export const ServicesProvider = ServicesContext.Provider;

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("ServicesContext ausente — envolva o app em ServicesProvider");
  return services;
}
