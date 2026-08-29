import { createContext, useContext } from "react";
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
};

export function createServices(overrides?: {
  content?: ContentRepository;
  progressRepo?: ProgressRepository;
  evidence?: EvidenceSink;
  feedback?: FeedbackProvider;
  clock?: Clock;
  hostAdapter?: EvidenceSink;
  verification?: VerificationClient;
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
  const useCases = new LiteracyUseCases({
    content,
    progress: progressRepo,
    evidence,
    feedback,
    clock,
  });
  return { content, progressRepo, evidence, feedback, clock, useCases, verification };
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
