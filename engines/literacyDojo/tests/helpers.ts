import { type LearnerProgress, createInitialProgress } from "../src/domain/progress";
import { InMemoryProgressRepository, createTestServices, fixedClock } from "./fakes";

export const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

export function makeServices(options?: { progress?: LearnerProgress }) {
  const progressRepo = new InMemoryProgressRepository();
  const services = createTestServices({ progressRepo, clock: fixedClock(FIXED_NOW) });
  const initial =
    options?.progress ??
    createInitialProgress(services.content.listModules(), services.content.getContentVersion());
  progressRepo.seed(initial);
  return { services, progressRepo, initial };
}
