import { useCallback, useEffect, useState } from "react";
import type { LessonDefinition } from "../data/generated/lessons";
import type { AttemptFeedback } from "../domain/feedback";
import type { Achievement, LearnerProgress } from "../domain/progress";
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
};

export type Route =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "map" }
  | { name: "progress" }
  | { name: "lesson"; lessonId: string; mode?: LessonMode }
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
  const hostReady = progress !== null;

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
        setRoute({ name: "lesson", lessonId: destination.lessonId });
      } else {
        setRoute({ name: "home" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostAdapter, services]);

  useEffect(() => {
    if (hostAdapter === null || !hostReady) return;
    return hostAdapter.start(async (launch) => {
      const lesson = services.content.getLesson(launch.missionId);
      if (lesson === undefined || lesson.version !== launch.missionVersion) {
        throw new Error("Missão hospedada incompatível com o conteúdo local");
      }
      const updated = await services.useCases.prepareHostedMission(launch.missionId);
      setProgress(updated);
      setRoute({ name: "lesson", lessonId: launch.missionId });
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
    const fresh = await loadOrSeedProgress(services);
    setProgress(fresh);
    setRoute({ name: "onboarding" });
  }, [services]);

  const handleOpenLesson = useCallback(
    async (lessonId: string) => {
      const updated = await services.useCases.startLesson(lessonId);
      setProgress(updated);
      setRoute({ name: "lesson", lessonId });
    },
    [services],
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
              onReview={(lessonId) => setRoute({ name: "lesson", lessonId, mode: "review" })}
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
              onReview={(lessonId) => setRoute({ name: "lesson", lessonId, mode: "review" })}
              onProgressImported={setProgress}
            />
          )}
          {route.name === "lesson" && (
            <LessonScreen
              key={`${route.lessonId}:${route.mode ?? "initial"}`}
              lessonId={route.lessonId}
              mode={route.mode ?? "initial"}
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
