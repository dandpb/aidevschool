import { FixedClock } from "../src/adapters/clock";
import { InMemoryProgressRepository } from "../src/adapters/inMemoryProgressRepository";
import { createTestServices } from "../src/app/services";
import { type LearnerProgress, createInitialProgress } from "../src/domain/progress";

export const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

export function makeServices(options?: { progress?: LearnerProgress }) {
  const progressRepo = new InMemoryProgressRepository();
  const services = createTestServices({ progressRepo, clock: new FixedClock(FIXED_NOW) });
  const initial =
    options?.progress ??
    createInitialProgress(services.content.listModules(), services.content.getContentVersion());
  progressRepo.seed(initial);
  return { services, progressRepo, initial };
}
