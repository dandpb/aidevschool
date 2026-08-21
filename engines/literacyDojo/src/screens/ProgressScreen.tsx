import { useRef, useState } from "react";
import { downloadTextFile } from "../adapters/downloadText";
import { useServices } from "../app/services";
import type { LearnerProgress } from "../domain/progress";
import { ACHIEVEMENT_DEFINITIONS, localDateKey } from "../domain/progress";
import { readyLessonEntries } from "../domain/track";
import { buildTrackQueries } from "../domain/trackQueries";

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
  onProgressImported,
}: {
  progress: LearnerProgress;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
  onReview: (lessonId: string) => void;
  onProgressImported: (progress: LearnerProgress) => void;
}) {
  const services = useServices();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );
  const queries = buildTrackQueries(progress, services.content, services.clock);
  const { dailyGoal: goal, dueReviews: due, upcomingReviews: upcoming } = queries;
  const unlockedIds = new Set(progress.achievements.map((achievement) => achievement.id));
  const practicedSkills = Object.values(progress.skills);

  const handleExport = async () => {
    try {
      const json = await services.useCases.exportProgress();
      downloadTextFile(
        `literacydojo-progress-${localDateKey(services.clock())}.json`,
        json,
        "application/json",
      );
      setBackupStatus({
        kind: "ok",
        text: "Backup baixado. O arquivo registra no máximo lições concluídas — nunca mastery.",
      });
    } catch (error) {
      setBackupStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível exportar o progresso.",
      });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const next = await services.useCases.importProgress(await file.text());
      onProgressImported(next);
      setBackupStatus({
        kind: "ok",
        text: "Backup restaurado neste navegador. completed não significa mastered.",
      });
    } catch (error) {
      setBackupStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Backup inválido ou não migrável.",
      });
    }
  };

  const readyLessons = readyLessonEntries(services.content.listModules());
  const lessonBySkillId = new Map<string, (typeof readyLessons)[number]>();
  for (const entry of readyLessons) {
    for (const skillId of entry.skillIds) {
      lessonBySkillId.set(skillId, entry);
    }
  }
  const lessonForSkill = (skillId: string) => lessonBySkillId.get(skillId);

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
          {readyLessons.map((entry) => {
            const status = progress.lessonStatus[entry.id] ?? "locked";
            return (
              <li key={entry.id} className="lesson-row">
                <span className="lesson-name">{entry.title}</span>
                <span className={`chip chip-${status}`}>{queries.statusLabel[status]}</span>
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

      <div className="card" data-testid="progress-backup">
        <h2>Backup neste aparelho</h2>
        <p className="muted">
          O progresso mora só neste navegador: não há conta nem sincronização. Limpar dados do site,
          trocar de aparelho ou de perfil apaga o histórico. Exporte um JSON para guardar uma cópia;
          ao importar, a migração atualiza o formato antigo e o teto continua <code>completed</code>{" "}
          — nunca <code>mastered</code>.
        </p>
        <div className="backup-actions">
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="export-progress"
            onClick={() => void handleExport()}
          >
            Baixar backup JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="import-progress"
            onClick={() => fileInputRef.current?.click()}
          >
            Restaurar backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-progress-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleImportFile(file);
            }}
          />
        </div>
        {backupStatus ? (
          <p
            className={backupStatus.kind === "error" ? "backup-status is-error" : "backup-status"}
            data-testid="backup-status"
            role={backupStatus.kind === "error" ? "alert" : "status"}
          >
            {backupStatus.text}
          </p>
        ) : null}
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
