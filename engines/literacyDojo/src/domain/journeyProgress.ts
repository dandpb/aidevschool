import type { ModuleDefinition } from "../data/generated/lessons";
import type { JourneyId, JourneyNavigation, LearnerProgress, LessonStatus } from "./progress";
import { readyLessonEntries } from "./track";

export type { JourneyId };

/**
 * Helpers de navegação por jornada (AID-3584). Tudo aqui é defensivo: campos
 * opcionais inválidos (`active: "banana"`, cursor de lição inexistente) caem
 * no default `ia_pratica` / derivação — NUNCA lançam, para não acionar o
 * caminho load-error do boot que reinicia o progresso. O campo `journeys` é
 * opcional e o schemaVersion não sobe: estados legados (sem o campo, missões
 * hospedadas incluídas) seguem exatamente como antes.
 */

export const DEFAULT_JOURNEY: JourneyId = "ia_pratica";

/** Módulos de navegação por jornada (o caso de uso monta a partir do read model). */
export type JourneyModules = Record<JourneyId, ModuleDefinition[]>;

export function isJourneyId(value: unknown): value is JourneyId {
  return value === "ia_pratica" || value === "dev";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJourneys(progress: LearnerProgress): JourneyNavigation {
  const raw = (progress as { journeys?: unknown }).journeys;
  if (!isRecord(raw)) return {};
  const active = isJourneyId(raw.active) ? raw.active : undefined;
  const current = isRecord(raw.current)
    ? {
        ia_pratica: typeof raw.current.ia_pratica === "string" ? raw.current.ia_pratica : undefined,
        dev: typeof raw.current.dev === "string" ? raw.current.dev : undefined,
      }
    : {};
  return { active, current };
}

/** Jornada ativa normalizada; ausente/inválida ⇒ `ia_pratica` (default do app). */
export function activeJourneyOf(progress: LearnerProgress): JourneyId {
  const journeys = readJourneys(progress);
  return journeys.active ?? DEFAULT_JOURNEY;
}

/** IDs das lições com conteúdo de uma jornada, na ordem canônica do catálogo. */
export function journeyLessonIds(modules: ModuleDefinition[]): string[] {
  return readyLessonEntries(modules).map((entry) => entry.id);
}

/**
 * Inicializa SOMENTE statuses ausentes da jornada (primeira lição pronta =
 * `available`, demais `locked`). Nunca sobrescreve status existente — nem
 * IA nem Dev, nem `available`/`in_progress`/`completed` herdados. Não
 * desbloqueia tudo: o desbloqueio progressivo continua com
 * `unlockNextReadyLesson`.
 */
export function ensureJourneyLessonStatuses(
  lessonStatus: Record<string, LessonStatus>,
  modules: ModuleDefinition[],
): Record<string, LessonStatus> {
  const next = { ...lessonStatus };
  let changed = false;
  for (const [index, entry] of readyLessonEntries(modules).entries()) {
    if (next[entry.id] === undefined) {
      next[entry.id] = index === 0 ? "available" : "locked";
      changed = true;
    }
  }
  return changed ? next : lessonStatus;
}

/** Cursor derivado: primeira lição da jornada em andamento, senão disponível, senão a primeira pronta. */
export function deriveJourneyCurrentLessonId(
  progress: LearnerProgress,
  modules: ModuleDefinition[],
): string | undefined {
  const ready = readyLessonEntries(modules);
  const inProgress = ready.find((entry) => progress.lessonStatus[entry.id] === "in_progress");
  if (inProgress) return inProgress.id;
  const available = ready.find((entry) => progress.lessonStatus[entry.id] === "available");
  if (available) return available.id;
  return ready[0]?.id;
}

/**
 * Escolha explícita de jornada (opt-in). Preserva o cursor da jornada que
 * fica para trás (só quando `currentLessonId` pertence a ela), inicializa
 * statuses Dev ausentes quando necessário, ativa a jornada alvo e espelha o
 * cursor dela em `currentLessonId` (compatibilidade legada: retomada pós
 * reload, missões hospedadas e consumidores existentes continuam lendo um
 * único cursor). Idempotente: repetir a mesma escolha não muda nada visível.
 */
export function selectJourney(
  progress: LearnerProgress,
  journey: JourneyId,
  modules: JourneyModules,
): LearnerProgress {
  const journeys = readJourneys(progress);
  const previous = journeys.active ?? DEFAULT_JOURNEY;
  const current = { ...journeys.current };

  if (journey !== previous) {
    const previousIds = new Set(journeyLessonIds(modules[previous]));
    // Só arquiva o cursor legado se ele aponta para a jornada que fica para
    // trás; caso contrário (ex.: missão hospedada da outra jornada), mantém
    // o que já estava arquivado.
    if (previousIds.has(progress.currentLessonId)) {
      current[previous] = progress.currentLessonId;
    }
  }

  const lessonStatus = ensureJourneyLessonStatuses(progress.lessonStatus, modules[journey]);
  const targetIds = new Set(journeyLessonIds(modules[journey]));
  const stored = journeys.current?.[journey];
  const derived = deriveJourneyCurrentLessonId({ ...progress, lessonStatus }, modules[journey]);
  const cursor =
    (stored !== undefined && targetIds.has(stored) ? stored : undefined) ??
    derived ??
    progress.currentLessonId;

  return {
    ...progress,
    lessonStatus,
    currentLessonId: cursor,
    journeys: { active: journey, current },
  };
}

/**
 * Pós-conclusão de lição com `journeys` presente: arquiva o cursor da jornada
 * da lição concluída e restaura o espelho da jornada ATIVA quando a conclusão
 * aconteceu na outra jornada (dois cursores independentes). Progresso legado
 * (sem `journeys`) sai intocado — caminho hospedado e usuários pré-opt-in
 * mantêm o comportamento publicado.
 */
export function reconcileJourneyCursors(
  progress: LearnerProgress,
  lessonJourney: JourneyId,
  lessonId: string,
  nextLessonId: string | undefined,
  modules: JourneyModules,
): LearnerProgress {
  if ((progress as { journeys?: unknown }).journeys === undefined) return progress;
  const journeys = readJourneys(progress);
  const current = { ...journeys.current };
  const lessonIds = new Set(journeyLessonIds(modules[lessonJourney]));
  if (lessonIds.has(nextLessonId ?? lessonId)) {
    current[lessonJourney] = nextLessonId ?? lessonId;
  }
  const active = journeys.active ?? DEFAULT_JOURNEY;
  if (active === lessonJourney) {
    return { ...progress, journeys: { active, current } };
  }
  const activeIds = new Set(journeyLessonIds(modules[active]));
  const restored =
    (current[active] !== undefined && activeIds.has(current[active] ?? "")
      ? current[active]
      : undefined) ??
    deriveJourneyCurrentLessonId(progress, modules[active]) ??
    progress.currentLessonId;
  return { ...progress, currentLessonId: restored, journeys: { active, current } };
}
