import { createContext, useContext } from "react";
import { InMemoryAnalyticsSink, NoopAnalyticsSink } from "../adapters/analyticsSinks";
import { SystemClock } from "../adapters/clock";
import { DeterministicFeedbackProvider } from "../adapters/deterministicFeedbackProvider";
import {
  ConsoleEvidenceSink,
  DevtoolsBridgeEvidenceSink,
  InMemoryEvidenceSink,
} from "../adapters/evidenceSinks";
import { GeneratedContentRepository } from "../adapters/generatedContentRepository";
import { IndexedDbProgressRepository } from "../adapters/indexedDbProgressRepository";
import type {
  AnalyticsSink,
  Clock,
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  ProgressRepository,
} from "../application/ports";
import { LiteracyUseCases } from "../application/useCases";
import { type LearnerProgress, createInitialProgress } from "../domain/progress";

/** Raiz de composição: único lugar que conhece os adapters concretos. */
export type Services = {
  content: ContentRepository;
  progressRepo: ProgressRepository;
  evidence: EvidenceSink;
  feedback: FeedbackProvider;
  analytics: AnalyticsSink;
  clock: Clock;
  useCases: LiteracyUseCases;
};

export function createServices(overrides?: {
  content?: ContentRepository;
  progressRepo?: ProgressRepository;
  evidence?: EvidenceSink;
  feedback?: FeedbackProvider;
  analytics?: AnalyticsSink;
  clock?: Clock;
}): Services {
  const content = overrides?.content ?? new GeneratedContentRepository();
  const progressRepo = overrides?.progressRepo ?? new IndexedDbProgressRepository();
  const baseEvidence = overrides?.evidence ?? new ConsoleEvidenceSink();
  // A ponte window.__literacydojo só existe em dev (usada pelo Playwright para
  // capturar e validar o envelope de evidência).
  const evidence = import.meta.env.DEV
    ? new DevtoolsBridgeEvidenceSink(baseEvidence)
    : baseEvidence;
  const feedback = overrides?.feedback ?? new DeterministicFeedbackProvider();
  const analytics = overrides?.analytics ?? new NoopAnalyticsSink();
  const clock = overrides?.clock ?? new SystemClock();
  const useCases = new LiteracyUseCases({
    content,
    progress: progressRepo,
    evidence,
    feedback,
    analytics,
    clock,
  });
  return { content, progressRepo, evidence, feedback, analytics, clock, useCases };
}

/** Cria serviços 100% em memória para testes de componentes. */
export function createTestServices(overrides?: {
  progressRepo?: ProgressRepository;
  clock?: Clock;
}): Services & { evidence: InMemoryEvidenceSink; analytics: InMemoryAnalyticsSink } {
  const evidence = new InMemoryEvidenceSink();
  const analytics = new InMemoryAnalyticsSink();
  const base = createServices({
    progressRepo: overrides?.progressRepo,
    evidence,
    analytics,
    clock: overrides?.clock,
  });
  return { ...base, evidence, analytics };
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
