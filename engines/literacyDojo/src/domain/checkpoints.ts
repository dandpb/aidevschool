import type { CatalogLessonEntry, ModuleDefinition } from "../data/generated/lessons";
import type { LearnerProgress } from "./progress";
import { readyLessonEntries } from "./track";

/**
 * Desafios de Módulo do corredor literacy mod-01→03 (spec AID-915 §3, ordem
 * AID-910/E = AID-916). Um checkpoint NÃO é lição: é composição runtime de
 * atividades já existentes (ids vigentes do catálogo), sem entrada no
 * catálogo, sem `LessonDefinition` própria e sem conteúdo novo. Mudança na
 * seleção abaixo é decisão de conteúdo na mesma onda que tocar a lição.
 */

export type ModuleCheckpointId = "cp-01" | "cp-02" | "cp-03";

export type CheckpointActivityRef = {
  /** Lição ORIGINAL da atividade — evidência e skills usam este id. */
  lessonId: string;
  activityId: string;
};

export type CheckpointDefinition = {
  id: ModuleCheckpointId;
  moduleId: string;
  /** Título do módulo exibido na microcopy (§3.5) vem do catálogo; aqui só o id. */
  activityRefs: CheckpointActivityRef[];
};

/**
 * Seleção content-owned (spec AID-915 §3.3 — tabela âncora): 1 atividade por
 * lição do módulo, ordem fixa. Score do desafio = média das melhores notas;
 * aprovação ≥ 0.75 (alinha `minimumScore` do contrato de conteúdo).
 */
export const CHECKPOINT_SELECTION: readonly CheckpointDefinition[] = [
  {
    id: "cp-01",
    moduleId: "mod-01",
    activityRefs: [
      { lessonId: "l01", activityId: "l01-a2" },
      { lessonId: "l02", activityId: "l02-a1" },
      { lessonId: "l03", activityId: "l03-a2" },
    ],
  },
  {
    id: "cp-02",
    moduleId: "mod-02",
    activityRefs: [
      { lessonId: "l04", activityId: "l04-a2" },
      { lessonId: "l05", activityId: "l05-a3" },
      { lessonId: "l06", activityId: "l06-a2" },
      { lessonId: "l07", activityId: "l07-a1" },
    ],
  },
  {
    id: "cp-03",
    moduleId: "mod-03",
    activityRefs: [
      { lessonId: "l08", activityId: "l08-a1" },
      { lessonId: "l09", activityId: "l09-a1" },
      { lessonId: "l10", activityId: "l10-a1" },
      { lessonId: "l11", activityId: "l11-a1" },
    ],
  },
] as const;

/** Média das melhores notas exigida para aprovar o desafio (spec §3.3). */
export const CHECKPOINT_MINIMUM_SCORE = 0.75;

/**
 * Mapa de ativação do gate (spec §3.4 — dados): módulo ativado → checkpoint
 * exigido para desbloquear a primeira lição `locked`. Mecanismo uniforme,
 * escopado ao corredor; módulos fora do mapa seguem linear como hoje.
 */
export const CHECKPOINT_ACTIVATION: Readonly<Record<string, ModuleCheckpointId>> = {
  "mod-02": "cp-01",
  "mod-03": "cp-02",
  "mod-04": "cp-03",
};

export function checkpointById(id: ModuleCheckpointId): CheckpointDefinition {
  const found = CHECKPOINT_SELECTION.find((checkpoint) => checkpoint.id === id);
  if (!found) throw new Error(`Checkpoint desconhecido: ${id}`);
  return found;
}

/** Última lição com conteúdo do módulo (predicado de disponibilidade, §3.4). */
export function lastReadyLessonOfModule(
  modules: ModuleDefinition[],
  moduleId: string,
): CatalogLessonEntry | undefined {
  const ready = readyLessonEntries(modules).filter((entry) => entry.moduleId === moduleId);
  return ready[ready.length - 1];
}

/** Primeira lição com conteúdo do módulo (alvo do gate no desbloqueio). */
export function firstReadyLessonOfModule(
  modules: ModuleDefinition[],
  moduleId: string,
): CatalogLessonEntry | undefined {
  return readyLessonEntries(modules).find((entry) => entry.moduleId === moduleId);
}

/**
 * Disponibilidade do desafio (§3.4): a ÚLTIMA lição do módulo está concluída.
 * Regra proposital para a rota `intermediate` (pula l01 para sempre): o
 * predicado "todas as lições" travaria cp-01 nessa rota.
 */
export function isCheckpointAvailable(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  checkpointId: ModuleCheckpointId,
): boolean {
  const checkpoint = checkpointById(checkpointId);
  const last = lastReadyLessonOfModule(modules, checkpoint.moduleId);
  return last !== undefined && progress.lessonStatus[last.id] === "completed";
}

export function isCheckpointCompleted(
  progress: LearnerProgress,
  checkpointId: ModuleCheckpointId,
): boolean {
  const checkpoint = checkpointById(checkpointId);
  return progress.moduleCheckpoints[checkpoint.moduleId]?.status === "completed";
}

/** Checkpoint que libera este módulo, se houver (mapa de ativação). */
export function gateForModule(moduleId: string): ModuleCheckpointId | undefined {
  return CHECKPOINT_ACTIVATION[moduleId];
}

export function isModuleGateOpen(progress: LearnerProgress, moduleId: string): boolean {
  const gate = gateForModule(moduleId);
  return gate === undefined || isCheckpointCompleted(progress, gate);
}

/**
 * O gate age SOMENTE sobre lições `locked` (grandfathering, §3.4): nada que
 * já está `available`/`in_progress`/`completed` é re-bloqueado. Este predicado
 * é consultado apenas no caminho locked→available do desbloqueio linear.
 */
export function isLessonGateLocked(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  lessonId: string,
): boolean {
  for (const [moduleId, checkpointId] of Object.entries(CHECKPOINT_ACTIVATION)) {
    const first = firstReadyLessonOfModule(modules, moduleId);
    if (first?.id !== lessonId) continue;
    return !isCheckpointCompleted(progress, checkpointId);
  }
  return false;
}

export type CheckpointOutcome = {
  passed: boolean;
  score: number;
};

/** Aprovação do desafio: média das melhores notas ≥ 0.75 (spec §3.3). */
export function evaluateCheckpointOutcome(bestScores: number[]): CheckpointOutcome {
  if (bestScores.length === 0) return { passed: false, score: 0 };
  const score = bestScores.reduce((total, value) => total + value, 0) / bestScores.length;
  return { passed: score >= CHECKPOINT_MINIMUM_SCORE, score };
}

/**
 * Início de uma sessão de desafio: exige disponibilidade, conta a tentativa
 * (sessões, não atividades) e garante o registro no estado.
 */
export function startCheckpointSession(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  checkpointId: ModuleCheckpointId,
): LearnerProgress {
  if (!isCheckpointAvailable(progress, modules, checkpointId)) {
    throw new Error(`Desafio indisponível: ${checkpointId}`);
  }
  if (isCheckpointCompleted(progress, checkpointId)) {
    throw new Error(`Desafio já concluído: ${checkpointId}`);
  }
  const { moduleId } = checkpointById(checkpointId);
  const current = progress.moduleCheckpoints[moduleId];
  return {
    ...progress,
    moduleCheckpoints: {
      ...progress.moduleCheckpoints,
      [moduleId]: {
        status: "available",
        bestScore: current?.bestScore ?? 0,
        attempts: (current?.attempts ?? 0) + 1,
      },
    },
  };
}

export type CompleteCheckpointResult = {
  progress: LearnerProgress;
  outcome: CheckpointOutcome;
  unlockedLessonId?: string;
};

/**
 * Fim de uma sessão de desafio: na aprovação marca `completed` e desbloqueia
 * a primeira lição (locked) do módulo ativado pelo gate. Na falha nada muda
 * de status — retry ilimitado, sem punição (§3.4).
 */
export function completeCheckpointSession(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
  checkpointId: ModuleCheckpointId,
  bestScores: number[],
  now: Date,
): CompleteCheckpointResult {
  const checkpoint = checkpointById(checkpointId);
  const outcome = evaluateCheckpointOutcome(bestScores);
  const current = progress.moduleCheckpoints[checkpoint.moduleId];
  const bestScore = Math.max(current?.bestScore ?? 0, outcome.score);
  if (!outcome.passed) {
    return {
      progress: {
        ...progress,
        moduleCheckpoints: {
          ...progress.moduleCheckpoints,
          [checkpoint.moduleId]: {
            status: "available",
            bestScore,
            attempts: current?.attempts ?? 0,
          },
        },
      },
      outcome,
    };
  }
  let next: LearnerProgress = {
    ...progress,
    moduleCheckpoints: {
      ...progress.moduleCheckpoints,
      [checkpoint.moduleId]: {
        status: "completed",
        bestScore,
        attempts: current?.attempts ?? 0,
        completedAt: now.toISOString(),
      },
    },
  };
  let unlockedLessonId: string | undefined;
  for (const [moduleId, gateId] of Object.entries(CHECKPOINT_ACTIVATION)) {
    if (gateId !== checkpointId) continue;
    const first = firstReadyLessonOfModule(modules, moduleId);
    if (first && next.lessonStatus[first.id] === "locked") {
      next = {
        ...next,
        currentLessonId: first.id,
        lessonStatus: { ...next.lessonStatus, [first.id]: "available" },
      };
      unlockedLessonId = first.id;
    }
  }
  return { progress: next, outcome, unlockedLessonId };
}
