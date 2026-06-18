import type { EcosystemStatus } from "../domain"

export const ecosystemStatuses: readonly EcosystemStatus[] = [
  {
    id: "learning-gate",
    label: "Learning gate",
    state: "Evidence-gated",
    evidence: "learner/learning_state.yaml + .mavis mirror",
    nextStep: "Do not mark mastery without an attempted exercise and adversarial verification.",
  },
  {
    id: "memory",
    label: "Memory",
    state: "Curated substrate",
    evidence: "learner/profile, pitfalls, journal, pipeline status",
    nextStep: "Promote only reusable lessons into memory; keep raw chat out of the core context.",
  },
  {
    id: "legacy-refactor",
    label: "Legacy/refactor",
    state: "Contract added",
    evidence: "ecosystem/LEGACY_MIGRATION.md",
    nextStep: "Require characterization tests and before/after metrics before risky cleanup.",
  },
  {
    id: "polyglot",
    label: "Polyglot comparison",
    state: "Benchmark-backed",
    evidence: "Go + Rust + Node implementations per project package",
    nextStep: "Compare same contract, same workload, same reproducibility envelope.",
  },
] as const
