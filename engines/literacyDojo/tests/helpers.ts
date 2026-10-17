import { type LearnerProgress, createInitialProgress } from "../src/domain/progress";
import type { LearnerStateV1 } from "../src/domain/xpLedger";
import { emptyXpLedger } from "../src/domain/xpLedger";
import { InMemoryLearnerStateStore, createTestServices, fixedClock } from "./fakes";

export const FIXED_NOW = new Date("2026-07-19T12:00:00.000Z");

export function makeServices(options?: {
  progress?: LearnerProgress;
  state?: LearnerStateV1;
  /** Store externo já semeado — makeServices não semeia de novo. */
  stateStore?: InMemoryLearnerStateStore;
}) {
  const stateStore = options?.stateStore ?? new InMemoryLearnerStateStore();
  const services = createTestServices({ stateStore, clock: fixedClock(FIXED_NOW) });
  let initial =
    options?.state?.progress ??
    options?.progress ??
    createInitialProgress(services.content.listModules(), services.content.getContentVersion());
  if (!options?.stateStore) {
    stateStore.seedState(
      options?.state ?? {
        stateVersion: 1,
        origin: "fresh-seed" as const,
        progress: initial,
        xpLedger: emptyXpLedger(),
      },
    );
  }
  if (options?.stateStore) {
    const read = stateStore.storedStateValue();
    initial = read?.progress ?? initial;
  }
  return { services, stateStore, initial };
}
