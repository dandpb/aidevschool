import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelWorld } from "../components/VoxelWorld";
import type { LearnerProgress } from "../domain/progress";
import { RETROFIT_NOTICE_S1, isRetrofittedLesson } from "../domain/retrofitNotice";
import { buildTrackQueries } from "../domain/trackQueries";

/**
 * Home (plano seção 9): missão do dia, progresso da trilha, revisão pendente,
 * sequência e um botão único para continuar.
 */
export function HomeScreen({
  progress,
  onContinue,
  onReview,
  onOpenMap,
  onOpenProgress,
  onReset,
}: {
  progress: LearnerProgress;
  onContinue: (lessonId: string) => void;
  onReview: (lessonId: string) => void;
  onOpenMap: () => void;
  onOpenProgress: () => void;
  onReset: () => void;
}) {
  const services = useServices();
  const track = services.content.getTrack();
  const queries = buildTrackQueries(progress, services.content, services.clock);
  const { mission, reviewLesson, dailyGoal: goal, trackSummary: summary, dueReviews } = queries;

  const handleReset = () => {
    if (window.confirm("Apagar todo o progresso deste aparelho e recomeçar do zero?")) {
      void onReset();
    }
  };

  return (
    <section className="screen home-screen" data-testid="home-screen" aria-labelledby="home-title">
      <div className="home-hero">
        <div>
          <p className="eyebrow">VILA LUME · {track.title}</p>
          <h1 id="home-title">A vila aprende com suas escolhas.</h1>
          <p>Ajude um morador por vez. Sem jargão, sem pressa e sempre com prática.</p>
        </div>
        <VoxelWorld variant="welcome" />
      </div>

      <div className="stats-row" aria-label="Seu engajamento">
        <span className="stat" data-testid="xp-value">
          {progress.xp} XP
        </span>
        <span className="stat" data-testid="streak-value">
          Sequência: {progress.streak.current} {progress.streak.current === 1 ? "dia" : "dias"}
        </span>
        <span
          className={goal.done ? "stat stat-done" : "stat"}
          data-testid="daily-goal"
          aria-label={`Meta de hoje: ${goal.earned} de ${goal.goal} XP`}
        >
          Meta de hoje: {goal.earned}/{goal.goal} XP{goal.done ? " ✅" : ""}
        </span>
      </div>

      <MentorGuide compact>
        <p>Lumi guarda seu caminho: continue um pedido ou explore os bairros da vila.</p>
      </MentorGuide>

      <div className="card mission-card">
        <p className="card-kicker">PEDIDO DA VILA</p>
        <h2>Um morador precisa da sua ajuda</h2>
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
              {progress.lessonStatus[mission.id] === "in_progress"
                ? "Continuar pedido"
                : "Atender pedido"}
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
          {summary.completed} de {summary.total} lições concluídas
        </p>
        <div
          className="progress-track"
          role="progressbar"
          tabIndex={0}
          aria-valuenow={summary.completed}
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-label="Progresso da trilha"
        >
          <div
            className="progress-fill"
            style={{
              width: `${summary.total === 0 ? 0 : (summary.completed / summary.total) * 100}%`,
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="open-map"
          onClick={onOpenMap}
        >
          Explorar Vila Lume
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="open-progress"
          onClick={onOpenProgress}
        >
          Ver seu progresso
        </button>
      </div>

      {dueReviews.length > 0 && reviewLesson && (
        <div className="card card-review">
          <h2>Revisão pendente</h2>
          <p>
            Hora de revisar:{" "}
            {dueReviews.map((skill) => services.content.getSkillTitle(skill.skillId)).join(", ")}.
          </p>
          {isRetrofittedLesson(reviewLesson.id, services.content.getContentVersion()) &&
            progress.lessonStatus[reviewLesson.id] === "completed" && (
              <p className="muted" data-testid="retrofit-notice-s1">
                {RETROFIT_NOTICE_S1}
              </p>
            )}
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="review-button"
            onClick={() => onReview(reviewLesson.id)}
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
