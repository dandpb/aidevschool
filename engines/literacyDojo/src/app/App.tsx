import { useCallback, useEffect, useState } from "react";
import { loadRetrofitAcks, resetRetrofitAcks, saveRetrofitAck } from "../adapters/retrofitAcks";
import type { LessonDefinition } from "../data/generated/lessons";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import type { AttemptFeedback } from "../domain/feedback";
import type { Achievement, LearnerProgress } from "../domain/progress";
import { isRetrofitNoticeDue } from "../domain/retrofitNotice";
import { LiteracyMissionAdapter, isHostedMission } from "../host/LiteracyMissionAdapter";
import { ErrorRecoveryScreen } from "../screens/ErrorRecoveryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { type LessonMode, LessonScreen } from "../screens/LessonScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { TrackMapScreen } from "../screens/TrackMapScreen";
import { type Services, ServicesProvider, createServices, loadOrSeedProgress } from "./services";

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
  nextLessonId?: string;
  newlyUnlocked?: Achievement[];
  evidenceRecord?: LiteracyEvidenceRecord;
};

export type Route =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "map" }
  | { name: "progress" }
  | { name: "lesson"; lessonId: string; mode?: LessonMode; retrofitNotice?: boolean }
  | { name: "result"; summary: LessonSummary };

function AppShell({
  services,
  hostAdapter,
}: {
  services: Services;
  hostAdapter: LiteracyMissionAdapter | null;
}) {
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [lessonOpenError, setLessonOpenError] = useState<string | null>(null);
  const [retrofitAcks, setRetrofitAcks] = useState(() => loadRetrofitAcks());
  const hostReady = progress !== null;

  /**
   * Abertura de lição (initial/review/resume/hosted): se o aviso de retrofit
   * (O3-C1 §3) está devido para este learner/lição/bump, marca o ack ANTES do
   * primeiro render da intro — S2 é exibido 1× por bump de contentVersion.
   */
  const openLessonRoute = useCallback(
    (lessonId: string, mode?: LessonMode, current?: LearnerProgress | null) => {
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
      setRoute({ name: "lesson", lessonId, mode, retrofitNotice: due });
    },
    [progress, retrofitAcks, services],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: boot único por sessão de host/serviços; o destino usa `seeded` explícito e openLessonRoute não deve re-disparar o boot.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let seeded: LearnerProgress;
      try {
        seeded = await loadOrSeedProgress(services);
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
      const destination = await services.useCases.resumeSession();
      if (cancelled) return;
      setProgress(seeded);
      if (destination.kind === "onboarding") {
        setRoute({ name: "onboarding" });
      } else if (destination.kind === "lesson") {
        openLessonRoute(destination.lessonId, undefined, seeded);
      } else {
        setRoute({ name: "home" });
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

  const handleReset = useCallback(async () => {
    await services.progressRepo.reset();
    resetRetrofitAcks();
    setRetrofitAcks({});
    const fresh = await loadOrSeedProgress(services);
    setProgress(fresh);
    setRoute({ name: "onboarding" });
  }, [services]);

  const handleOpenLesson = useCallback(
    async (lessonId: string) => {
      setLessonOpenError(null);
      try {
        const updated = await services.useCases.startLesson(lessonId);
        setProgress(updated);
        openLessonRoute(lessonId, undefined, updated);
      } catch {
        setLessonOpenError(
          "Não foi possível salvar seu progresso. Tente abrir a missão novamente.",
        );
      }
    },
    [openLessonRoute, services],
  );

  const handleOpenReview = useCallback(
    async (lessonId: string) => {
      setLessonOpenError(null);
      try {
        const { progress: updated } = await services.useCases.startReview(lessonId);
        setProgress(updated);
        openLessonRoute(lessonId, "review", updated);
      } catch {
        setLessonOpenError("Não foi possível iniciar esta revisão. Tente novamente.");
      }
    },
    [openLessonRoute, services],
  );

  if (bootError) {
    return (
      <main className="app-shell">
        <ErrorRecoveryScreen message={bootError} />
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
              <span>⚡ {progress.xp} XP</span>
              <span>🔥 {progress.streak.current}</span>
            </div>
          )}
        </header>
        <main className="app-stage">
          {lessonOpenError && (
            <p className="feedback feedback-fail" role="alert" data-testid="lesson-open-error">
              {lessonOpenError}
            </p>
          )}
          {route.name === "onboarding" && (
            <OnboardingScreen
              onDone={(updated) => {
                setProgress(updated);
                setRoute({ name: "map" });
              }}
            />
          )}
          {route.name === "home" && (
            <HomeScreen
              progress={progress}
              onContinue={(lessonId) => void handleOpenLesson(lessonId)}
              onReview={(lessonId) => void handleOpenReview(lessonId)}
              onOpenMap={() => setRoute({ name: "map" })}
              onOpenProgress={() => setRoute({ name: "progress" })}
              onReset={handleReset}
            />
          )}
          {route.name === "map" && (
            <TrackMapScreen
              progress={progress}
              onBack={() => setRoute({ name: "home" })}
              onStartLesson={(lessonId) => void handleOpenLesson(lessonId)}
            />
          )}
          {route.name === "progress" && (
            <ProgressScreen
              progress={progress}
              onBack={() => setRoute({ name: "home" })}
              onStartLesson={(lessonId) => void handleOpenLesson(lessonId)}
              onReview={(lessonId) => void handleOpenReview(lessonId)}
              onProgressImported={setProgress}
            />
          )}
          {route.name === "lesson" && (
            <LessonScreen
              key={`${route.lessonId}:${route.mode ?? "initial"}`}
              lessonId={route.lessonId}
              mode={route.mode ?? "initial"}
              onboarding={progress.onboarding}
              retrofitNotice={route.retrofitNotice ?? false}
              onProgressChange={setProgress}
              onCompleted={(updated, summary) => {
                setProgress(updated);
                setRoute({ name: "result", summary });
                hostAdapter?.publishCompleted(summary.nextLessonId);
              }}
              onExit={() => {
                if (hostAdapter === null) setRoute({ name: "map" });
              }}
            />
          )}
          {route.name === "result" && (
            <ResultScreen
              summary={route.summary}
              hosted={hostAdapter !== null}
              onNextLesson={(lessonId) => void handleOpenLesson(lessonId)}
              onHome={() => setRoute({ name: "home" })}
              onMap={() => setRoute({ name: "map" })}
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
              rel="noreferrer"
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
