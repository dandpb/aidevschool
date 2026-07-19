import { useCallback, useEffect, useState } from "react";
import type { LessonDefinition } from "../data/generated/lessons";
import type { AttemptFeedback } from "../domain/feedback";
import type { LearnerProgress } from "../domain/progress";
import { HomeScreen } from "../screens/HomeScreen";
import { LessonScreen } from "../screens/LessonScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
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
  nextLessonId?: string;
};

export type Route =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "map" }
  | { name: "lesson"; lessonId: string }
  | { name: "result"; summary: LessonSummary };

function AppShell({ services }: { services: Services }) {
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const seeded = await loadOrSeedProgress(services);
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
  }, [services]);

  const handleReset = useCallback(async () => {
    await services.useCases.resetProgress();
    const fresh = await loadOrSeedProgress(services);
    setProgress(fresh);
    setRoute({ name: "onboarding" });
  }, [services]);

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
      <main className="app-shell">
        {route.name === "onboarding" && (
          <OnboardingScreen
            onDone={(updated) => {
              setProgress(updated);
              setRoute({ name: "lesson", lessonId: updated.currentLessonId });
            }}
          />
        )}
        {route.name === "home" && (
          <HomeScreen
            progress={progress}
            onContinue={(lessonId) => setRoute({ name: "lesson", lessonId })}
            onOpenMap={() => setRoute({ name: "map" })}
            onReset={handleReset}
          />
        )}
        {route.name === "map" && (
          <TrackMapScreen
            progress={progress}
            onBack={() => setRoute({ name: "home" })}
            onStartLesson={(lessonId) => setRoute({ name: "lesson", lessonId })}
          />
        )}
        {route.name === "lesson" && (
          <LessonScreen
            key={route.lessonId}
            lessonId={route.lessonId}
            onProgressChange={setProgress}
            onCompleted={(updated, summary) => {
              setProgress(updated);
              setRoute({ name: "result", summary });
            }}
            onExit={() => setRoute({ name: "home" })}
          />
        )}
        {route.name === "result" && (
          <ResultScreen
            summary={route.summary}
            onNextLesson={(lessonId) => setRoute({ name: "lesson", lessonId })}
            onHome={() => setRoute({ name: "home" })}
            onMap={() => setRoute({ name: "map" })}
          />
        )}
      </main>
    </ServicesProvider>
  );
}

export function App({ services }: { services?: Services }) {
  const [resolved] = useState(() => services ?? createServices());
  return <AppShell services={resolved} />;
}
