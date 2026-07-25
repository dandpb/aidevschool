import { useEffect, useState } from "react";
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
}: {
  summary: LessonSummary;
  onNextLesson: (lessonId: string) => void;
  onHome: () => void;
  onMap: () => void;
}) {
  const services = useServices();
  const [taskCategory, setTaskCategory] = useState<OnboardingTaskCategory>();
  const { lesson } = summary;
  const successMessages = summary.activityResults
    .filter((result) => result.pass && result.feedback.summary)
    .map((result) => result.feedback.summary);

  useEffect(() => {
    void services.progressRepo
      .load()
      .then((savedProgress) => setTaskCategory(savedProgress?.onboarding.taskCategory));
  }, [services]);

  return (
    <section
      className="screen result-screen"
      data-testid="result-screen"
      aria-labelledby="result-title"
    >
      <div className="result-hero">
        <div>
          <p className="eyebrow">MISSÃO CONCLUÍDA</p>
          <h1 id="result-title">
            {summary.mode === "review" ? "Revisão concluída" : "Você avançou"}: {lesson.title}
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
          de <strong>competência verificada</strong>, que depende de uma verificação independente —
          e ainda não faz parte deste piloto.
        </p>
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
        {summary.nextLessonId ? (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-lesson"
            onClick={() => onNextLesson(summary.nextLessonId as string)}
          >
            Próxima lição
          </button>
        ) : (
          <button type="button" className="btn btn-primary" data-testid="go-home" onClick={onHome}>
            Voltar ao início
          </button>
        )}
        <button type="button" className="btn btn-secondary" data-testid="go-map" onClick={onMap}>
          Ver mapa da trilha
        </button>
      </div>
    </section>
  );
}
