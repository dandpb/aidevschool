import type { ProgressRepository } from "../application/ports";
import type { LearnerProgress } from "../domain/progress";

/** Adapter em memória para testes de casos de uso e componentes. */
export class InMemoryProgressRepository implements ProgressRepository {
  private stored: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.stored = structuredClone(progress);
  }

  async load(): Promise<LearnerProgress | null> {
    return this.stored === null ? null : structuredClone(this.stored);
  }

  async save(progress: LearnerProgress): Promise<void> {
    this.stored = structuredClone(progress);
  }

  async reset(): Promise<void> {
    this.stored = null;
  }
}
