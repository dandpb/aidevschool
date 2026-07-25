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
import { IndexedDbProgressRepository } from "../adapters/indexedDbProgressRepository";
import type {
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
  clock: Clock;
  useCases: LiteracyUseCases;
};

export function createServices(overrides?: {
  content?: ContentRepository;
  progressRepo?: ProgressRepository;
  evidence?: EvidenceSink;
  feedback?: FeedbackProvider;
  clock?: Clock;
  hostAdapter?: EvidenceSink;
}): Services {
  const content = overrides?.content ?? generatedContent;
  const progressRepo = overrides?.progressRepo ?? new IndexedDbProgressRepository();
  const primaryEvidence = overrides?.evidence ?? consoleEvidenceSink;
  const baseEvidence = overrides?.hostAdapter
    ? new CompositeEvidenceSink([primaryEvidence, overrides.hostAdapter])
    : primaryEvidence;
  // A ponte window.__literacydojo só existe em dev (usada pelo Playwright para
  // capturar e validar o envelope de evidência).
  const evidence = import.meta.env.DEV
    ? new DevtoolsBridgeEvidenceSink(baseEvidence)
    : baseEvidence;
  const feedback = overrides?.feedback ?? new DeterministicFeedbackProvider();
  const clock = overrides?.clock ?? systemClock;
  const useCases = new LiteracyUseCases({
    content,
    progress: progressRepo,
    evidence,
    feedback,
    clock,
  });
  return { content, progressRepo, evidence, feedback, clock, useCases };
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
