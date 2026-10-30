import { useEffect, useRef, useState } from "react";
import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { TabSafetyNotice } from "../components/TabSafetyNotice";
import { VoxelWorld } from "../components/VoxelWorld";
import { type JourneyId, activeJourneyOf } from "../domain/journeyProgress";
import type { LearnerProgress } from "../domain/progress";
import { currentStreakForDate } from "../domain/progress";
import { RETROFIT_NOTICE_S1, isRetrofittedLesson } from "../domain/retrofitNotice";
import { reviewDueInfo } from "../domain/reviewDue";
import { readyLessonEntries } from "../domain/track";
import { buildTrackQueries } from "../domain/trackQueries";

/**
 * Home (plano seção 9): missão do dia, progresso da trilha, revisão pendente,
 * sequência e um botão único para continuar.
 */
export function HomeScreen({
  progress,
  mutationBlocked = false,
  navigationBlocked = false,
  canMutate = () => true,
  onContinue,
  onReview,
  onOpenCheckpoint,
  onOpenMap,
  onOpenProgress,
  onSwitchJourney,
  onReset,
}: {
  progress: LearnerProgress;
  mutationBlocked?: boolean;
  navigationBlocked?: boolean;
  canMutate?: () => boolean;
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
  const currentStreak = currentStreakForDate(progress.streak, services.clock());
  const devLessonCount = readyLessonEntries(services.content.listModules("dev")).length;
  const queries = buildTrackQueries(progress, services.content, services.clock, activeJourney);
  const {
    mission,
    reviewLesson,
    reviewSkill,
    dailyGoal: goal,
    trackSummary: summary,
    dueReviews,
  } = queries;
  const pendingCheckpoint = queries.pendingCheckpoint;

  // W7 AID-5190 (contrato §7.2 — anúncio de mudança): a live region sr-only
  // anuncia o estado de sequência/revisões 1× por sessão (montagem) e a cada
  // mudança de streak ou revisões — o texto é inserido depois do render, então leitores
  // de tela o anunciam como atualização.
  const [liveMessage, setLiveMessage] = useState("");
  const announcedStreak = useRef<number | null | undefined>(undefined);
  const announcedReviews = useRef<number | undefined>(undefined);
  useEffect(() => {
    const current = currentStreak;
    if (announcedStreak.current === undefined) {
      const reviewNote =
        dueReviews.length === 0
          ? ""
          : ` ${dueReviews.length} ${dueReviews.length === 1 ? "revisão devida" : "revisões devidas"} no total entre jornadas.`;
      setLiveMessage(
        `${current === null ? "Sequência atual indisponível." : `Sequência: ${current} ${current === 1 ? "dia" : "dias"}.`}${reviewNote}`,
      );
    } else {
      const changes: string[] = [];
      if (announcedStreak.current !== current) {
        changes.push(
          current === null
            ? "Sequência atual indisponível."
            : `Sequência agora: ${current} ${current === 1 ? "dia" : "dias"}.`,
        );
      }
      if (announcedReviews.current !== dueReviews.length) {
        changes.push(
          `${dueReviews.length} ${dueReviews.length === 1 ? "revisão devida" : "revisões devidas"} no total entre jornadas.`,
        );
      }
      if (changes.length > 0) setLiveMessage(changes.join(" "));
    }
    announcedStreak.current = current;
    announcedReviews.current = dueReviews.length;
  }, [currentStreak, dueReviews.length]);

  const reviewDue = reviewSkill?.nextReviewAt
    ? reviewDueInfo(reviewSkill.nextReviewAt, services.clock())
    : undefined;

  const handleReset = () => {
    if (!canMutate()) return;
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
        {/* W7 AID-5190 (contrato §7.2 — papel StreakChip): o wrapper carrega o
            testid canônico hud-streak; o span interno mantém streak-value
            (contrato E2E existente da gamification). */}
        <span className="stat" data-testid="hud-streak">
          <span data-testid="streak-value">
            <span aria-hidden="true">🔥 </span>
            {currentStreak === null
              ? "Sequência atual indisponível"
              : `Sequência: ${currentStreak} ${currentStreak === 1 ? "dia" : "dias"}`}
          </span>
        </span>
        <span
          className={goal.done ? "stat stat-done" : "stat"}
          data-testid="daily-goal"
          aria-label={`Meta de hoje: ${goal.earned} de ${goal.goal} XP`}
        >
          Meta de hoje: {goal.earned}/{goal.goal} XP{goal.done ? " ✅" : ""}
        </span>
        {/* W7 AID-5190 (contrato §7.2): <output> carrega role="status"
            implícito (aria-live polite) — padrão do OnboardingScreen; o
            texto muda depois do render, então leitores de tela anunciam. */}
        <output className="sr-only" data-testid="hud-live-region">
          {liveMessage}
        </output>
      </div>

      <MentorGuide compact>
        <p>Lumi guarda seu caminho: continue um pedido ou explore os bairros da vila.</p>
      </MentorGuide>

      <p className="muted">
        <TabSafetyNotice />
      </p>

      <div className="card mission-card">
        <p className="card-kicker">PEDIDO DA VILA</p>
        {pendingCheckpoint ? (
          <>
            <h2 data-testid="checkpoint-mission">
              Continuar: Desafio do Módulo {pendingCheckpoint.module.order}
            </h2>
            <p className="muted">
              {pendingCheckpoint.checkpoint.activityRefs.length} atividades rápidas de{" "}
              {pendingCheckpoint.module.title} — menos de 3 minutos.{" "}
              {pendingCheckpoint.gatesModuleTitle
                ? "Complete para desbloquear a primeira missão do próximo bairro."
                : "Conclua quando estiver pronto."}
            </p>
            <p className="muted" data-testid="checkpoint-continuity-home">
              Ao reabrir, o desafio volta à primeira atividade; tentativas já registradas ficam
              neste navegador.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="continue-button"
              aria-disabled={mutationBlocked}
              onClick={() => onOpenCheckpoint(pendingCheckpoint.checkpoint.id)}
            >
              Abrir desafio do Módulo {pendingCheckpoint.module.order}
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
              aria-disabled={mutationBlocked}
              onClick={() => onContinue(mission.id)}
            >
              {progress.lessonStatus[mission.id] === "in_progress"
                ? "Continuar pedido"
                : "Atender pedido"}
            </button>
          </>
        ) : summary.completed === summary.total && summary.total > 0 ? (
          <p data-testid="mission-done">
            Você concluiu todas as lições deste piloto. 🎉 Novas lições estão a caminho — enquanto
            isso, revise o que já praticou no mapa da trilha.
          </p>
        ) : (
          <p data-testid="mission-unavailable">
            Nenhum pedido está disponível agora. Abra o mapa para ver o estado da jornada.
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
            aria-disabled={mutationBlocked || activeJourney === "ia_pratica"}
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
            aria-disabled={mutationBlocked || activeJourney === "dev"}
            onClick={() => onSwitchJourney("dev")}
          >
            <strong>Jornada Dev</strong>
            <span>
              {activeJourney === "dev"
                ? "Jornada atual"
                : `${devLessonCount} ${devLessonCount === 1 ? "lição" : "lições"} para quem programa com IA (opcional)`}
            </span>
          </button>
        </fieldset>
      </div>

      <div className="card">
        <h2>Sua trilha</h2>
        {/* W7 AID-5190 (contrato §7.2 — papel MasteryBadge): bounded context
            local — o máximo que a HUD da literacy mostra é "concluídas"
            (completed), nunca mastered. Glifo aria-hidden completa
            cor+texto+glifo (B3). */}
        <p data-testid="hud-mastery-badge">
          <span data-testid="track-progress">
            {summary.completed} de {summary.total} lições concluídas
          </span>{" "}
          <span aria-hidden="true">✅</span>
        </p>
        <div
          className="progress-track"
          role="progressbar"
          data-testid="hud-progress"
          tabIndex={0}
          aria-valuenow={summary.completed}
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuetext={`${
            summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100)
          }% concluído`}
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
          aria-disabled={navigationBlocked}
          onClick={onOpenMap}
        >
          {activeJourney === "dev" ? "Explorar Jornada Dev" : "Explorar Vila Lume"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="open-progress"
          aria-disabled={navigationBlocked}
          onClick={onOpenProgress}
        >
          Ver seu progresso
        </button>
      </div>

      {reviewSkill && reviewLesson && (
        <div className="card card-review">
          <h2>Revisão pendente</h2>
          {/* W7 AID-5190 (contrato §7.2 — papel ReviewDue): reason + dueIn em
              pt-BR legível derivado do nextReviewAt agendado. */}
          {reviewDue ? <p data-testid="hud-review-due">Revisão {reviewDue.dueIn}</p> : null}
          <p>Hora de revisar: {services.content.getSkillTitle(reviewSkill.skillId)}.</p>
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
            aria-disabled={mutationBlocked}
            onClick={() => onReview(reviewLesson.id)}
          >
            Revisar agora
          </button>
        </div>
      )}

      <footer className="screen-footer">
        {/* AID-3705 (D2): porta de volta à entrada /escola/ — link discreto no
        rodapé da Home, fora do loop de aprendizado (nada no header). */}
        <a className="btn btn-link" data-testid="escola-link" href="/escola/">
          Escola de IA · ver as duas jornadas
        </a>
        <button
          type="button"
          className="btn btn-link"
          data-testid="reset-progress"
          aria-disabled={mutationBlocked}
          onClick={handleReset}
        >
          Apagar progresso e recomeçar
        </button>
      </footer>
    </section>
  );
}
