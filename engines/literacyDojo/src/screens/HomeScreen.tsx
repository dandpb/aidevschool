import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelWorld } from "../components/VoxelWorld";
import { type JourneyId, activeJourneyOf } from "../domain/journeyProgress";
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
  onOpenCheckpoint,
  onOpenMap,
  onOpenProgress,
  onSwitchJourney,
  onReset,
}: {
  progress: LearnerProgress;
  onContinue: (lessonId: string) => void;
  onReview: (lessonId: string) => void;
  onOpenCheckpoint: (checkpointId: "cp-01" | "cp-02" | "cp-03") => void;
  onOpenMap: () => void;
  onOpenProgress: () => void;
  onSwitchJourney: (journey: JourneyId) => void;
  onReset: () => void;
}) {
  const services = useServices();
  const track = services.content.getTrack();
  const activeJourney = activeJourneyOf(progress);
  const queries = buildTrackQueries(progress, services.content, services.clock, activeJourney);
  const { mission, reviewLesson, dailyGoal: goal, trackSummary: summary, dueReviews } = queries;
  const pendingCheckpoint = queries.pendingCheckpoint;

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
        {pendingCheckpoint ? (
          <>
            <h2 data-testid="checkpoint-mission">
              Continuar: Desafio do Módulo {pendingCheckpoint.module.order}
            </h2>
            <p className="muted">
              {pendingCheckpoint.checkpoint.activityRefs.length} atividades rápidas de{" "}
              {pendingCheckpoint.module.title} — menos de 3 minutos. Complete para entrar no próximo
              bairro.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="continue-button"
              onClick={() => onOpenCheckpoint(pendingCheckpoint.checkpoint.id)}
            >
              Continuar: Desafio do Módulo {pendingCheckpoint.module.order}
            </button>
          </>
        ) : mission ? (
          <>
            <h2>Um morador precisa da sua ajuda</h2>
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

      <div className="card journey-card" data-testid="journey-card">
        <h2>Suas jornadas</h2>
        <p className="muted">
          Duas trilhas no mesmo app. A Jornada Dev é opcional: começa do zero dela, sem
          pré-requisito — se você ainda não usa IA no dia a dia, recomendamos conhecer a Vila Lume
          primeiro.
        </p>
        <fieldset className="journey-options">
          <legend className="sr-only">Escolher jornada</legend>
          <button
            type="button"
            className="btn btn-journey"
            data-testid="journey-switch-ia_pratica"
            aria-pressed={activeJourney === "ia_pratica"}
            disabled={activeJourney === "ia_pratica"}
            onClick={() => onSwitchJourney("ia_pratica")}
          >
            <strong>Vila Lume · IA na Prática</strong>
            <span>
              {activeJourney === "ia_pratica" ? "Jornada atual" : "Voltar à IA do dia a dia"}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-journey"
            data-testid="journey-switch-dev"
            aria-pressed={activeJourney === "dev"}
            disabled={activeJourney === "dev"}
            onClick={() => onSwitchJourney("dev")}
          >
            <strong>Jornada Dev</strong>
            <span>
              {activeJourney === "dev"
                ? "Jornada atual"
                : "9 lições para quem programa com IA (opcional)"}
            </span>
          </button>
        </fieldset>
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
