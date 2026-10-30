import { useEffect, useRef, useState } from "react";
import { downloadTextFile } from "../adapters/downloadText";
import { useServices } from "../app/services";
import { BackupImportValidationError } from "../application/backupImportErrors";
import { activeJourneyOf } from "../domain/journeyProgress";
import type { LearnerProgress } from "../domain/progress";
import { ACHIEVEMENT_DEFINITIONS, currentStreakForDate, localDateKey } from "../domain/progress";
import { parseReviewTimestamp } from "../domain/reviewTimestamp";
import { readyLessonEntries } from "../domain/track";
import { buildTrackQueries } from "../domain/trackQueries";

function formatDate(iso: string): string {
  const instant = parseReviewTimestamp(iso);
  if (instant === null) return "data indisponível";
  return new Date(instant).toLocaleDateString("pt-BR", {
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
  mutationBlocked = false,
  canMutate = () => true,
  onBack,
  onStartLesson,
  onReview,
  onProgressImported,
}: {
  progress: LearnerProgress;
  mutationBlocked?: boolean;
  canMutate?: () => boolean;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
  onReview: (lessonId: string) => void;
  onProgressImported: (progress: LearnerProgress) => void;
}) {
  const services = useServices();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupBusyRef = useRef(false);
  const [backupOperation, setBackupOperation] = useState<"import" | "export" | null>(null);
  const backupBusy = backupOperation !== null;
  // AID-1755/T3 (padrão AID-1150): a tela possui o contrato de foco do seu
  // próprio h1 (tabIndex=-1 + refocus na montagem, padrão do
  // LessonScreen/CheckpointScreen) — a troca de rota SPA reposiciona a
  // referência de leitura no título "Seu progresso" sem depender do efeito
  // genérico de rota do App; mudanças assíncronas (backup) seguem nos live
  // regions role=status/alert do backupStatus.
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const queries = buildTrackQueries(
    progress,
    services.content,
    services.clock,
    activeJourneyOf(progress),
  );
  const { dailyGoal: goal, dueReviews: due, upcomingReviews: upcoming } = queries;
  const currentStreak = currentStreakForDate(progress.streak, services.clock());
  const unlockedIds = new Set(progress.achievements.map((achievement) => achievement.id));
  const practicedSkills = Object.values(progress.skills);
  const invalidReviewDate = practicedSkills.some(
    (skill) =>
      skill.nextReviewAt !== undefined && parseReviewTimestamp(skill.nextReviewAt) === null,
  );

  const handleExport = async () => {
    if (backupBusyRef.current || !canMutate()) return;
    backupBusyRef.current = true;
    setBackupOperation("export");
    setBackupStatus(null);
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
    } finally {
      backupBusyRef.current = false;
      setBackupOperation(null);
    }
  };

  const handleImportFile = async (file: File) => {
    if (backupBusyRef.current || !canMutate()) return;
    backupBusyRef.current = true;
    setBackupOperation("import");
    setBackupStatus(null);
    try {
      const raw = await file.text();
      let next: LearnerProgress;
      try {
        next = await services.useCases.importProgress(raw);
      } catch (error) {
        if (error instanceof BackupImportValidationError) {
          setBackupStatus({
            kind: "error",
            text:
              error.reason === "corrupt"
                ? "O arquivo é inválido ou incompleto, ou usa um formato incompatível. Esta restauração não gravou dados; escolha outro backup."
                : "Este formato de backup não é compatível. Esta restauração não gravou dados; escolha um backup compatível.",
          });
          return;
        }
        throw error;
      }
      onProgressImported(next);
      setBackupStatus({
        kind: "ok",
        text: "Backup restaurado neste navegador. completed não significa mastered.",
      });
    } catch {
      setBackupStatus({
        kind: "error",
        text: "Não foi possível confirmar a restauração. Confira o arquivo; a gravação pode já ter ocorrido. Recarregue para verificar o progresso antes de tentar de novo.",
      });
    } finally {
      backupBusyRef.current = false;
      setBackupOperation(null);
    }
  };

  const activeJourney = activeJourneyOf(progress);
  const otherJourney = activeJourney === "ia_pratica" ? "dev" : "ia_pratica";
  const readyLessons = readyLessonEntries(services.content.listModules(activeJourney));
  const otherReadyLessons = readyLessonEntries(services.content.listModules(otherJourney));
  const lessonBySkillId = new Map<string, (typeof readyLessons)[number]>();
  for (const entry of readyLessons) {
    if (progress.lessonStatus[entry.id] !== "completed") continue;
    for (const skillId of entry.skillIds) {
      if (!lessonBySkillId.has(skillId)) lessonBySkillId.set(skillId, entry);
    }
  }
  const lessonForSkill = (skillId: string) => lessonBySkillId.get(skillId);

  return (
    <section className="screen" data-testid="progress-screen" aria-labelledby="progress-title">
      <h1 id="progress-title" ref={headingRef} tabIndex={-1}>
        Seu progresso
      </h1>

      <div className="card">
        <h2>Engajamento</h2>
        <p data-testid="progress-xp">
          {progress.xp} XP ·{" "}
          {currentStreak === null
            ? "sequência atual indisponível"
            : `sequência atual de ${currentStreak} ${currentStreak === 1 ? "dia" : "dias"}`}{" "}
          (recorde: {progress.streak.longest})
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
        {invalidReviewDate && (
          <p className="muted">
            Algumas datas de revisão estão indisponíveis e não aparecem na agenda.
          </p>
        )}
        {due.length > 0 && (
          <>
            <p>Revisão pendente agora:</p>
            <ul data-testid="reviews-due">
              {due.map((skill) => {
                const lesson = lessonForSkill(skill.skillId);
                const otherLesson = otherReadyLessons.find(
                  (entry) =>
                    progress.lessonStatus[entry.id] === "completed" &&
                    entry.skillIds.some((id) => id === skill.skillId),
                );
                return (
                  <li key={skill.skillId}>
                    {services.content.getSkillTitle(skill.skillId)}
                    {lesson ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="btn btn-small"
                          data-testid={`progress-review-${lesson.id}`}
                          aria-label={`Revisar ${services.content.getSkillTitle(skill.skillId)}: ${lesson.title}`}
                          aria-disabled={backupBusy || mutationBlocked}
                          onClick={() => {
                            if (!backupBusyRef.current && canMutate()) onReview(lesson.id);
                          }}
                        >
                          Revisar
                        </button>
                      </>
                    ) : otherLesson ? (
                      <span className="muted">
                        {" "}
                        — Volte ao início, escolha{" "}
                        {otherJourney === "dev" ? "Jornada Dev" : "Vila Lume · IA na Prática"},
                        depois volte do mapa e abra seu progresso para revisar.
                      </span>
                    ) : (
                      <span className="muted">
                        {" "}
                        — Nenhuma lição concluída disponível para revisar esta habilidade.
                      </span>
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
          due.length === 0 &&
          !invalidReviewDate && <p className="muted">Nenhuma revisão agendada ainda.</p>
        )}
      </div>

      <div className="card">
        <h2>Trilha</h2>
        <ul className="lesson-list progress-lesson-list">
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
                    aria-label={`${status === "in_progress" ? "Continuar" : "Começar"} ${entry.title}`}
                    aria-disabled={backupBusy || mutationBlocked}
                    onClick={() => {
                      if (!backupBusyRef.current && canMutate()) onStartLesson(entry.id);
                    }}
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
            aria-disabled={backupBusy || mutationBlocked}
            onClick={() => void handleExport()}
          >
            Baixar backup JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="import-progress"
            aria-disabled={backupBusy || mutationBlocked}
            onClick={() => {
              if (!backupBusyRef.current && canMutate()) fileInputRef.current?.click();
            }}
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
        {backupBusy && (
          <output>
            {backupOperation === "import" ? "Restaurando" : "Preparando"} backup… aguarde antes de
            continuar.
          </output>
        )}
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
        aria-disabled={backupBusy}
        onClick={() => {
          if (!backupBusyRef.current) onBack();
        }}
      >
        Voltar
      </button>
    </section>
  );
}
