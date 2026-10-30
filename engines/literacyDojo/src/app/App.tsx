import { useCallback, useEffect, useRef, useState } from "react";
import { loadRetrofitAcks, resetRetrofitAcks, saveRetrofitAck } from "../adapters/retrofitAcks";
import { resumeDestinationForProgress } from "../application/useCases";
import type { LessonDefinition } from "../data/generated/lessons";
import { buildEntryViewedEvent } from "../domain/analytics";
import type { ModuleCheckpointId } from "../domain/checkpoints";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import type { AttemptFeedback } from "../domain/feedback";
import { type JourneyId, activeJourneyOf } from "../domain/journeyProgress";
import type { Achievement, LearnerProgress } from "../domain/progress";
import { currentStreakForDate } from "../domain/progress";
import { isRetrofitNoticeDue } from "../domain/retrofitNotice";
import { LiteracyMissionAdapter, isHostedMission } from "../host/LiteracyMissionAdapter";
import { CheckpointScreen } from "../screens/CheckpointScreen";
import { ErrorRecoveryScreen } from "../screens/ErrorRecoveryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { type LessonMode, LessonScreen } from "../screens/LessonScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { TrackMapScreen } from "../screens/TrackMapScreen";
import {
  type Services,
  ServicesProvider,
  createServices,
  explicitReset,
  loadOrActivateState,
} from "./services";
import { useTimeBasedRefresh } from "./useTimeBasedRefresh";

export type ActivityResultSummary = {
  activityId: string;
  pass: boolean;
  score: number;
  feedback: AttemptFeedback;
};

export type LessonSummary = {
  lesson: LessonDefinition;
  lessonScore: number;
  activityResults: ActivityResultSummary[];
  mode?: LessonMode;
  replay?: boolean;
  nextLessonId?: string;
  newlyUnlocked?: Achievement[];
  evidenceRecord?: LiteracyEvidenceRecord;
};

export type Route =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "map" }
  | { name: "progress" }
  | {
      name: "lesson";
      lessonId: string;
      mode?: LessonMode;
      replay?: boolean;
      retrofitNotice?: boolean;
      reviewStage?: number;
    }
  | { name: "checkpoint"; checkpointId: ModuleCheckpointId }
  | { name: "result"; summary: LessonSummary };

/**
 * Token `?journey=` da URL (AID-3705/D1): `dev|ia` mapeia para a jornada
 * inicial do boot; qualquer outro valor (ou ausência) é ignorado e o boot
 * segue o comportamento atual (visão de duas jornadas).
 */
export function journeyParamToJourneyId(value: string | null): JourneyId | undefined {
  if (value === "dev") return "dev";
  if (value === "ia") return "ia_pratica";
  return undefined;
}

export function AppShell({
  services,
  hostAdapter,
}: {
  services: Services;
  hostAdapter: LiteracyMissionAdapter | null;
}) {
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  useTimeBasedRefresh(services.clock, progress?.skills);
  const [route, setRouteState] = useState<Route | null>(null);
  const routeRevision = useRef(0);
  const bootSwitchRef = useRef<{
    services: Services;
    journey: JourneyId;
    promise: Promise<LearnerProgress>;
  } | null>(null);
  const navigate = useCallback((next: Route) => {
    routeRevision.current += 1;
    setRouteState(next);
  }, []);
  const operationRef = useRef<"open" | "review" | "switch" | "reset" | "reconcile" | null>(null);
  const recoveryBlockedRef = useRef(false);
  const [operation, setOperation] = useState<
    "open" | "review" | "switch" | "reset" | "reconcile" | null
  >(null);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [uncertainNotice, setUncertainNotice] = useState<string | null>(null);
  const canMutate = useCallback(
    () => operationRef.current === null && !recoveryBlockedRef.current,
    [],
  );
  const beginOperation = useCallback(
    (kind: "open" | "review" | "switch" | "reset" | "reconcile") => {
      if (!canMutate()) return false;
      operationRef.current = kind;
      setUncertainNotice(null);
      setOperation(kind);
      return true;
    },
    [canMutate],
  );
  const finishOperation = useCallback(() => {
    operationRef.current = null;
    setOperation(null);
  }, []);
  const blockForRecovery = useCallback(() => {
    recoveryBlockedRef.current = true;
    setRecoveryBlocked(true);
  }, []);
  const [bootError, setBootError] = useState<string | null>(null);
  const [lessonOpenError, setLessonOpenError] = useState<{ text: string; revision: number } | null>(
    null,
  );
  const [journeySwitchError, setJourneySwitchError] = useState<{
    text: string;
    revision: number;
  } | null>(null);
  const [retrofitAcks, setRetrofitAcks] = useState(() => loadRetrofitAcks());
  const hostReady = progress !== null;

  /**
   * Abertura de lição (initial/review/resume/hosted): se o aviso de retrofit
   * (O3-C1 §3) está devido para este learner/lição/bump, marca o ack ANTES do
   * primeiro render da intro — S2 é exibido 1× por bump de contentVersion.
   */
  const openLessonRoute = useCallback(
    (
      lessonId: string,
      mode?: LessonMode,
      current?: LearnerProgress | null,
      reviewStage?: number,
    ) => {
      const learner = current ?? progress;
      const due =
        learner !== null &&
        isRetrofitNoticeDue({
          lessonId,
          contentVersion: services.content.getContentVersion(),
          lessonStatus: learner.lessonStatus,
          acks: retrofitAcks,
        });
      if (due) {
        setRetrofitAcks(saveRetrofitAck(lessonId, services.content.getContentVersion()));
      }
      navigate({
        name: "lesson",
        lessonId,
        mode,
        replay: mode !== "review" && learner?.lessonStatus[lessonId] === "completed",
        retrofitNotice: due,
        reviewStage,
      });
    },
    [navigate, progress, retrofitAcks, services],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: boot único por sessão de host/serviços; o destino usa `seeded` explícito e openLessonRoute não deve re-disparar o boot.
  useEffect(() => {
    let cancelled = false;
    // Capture an in-flight switch before the async read; it may settle while
    // that read is pending, leaving the returned snapshot older than the write.
    const switchAtReadStart = bootSwitchRef.current;
    void (async () => {
      let seeded: LearnerProgress;
      try {
        seeded = (await loadOrActivateState(services)).progress;
      } catch (error) {
        if (cancelled) return;
        setBootError(
          error instanceof Error
            ? error.message
            : "Não foi possível ler o progresso local deste navegador.",
        );
        return;
      }
      if (hostAdapter !== null) {
        if (cancelled) return;
        setProgress(seeded);
        return;
      }
      // A deep-link switch is shared across StrictMode boot effects; a failure
      // is reconciled against one authoritative snapshot before rendering.
      if (cancelled) return;
      let bootProgress = seeded;
      let reconciled = false;
      const requestedJourney = journeyParamToJourneyId(
        new URLSearchParams(window.location.search).get("journey"),
      );
      if (requestedJourney !== undefined && seeded.onboarding.completed) {
        let operation =
          [bootSwitchRef.current, switchAtReadStart].find(
            (candidate) =>
              candidate?.services === services && candidate.journey === requestedJourney,
          ) ?? null;
        if (!operation && activeJourneyOf(seeded) !== requestedJourney) {
          const started = {
            services,
            journey: requestedJourney,
            promise: services.useCases.switchJourney(requestedJourney),
          };
          operation = started;
          bootSwitchRef.current = started;
          // A fulfilled snapshot must not be reused on a later boot. Keep a
          // rejection available to any concurrent effect for reconciliation.
          void started.promise.then(
            () => {
              if (bootSwitchRef.current === started) bootSwitchRef.current = null;
            },
            () => {},
          );
        }
        if (operation) {
          let switchFailed = false;
          try {
            await operation.promise;
          } catch {
            switchFailed = true;
          }
          if (cancelled) return;
          try {
            bootProgress = await services.useCases.readProgressForRecovery();
          } catch {
            if (cancelled) return;
            setBootError(
              "Não foi possível confirmar o progresso salvo. A troca de jornada pode já ter ocorrido; recarregue para verificar e tentar novamente.",
            );
            return;
          }
          if (cancelled) return;
          reconciled = true;
          if (switchFailed) {
            setUncertainNotice(
              "Não foi possível confirmar a troca de jornada solicitada. Confira a jornada e o progresso salvos antes de continuar.",
            );
          }
        }
      }
      let destination: Awaited<ReturnType<typeof services.useCases.resumeSession>>;
      if (reconciled) {
        destination = resumeDestinationForProgress(bootProgress);
      } else {
        try {
          destination = await services.useCases.resumeSession({ requireExisting: true });
        } catch {
          if (cancelled) return;
          setBootError(
            "Não foi possível confirmar o progresso salvo. Recarregue para tentar novamente.",
          );
          return;
        }
      }
      if (cancelled) return;
      setProgress(bootProgress);
      if (destination.kind === "onboarding") {
        navigate({ name: "onboarding" });
      } else if (destination.kind === "lesson") {
        openLessonRoute(destination.lessonId, undefined, bootProgress);
      } else {
        navigate({ name: "home" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostAdapter, services]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ciclo de vida do adaptador hospedado; openLessonRoute recebe o progresso atualizado explicitamente.
  useEffect(() => {
    if (hostAdapter === null || !hostReady) return;
    return hostAdapter.start(async (launch) => {
      const lesson = services.content.getLesson(launch.missionId);
      if (lesson === undefined || lesson.version !== launch.missionVersion) {
        throw new Error("Missão hospedada incompatível com o conteúdo local");
      }
      const updated = await services.useCases.prepareHostedMission(launch.missionId);
      setProgress(updated);
      openLessonRoute(launch.missionId, undefined, updated);
    }, services.content.getContentVersion());
  }, [hostAdapter, hostReady, services]);

  useEffect(() => {
    if (!route) return;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const heading = document.querySelector<HTMLElement>(".app-stage h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [route]);

  // Funil AID-913 (emenda ADR-0009) + F2 R1 (`2026-09-10-entry-brief-instrumentation`):
  // `entry_viewed` exatamente 1× por page load, na PRIMEIRA rota renderizada —
  // qualquer destino de `resumeSession` (home, retomada de lição pós-reload,
  // onboarding) — com a prop opcional `entry` discriminando a rota. Missão
  // hospedada não passa por aqui: o host OS mede a entrada da journey dele
  // (onboarding.started/journey.returned) e o sink literacy é noop.
  const entryViewedEmittedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: hostAdapter é estático por mount; a emissão é única por page load guiada por `route`.
  useEffect(() => {
    if (hostAdapter !== null || entryViewedEmittedRef.current) return;
    const entry =
      route?.name === "home"
        ? "home"
        : route?.name === "lesson"
          ? "lesson-resume"
          : route?.name === "onboarding"
            ? "onboarding"
            : undefined;
    if (entry === undefined) return;
    entryViewedEmittedRef.current = true;
    services.analytics.track(
      buildEntryViewedEvent(
        {
          sessionId: services.analyticsIdentity.sessionId,
          eventId: services.analyticsIdentity.nextEventId(),
        },
        {
          occurredAt: services.clock().toISOString(),
          contentVersion: services.content.getContentVersion(),
        },
        { entry },
      ),
    );
  }, [route, services]);

  const reconcileUncertainProgress = useCallback(async () => {
    try {
      const current = await services.useCases.readProgressForRecovery();
      setProgress(current);
    } catch {
      blockForRecovery();
    }
  }, [blockForRecovery, services]);

  const reconcileScreenProgress = useCallback(
    async (originRevision: number, source: "progress" | "backup" = "progress") => {
      if (routeRevision.current !== originRevision || !beginOperation("reconcile")) {
        blockForRecovery();
        return;
      }
      try {
        const current =
          source === "backup"
            ? await services.useCases.readBackupProgressForRecovery()
            : await services.useCases.readProgressForRecovery();
        if (routeRevision.current === originRevision) setProgress(current);
        else blockForRecovery();
      } catch {
        blockForRecovery();
      } finally {
        finishOperation();
      }
    },
    [beginOperation, blockForRecovery, finishOperation, services],
  );

  const handleReset = useCallback(
    async (originRevision: number) => {
      if (routeRevision.current !== originRevision || !beginOperation("reset")) return;
      setLessonOpenError(null);
      setJourneySwitchError(null);
      try {
        // Reset marker-first: uma falha parcial exige novo boot, não uma suposição.
        await explicitReset(services);
        resetRetrofitAcks();
        setRetrofitAcks({});
        const fresh = await loadOrActivateState(services);
        setProgress(fresh.progress);
        navigate({ name: "onboarding" });
      } catch {
        blockForRecovery();
      } finally {
        finishOperation();
      }
    },
    [beginOperation, blockForRecovery, finishOperation, navigate, services],
  );

  const handleOpenLesson = useCallback(
    async (lessonId: string, originRevision: number) => {
      if (routeRevision.current !== originRevision || !beginOperation("open")) return;
      const revision = originRevision;
      setLessonOpenError(null);
      setJourneySwitchError(null);
      try {
        const updated = await services.useCases.startLesson(lessonId);
        setProgress(updated);
        if (routeRevision.current === revision) openLessonRoute(lessonId, undefined, updated);
      } catch {
        await reconcileUncertainProgress();
        if (routeRevision.current === revision) {
          setLessonOpenError({
            revision,
            text: "Não foi possível salvar seu progresso. A tentativa de abertura pode já ter sido registrada; confira o progresso antes de tentar novamente.",
          });
        } else {
          setUncertainNotice(
            "A abertura solicitada antes de mudar de tela não foi confirmada. Ela pode já ter sido registrada; confira o progresso antes de tentar novamente.",
          );
        }
      } finally {
        finishOperation();
      }
    },
    [beginOperation, finishOperation, openLessonRoute, reconcileUncertainProgress, services],
  );

  const handleOpenReview = useCallback(
    async (lessonId: string, originRevision: number) => {
      if (routeRevision.current !== originRevision || !beginOperation("review")) return;
      const revision = originRevision;
      setLessonOpenError(null);
      setJourneySwitchError(null);
      try {
        const { progress: updated, stage } = await services.useCases.startReview(lessonId);
        setProgress(updated);
        if (routeRevision.current === revision) openLessonRoute(lessonId, "review", updated, stage);
      } catch {
        await reconcileUncertainProgress();
        if (routeRevision.current === revision) {
          setLessonOpenError({
            revision,
            text: "Não foi possível iniciar esta revisão. Confira o progresso antes de tentar novamente.",
          });
        } else {
          setUncertainNotice("A revisão solicitada antes de mudar de tela não pôde ser iniciada.");
        }
      } finally {
        finishOperation();
      }
    },
    [beginOperation, finishOperation, openLessonRoute, reconcileUncertainProgress, services],
  );

  const handleSwitchJourney = useCallback(
    async (journey: JourneyId, originRevision: number) => {
      if (routeRevision.current !== originRevision || !beginOperation("switch")) return;
      const revision = originRevision;
      setJourneySwitchError(null);
      setLessonOpenError(null);
      try {
        const updated = await services.useCases.switchJourney(journey);
        setProgress(updated);
        if (routeRevision.current === revision) navigate({ name: "map" });
      } catch {
        await reconcileUncertainProgress();
        if (routeRevision.current === revision) {
          setJourneySwitchError({
            revision,
            text: "Não foi possível salvar a troca de jornada. Ela pode já ter sido registrada; confira o progresso antes de tentar novamente.",
          });
        } else {
          setUncertainNotice(
            "A troca de jornada solicitada antes de mudar de tela não foi confirmada. Ela pode já ter sido registrada; confira o progresso antes de tentar novamente.",
          );
        }
      } finally {
        finishOperation();
      }
    },
    [beginOperation, finishOperation, navigate, reconcileUncertainProgress, services],
  );

  if (bootError) {
    return (
      <main className="app-shell">
        <ErrorRecoveryScreen
          message={bootError}
          hosted={hostAdapter !== null}
          onReload={hostAdapter === null ? () => window.location.reload() : undefined}
        />
      </main>
    );
  }

  if (!progress || !route) {
    return (
      <main className="app-shell" aria-busy="true">
        <p className="loading" aria-live="polite">
          Carregando…
        </p>
      </main>
    );
  }

  const renderedRevision = routeRevision.current;
  const currentStreak = currentStreakForDate(progress.streak, services.clock());
  const isCurrentScreen = () => routeRevision.current === renderedRevision;
  const canMutateOnScreen = () => isCurrentScreen() && canMutate();
  const navigateFromScreen = (next: Route) => {
    if (isCurrentScreen()) navigate(next);
  };

  return (
    <ServicesProvider value={services}>
      <div className="app-shell">
        <header className="product-bar">
          <div className="product-brand" aria-label="AI Dev School">
            <span className="product-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>
              <strong>AI Dev School</strong>
              <small>Vila Lume · aprenda IA fazendo</small>
            </span>
          </div>
          {route.name !== "onboarding" && (
            <div className="product-stats" aria-label="Resumo do progresso">
              <span>
                <span aria-hidden="true">⚡ </span>
                {progress.xp} XP
              </span>
              <span>
                <span aria-hidden="true">🔥 {currentStreak ?? "—"}</span>
                <span className="sr-only">
                  {currentStreak === null
                    ? "Sequência atual indisponível"
                    : `Sequência atual: ${currentStreak} ${currentStreak === 1 ? "dia" : "dias"}`}
                </span>
              </span>
            </div>
          )}
        </header>
        <main className="app-stage">
          {operation && (
            <output>
              {operation === "reset" ? "Reiniciando" : "Preparando"} progresso… aguarde antes de
              iniciar outra ação.
            </output>
          )}
          {recoveryBlocked && (
            <div className="feedback feedback-fail" role="alert">
              Não foi possível confirmar o estado salvo. Recarregue e confira o progresso; a
              operação pode ter ficado incompleta.
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Recarregar página
              </button>
            </div>
          )}
          {uncertainNotice && (
            <p className="feedback feedback-fail" role="alert">
              {uncertainNotice}
            </p>
          )}
          {lessonOpenError && (
            <p className="feedback feedback-fail" role="alert" data-testid="lesson-open-error">
              {lessonOpenError.revision === routeRevision.current
                ? lessonOpenError.text
                : "A solicitação anterior não foi confirmada. Confira o progresso antes de tentar novamente."}
            </p>
          )}
          {journeySwitchError && (
            <p className="feedback feedback-fail" role="alert" data-testid="journey-switch-error">
              {journeySwitchError.revision === routeRevision.current
                ? journeySwitchError.text
                : "A troca de jornada anterior não foi confirmada. Confira o progresso antes de tentar novamente."}
            </p>
          )}
          {route.name === "onboarding" && (
            <OnboardingScreen
              onDone={(updated) => {
                setProgress(updated);
                navigate({ name: "map" });
              }}
            />
          )}
          {route.name === "home" && (
            <HomeScreen
              progress={progress}
              mutationBlocked={operation !== null || recoveryBlocked}
              navigationBlocked={operation === "reset"}
              canMutate={canMutateOnScreen}
              onContinue={(lessonId) => void handleOpenLesson(lessonId, renderedRevision)}
              onReview={(lessonId) => void handleOpenReview(lessonId, renderedRevision)}
              onOpenCheckpoint={(checkpointId) => {
                if (canMutateOnScreen()) navigateFromScreen({ name: "checkpoint", checkpointId });
              }}
              onOpenMap={() => {
                if (operationRef.current !== "reset") navigateFromScreen({ name: "map" });
              }}
              onOpenProgress={() => {
                if (operationRef.current !== "reset") navigateFromScreen({ name: "progress" });
              }}
              onSwitchJourney={(journey) => void handleSwitchJourney(journey, renderedRevision)}
              onReset={() => void handleReset(renderedRevision)}
            />
          )}
          {route.name === "map" && (
            <TrackMapScreen
              progress={progress}
              mutationBlocked={operation !== null || recoveryBlocked}
              onBack={() => navigateFromScreen({ name: "home" })}
              onStartLesson={(lessonId) => void handleOpenLesson(lessonId, renderedRevision)}
              onOpenCheckpoint={(checkpointId) => {
                if (canMutateOnScreen()) navigateFromScreen({ name: "checkpoint", checkpointId });
              }}
            />
          )}
          {route.name === "progress" && (
            <ProgressScreen
              progress={progress}
              mutationBlocked={operation !== null || recoveryBlocked}
              canMutate={canMutateOnScreen}
              onBack={() => navigateFromScreen({ name: "home" })}
              onStartLesson={(lessonId) => void handleOpenLesson(lessonId, renderedRevision)}
              onReview={(lessonId) => void handleOpenReview(lessonId, renderedRevision)}
              onProgressImported={setProgress}
              onUncertainProgress={() => reconcileScreenProgress(renderedRevision, "backup")}
            />
          )}
          {route.name === "lesson" && (
            <LessonScreen
              key={`${route.lessonId}:${route.mode ?? "initial"}`}
              lessonId={route.lessonId}
              mode={route.mode ?? "initial"}
              replay={route.replay ?? false}
              onboarding={progress.onboarding}
              retrofitNotice={route.retrofitNotice ?? false}
              reviewStage={route.reviewStage}
              missionEvents={
                hostAdapter === null
                  ? undefined
                  : {
                      // F2 R2: encaminhamento ao host em missão hospedada —
                      // o sink v2 é noop aqui, o funil OS recebe somente via
                      // protocolo host-engine (MissionShell reemite).
                      onBriefViewed: () => hostAdapter.publishBriefViewed(),
                      onActivityPresented: (activityType) =>
                        hostAdapter.publishActivityPresented(activityType),
                    }
              }
              onProgressChange={setProgress}
              onCompleted={(updated, summary) => {
                setProgress(updated);
                navigate({ name: "result", summary });
                hostAdapter?.publishCompleted(summary.nextLessonId);
              }}
              hosted={hostAdapter !== null}
              mutationBlocked={operation !== null || recoveryBlocked}
              onUncertainProgress={
                hostAdapter === null ? () => reconcileScreenProgress(renderedRevision) : undefined
              }
              canMutate={canMutateOnScreen}
              onExit={() => {
                if (hostAdapter === null) navigateFromScreen({ name: "map" });
              }}
            />
          )}
          {route.name === "checkpoint" && (
            <CheckpointScreen
              mutationBlocked={operation !== null || recoveryBlocked}
              canMutate={canMutateOnScreen}
              key={route.checkpointId}
              checkpointId={route.checkpointId}
              onProgressChange={setProgress}
              onUncertainProgress={
                hostAdapter === null ? () => reconcileScreenProgress(renderedRevision) : undefined
              }
              onFinished={() => navigateFromScreen({ name: "home" })}
              onExit={() => navigateFromScreen({ name: "map" })}
              onStartNextLesson={(lessonId) => void handleOpenLesson(lessonId, renderedRevision)}
            />
          )}
          {route.name === "result" && (
            <ResultScreen
              mutationBlocked={operation !== null || recoveryBlocked}
              summary={route.summary}
              hosted={hostAdapter !== null}
              onNextLesson={(lessonId) => void handleOpenLesson(lessonId, renderedRevision)}
              onHome={() => navigateFromScreen({ name: "home" })}
              onMap={() => navigateFromScreen({ name: "map" })}
            />
          )}
        </main>
        <footer className="product-footer" aria-label="Informações do piloto">
          <p>
            <strong>Piloto público gratuito · para maiores de 18 anos.</strong> Seu progresso fica
            somente neste navegador e pode ser perdido ao limpar os dados do site.
          </p>
          <nav aria-label="Informações e suporte">
            <a href="./termos.html">Termos do piloto</a>
            <a href="./privacidade.html">Privacidade</a>
            <a
              href="https://github.com/dandpb/aidevschool/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedir suporte <span className="sr-only">(abre em nova aba)</span>
            </a>
          </nav>
        </footer>
      </div>
    </ServicesProvider>
  );
}

export function App({ services }: { services?: Services }) {
  const [hostAdapter] = useState(() => (isHostedMission() ? new LiteracyMissionAdapter() : null));
  const [resolved] = useState(
    () => services ?? createServices({ hostAdapter: hostAdapter ?? undefined }),
  );
  return <AppShell services={resolved} hostAdapter={hostAdapter} />;
}
