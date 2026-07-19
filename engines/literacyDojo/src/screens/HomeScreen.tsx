import { useServices } from "../app/services";
import type { SkillId } from "../data/generated/lessons";
import { type LearnerProgress, type SkillPractice, reviewsDue } from "../domain/progress";
import { readyLessonEntries } from "../domain/track";

/**
 * Home (plano seção 9): missão do dia, progresso da trilha, revisão pendente,
 * sequência e um botão único para continuar.
 */
export function HomeScreen({
  progress,
  onContinue,
  onOpenMap,
  onReset,
}: {
  progress: LearnerProgress;
  onContinue: (lessonId: string) => void;
  onOpenMap: () => void;
  onReset: () => void;
}) {
  const services = useServices();
  const track = services.content.getTrack();
  const modules = services.content.listModules();
  const ready = readyLessonEntries(modules);

  const completedCount = ready.filter(
    (entry) => progress.lessonStatus[entry.id] === "completed",
  ).length;
  const mission =
    ready.find(
      (entry) =>
        entry.id === progress.currentLessonId && progress.lessonStatus[entry.id] !== "completed",
    ) ??
    ready.find((entry) => {
      const status = progress.lessonStatus[entry.id];
      return status === "available" || status === "in_progress";
    });

  const now = services.clock.now();
  const due: SkillPractice[] = reviewsDue(progress, now);
  const reviewLesson =
    due.length > 0
      ? ready.find((entry) => entry.skillIds.includes(due[0].skillId as SkillId))
      : undefined;

  const handleReset = () => {
    if (window.confirm("Apagar todo o progresso deste aparelho e recomeçar do zero?")) {
      void onReset();
    }
  };

  return (
    <section className="screen" data-testid="home-screen" aria-labelledby="home-title">
      <p className="eyebrow">{track.title}</p>
      <h1 id="home-title">Olá! Vamos lá.</h1>

      <div className="stats-row" aria-label="Seu engajamento">
        <span className="stat" data-testid="xp-value">
          {progress.xp} XP
        </span>
        <span className="stat" data-testid="streak-value">
          Sequência: {progress.streak.current} {progress.streak.current === 1 ? "dia" : "dias"}
        </span>
      </div>

      <div className="card">
        <h2>Missão do dia</h2>
        {mission ? (
          <>
            <p className="card-title" data-testid="mission-title">
              {mission.title}
            </p>
            <p className="muted">
              {mission.estimatedMinutes} min ·{" "}
              {mission.skillIds.map((id) => services.content.getSkillTitle(id)).join(", ")}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="continue-button"
              onClick={() => onContinue(mission.id)}
            >
              {progress.lessonStatus[mission.id] === "in_progress" ? "Continuar" : "Começar"}
            </button>
          </>
        ) : (
          <p data-testid="mission-done">
            Você concluiu todas as lições deste piloto. 🎉 Novas lições estão a caminho — enquanto
            isso, revise o que já praticou no mapa da trilha.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Sua trilha</h2>
        <p data-testid="track-progress">
          {completedCount} de {ready.length} lições concluídas
        </p>
        <div
          className="progress-track"
          role="progressbar"
          tabIndex={0}
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={ready.length}
          aria-label="Progresso da trilha"
        >
          <div
            className="progress-fill"
            style={{ width: `${ready.length === 0 ? 0 : (completedCount / ready.length) * 100}%` }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="open-map"
          onClick={onOpenMap}
        >
          Ver mapa da trilha
        </button>
      </div>

      {due.length > 0 && reviewLesson && (
        <div className="card card-review">
          <h2>Revisão pendente</h2>
          <p>
            Hora de revisar:{" "}
            {due.map((skill) => services.content.getSkillTitle(skill.skillId)).join(", ")}.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="review-button"
            onClick={() => onContinue(reviewLesson.id)}
          >
            Revisar agora
          </button>
        </div>
      )}

      <footer className="screen-footer">
        <button
          type="button"
          className="btn btn-link"
          data-testid="reset-progress"
          onClick={handleReset}
        >
          Apagar progresso e recomeçar
        </button>
      </footer>
    </section>
  );
}
