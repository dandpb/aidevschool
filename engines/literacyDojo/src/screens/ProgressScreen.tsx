import { useServices } from "../app/services";
import type { SkillId } from "../data/generated/lessons";
import {
  ACHIEVEMENT_DEFINITIONS,
  type LearnerProgress,
  dailyGoalStatus,
  reviewsDue,
  upcomingReviews,
} from "../domain/progress";
import { readyLessonEntries } from "../domain/track";

const STATUS_LABEL: Record<string, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Área de progresso (plano seção 9 — "Progresso"): módulos e lições, skills
 * praticadas, revisões futuras, conquistas e engajamento. Sem texto livre —
 * somente contadores, notas e datas.
 */
export function ProgressScreen({
  progress,
  onBack,
  onStartLesson,
  onReview,
}: {
  progress: LearnerProgress;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
  onReview: (lessonId: string) => void;
}) {
  const services = useServices();
  const modules = services.content.listModules();
  const ready = readyLessonEntries(modules);
  const now = services.clock.now();
  const goal = dailyGoalStatus(progress, now);
  const due = reviewsDue(progress, now);
  const upcoming = upcomingReviews(progress, now);
  const unlockedIds = new Set(progress.achievements.map((achievement) => achievement.id));
  const practicedSkills = Object.values(progress.skills);

  const lessonForSkill = (skillId: string) =>
    ready.find((entry) => entry.skillIds.includes(skillId as SkillId));

  return (
    <section className="screen" data-testid="progress-screen" aria-labelledby="progress-title">
      <h1 id="progress-title">Seu progresso</h1>

      <div className="card">
        <h2>Engajamento</h2>
        <p data-testid="progress-xp">
          {progress.xp} XP · sequência atual de {progress.streak.current}{" "}
          {progress.streak.current === 1 ? "dia" : "dias"} (recorde: {progress.streak.longest})
        </p>
        <p className="muted">
          Meta de hoje: {goal.earned}/{goal.goal} XP {goal.done ? "— cumprida ✅" : ""}
        </p>
        <p className="muted">
          Engajamento motiva, mas não é prova de competência — isso depende de verificação
          independente.
        </p>
      </div>

      <div className="card">
        <h2>Conquistas</h2>
        <ul className="achievement-list" data-testid="achievement-list">
          {ACHIEVEMENT_DEFINITIONS.map((definition) => {
            const unlocked = unlockedIds.has(definition.id);
            return (
              <li
                key={definition.id}
                className={unlocked ? "achievement is-unlocked" : "achievement"}
                data-testid={`achievement-${definition.id}`}
              >
                <strong>
                  {unlocked ? "🏆 " : "🔒 "}
                  {definition.title}
                </strong>
                <br />
                <span className="muted">{definition.description}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <h2>Habilidades praticadas</h2>
        {practicedSkills.length === 0 ? (
          <p className="muted">Nenhuma habilidade praticada ainda — conclua a primeira lição.</p>
        ) : (
          <ul className="skill-list" data-testid="skill-list">
            {practicedSkills.map((skill) => (
              <li key={skill.skillId}>
                <strong>{services.content.getSkillTitle(skill.skillId)}</strong>: {skill.attempts}{" "}
                {skill.attempts === 1 ? "tentativa" : "tentativas"}, última pontuação{" "}
                {Math.round(skill.lastScore * 100)}%
                {skill.nextReviewAt ? `, próxima revisão em ${formatDate(skill.nextReviewAt)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Revisões</h2>
        {due.length > 0 && (
          <>
            <p>Revisão pendente agora:</p>
            <ul data-testid="reviews-due">
              {due.map((skill) => {
                const lesson = lessonForSkill(skill.skillId);
                return (
                  <li key={skill.skillId}>
                    {services.content.getSkillTitle(skill.skillId)}
                    {lesson && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="btn btn-small"
                          data-testid={`progress-review-${lesson.id}`}
                          onClick={() => onReview(lesson.id)}
                        >
                          Revisar
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {upcoming.length > 0 ? (
          <>
            <p>Próximas revisões:</p>
            <ul data-testid="reviews-upcoming">
              {upcoming.map((skill) => (
                <li key={skill.skillId}>
                  {services.content.getSkillTitle(skill.skillId)} —{" "}
                  {formatDate(skill.nextReviewAt ?? "")}
                </li>
              ))}
            </ul>
          </>
        ) : (
          due.length === 0 && <p className="muted">Nenhuma revisão agendada ainda.</p>
        )}
      </div>

      <div className="card">
        <h2>Trilha</h2>
        <ul className="lesson-list">
          {ready.map((entry) => {
            const status = progress.lessonStatus[entry.id] ?? "locked";
            return (
              <li key={entry.id} className="lesson-row">
                <span className="lesson-name">{entry.title}</span>
                <span className={`chip chip-${status}`}>{STATUS_LABEL[status]}</span>
                {(status === "available" || status === "in_progress") && (
                  <button
                    type="button"
                    className="btn btn-small"
                    data-testid={`progress-start-${entry.id}`}
                    onClick={() => onStartLesson(entry.id)}
                  >
                    {status === "in_progress" ? "Continuar" : "Começar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        data-testid="progress-back"
        onClick={onBack}
      >
        Voltar
      </button>
    </section>
  );
}
