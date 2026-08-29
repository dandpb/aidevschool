import { useCallback, useEffect, useState } from "react";
import type { LessonSummary } from "../app/App";
import { useServices } from "../app/services";
import { VoxelSkillArt } from "../components/VoxelSkillArt";
import { VoxelTaskArt, taskDetails } from "../components/VoxelTaskArt";
import { VoxelWorld } from "../components/VoxelWorld";
import {
  ACHIEVEMENT_DEFINITIONS,
  MAP_INITIAL_LESSON_ID,
  type OnboardingTaskCategory,
} from "../domain/progress";
import type { LiteracyVerificationReceipt } from "../domain/verification";

/**
 * Resultado (plano seção 9): habilidade praticada, o que foi bem, o que
 * revisar, próximo passo — e a distinção explícita entre "lição concluída"
 * (progresso local) e "competência verificada" (exige verificador independente,
 * fora deste piloto).
 */
export function ResultScreen({
  summary,
  onNextLesson,
  onHome,
  onMap,
  hosted = false,
}: {
  summary: LessonSummary;
  onNextLesson: (lessonId: string) => void;
  onHome: () => void;
  onMap: () => void;
  hosted?: boolean;
}) {
  const services = useServices();
  const [taskCategory, setTaskCategory] = useState<OnboardingTaskCategory>();
  const [receipt, setReceipt] = useState<LiteracyVerificationReceipt>();
  const [verificationError, setVerificationError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const { lesson } = summary;
  const successMessages = summary.activityResults
    .filter((result) => result.pass && result.feedback.summary)
    .map((result) => result.feedback.summary);

  useEffect(() => {
    void services.progressRepo.load().then((savedProgress) => {
      setTaskCategory(savedProgress?.onboarding.taskCategory);
    });
  }, [services]);

  const verifyAttempt = useCallback(async () => {
    if (!summary.evidenceRecord) return;
    setVerifying(true);
    setVerificationError(undefined);
    try {
      setReceipt(await services.verification.verify(summary.evidenceRecord));
    } catch (error) {
      setReceipt(undefined);
      setVerificationError(
        error instanceof Error ? error.message : "Não foi possível verificar esta tentativa.",
      );
    } finally {
      setVerifying(false);
    }
  }, [services.verification, summary.evidenceRecord]);

  useEffect(() => {
    void verifyAttempt();
  }, [verifyAttempt]);

  return (
    <section
      className="screen result-screen"
      data-testid="result-screen"
      aria-labelledby="result-title"
    >
      <div className="result-hero">
        <div>
          <p className="eyebrow">VILA LUME · MISSÃO CONCLUÍDA</p>
          <h1 id="result-title">
            {summary.mode === "review" ? "Revisão concluída" : "A vila ganhou uma nova luz"}:{" "}
            {lesson.title}
          </h1>
          <p className="result-score">
            {summary.mode === "review" ? "Revisão registrada" : "XP conquistado"} ·{" "}
            {Math.round(summary.lessonScore * 100)}% de pontuação
          </p>
        </div>
        <VoxelWorld variant="celebration" />
      </div>

      <div className="card">
        <h2>Habilidade praticada</h2>
        <p>{lesson.skillIds.map((id) => services.content.getSkillTitle(id)).join(", ")}</p>
        <VoxelSkillArt skillId={lesson.skillIds[0]} />
      </div>

      {summary.newlyUnlocked !== undefined && summary.newlyUnlocked.length > 0 && (
        <div className="card" data-testid="new-achievements">
          <h2>Conquista desbloqueada</h2>
          <ul>
            {summary.newlyUnlocked.map((achievement) => (
              <li key={achievement.id}>
                🏆{" "}
                {ACHIEVEMENT_DEFINITIONS.find((definition) => definition.id === achievement.id)
                  ?.title ?? achievement.id}
              </li>
            ))}
          </ul>
          <p className="muted">Conquistas marcam constância, não competência verificada.</p>
        </div>
      )}

      {successMessages.length > 0 && (
        <div className="card">
          <h2>O que foi bem</h2>
          <ul>
            {successMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Para fixar</h2>
        <ul>
          {lesson.rubric.criteria.map((criterion) => (
            <li key={criterion.id}>{criterion.text}</li>
          ))}
        </ul>
        <p className="muted">Vamos lembrar você de revisar esta lição nos próximos dias.</p>
      </div>

      <div className="card card-note" data-testid="completion-distinction">
        <h2>O que isto significa</h2>
        <p>
          <strong>Lição concluída</strong> registra o seu progresso neste aparelho. Isso é diferente
          de <strong>competência verificada</strong>.{" "}
          {hosted
            ? "A evidência seguirá para verificação independente, mas este fluxo não altera o estado canônico."
            : "Ela depende de uma verificação independente, que ainda não faz parte deste aplicativo."}
        </p>
      </div>

      <div className="card" data-testid="verification-status" aria-live="polite">
        <h2>Verificação da tentativa</h2>
        {verifying && <p>Enviando evidência estruturada para verificação independente…</p>}
        {receipt && (
          <p>
            <strong>Recibo independente: {receipt.verdict}</strong>. Ele corresponde à tentativa{" "}
            {receipt.attempt_id}. A lição continua concluída somente neste aparelho; este recibo não
            altera domínio canônico.
          </p>
        )}
        {verificationError && (
          <>
            <p role="alert">{verificationError}</p>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="retry-verification"
              onClick={() => void verifyAttempt()}
            >
              Tentar verificação novamente
            </button>
          </>
        )}
        {!summary.evidenceRecord && <p>Nenhuma tentativa aprovada disponível para verificação.</p>}
      </div>

      {lesson.id === MAP_INITIAL_LESSON_ID && summary.nextLessonId && (
        <>
          {taskCategory && (
            <div className="card task-context" data-testid="result-task-context">
              <VoxelTaskArt category={taskCategory} />
              <div>
                <h2>Sua próxima aplicação: {taskDetails(taskCategory).label}</h2>
                <p>{taskDetails(taskCategory).guidance}</p>
              </div>
            </div>
          )}
          <div className="card" data-testid="route-explanation">
            <h2>Seu próximo passo</h2>
            <p>
              {summary.nextLessonId === "l03"
                ? "Você identificou os sinais de confiança logo de primeira. Vamos avançar para entender onde a IA ajuda e onde ela pode falhar."
                : "Como você fez uma checagem extra ou pediu apoio no Mapa Inicial, vamos começar com uma conversa simples com IA antes de avançar."}
            </p>
          </div>
        </>
      )}

      <div className="dev-teaser">
        <strong>Trilha Dev</strong>
        <span>Em breve: desafios para quem programa com IA.</span>
      </div>

      <div className="actions">
        {hosted ? (
          <output className="muted">
            Sinal de conclusão enviado ao hub. Use o botão Voltar ao hub ao redor da missão.
          </output>
        ) : summary.nextLessonId ? (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-lesson"
            onClick={() => onNextLesson(summary.nextLessonId as string)}
          >
            Próximo pedido
          </button>
        ) : (
          <button type="button" className="btn btn-primary" data-testid="go-home" onClick={onHome}>
            Voltar à vila
          </button>
        )}
        {!hosted && (
          <button type="button" className="btn btn-secondary" data-testid="go-map" onClick={onMap}>
            Ver mapa da Vila Lume
          </button>
        )}
      </div>
    </section>
  );
}
