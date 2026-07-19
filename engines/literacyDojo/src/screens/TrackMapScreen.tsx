import { useServices } from "../app/services";
import { type LearnerProgress, type LessonStatus, isLessonUnlocked } from "../domain/progress";

const STATUS_LABEL: Record<LessonStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
};

/**
 * Mapa da trilha: módulos e lições com status. Lições `planned` aparecem
 * bloqueadas como "em breve" — elas existem no catálogo (read model) mas
 * ainda não têm conteúdo.
 */
export function TrackMapScreen({
  progress,
  onBack,
  onStartLesson,
}: {
  progress: LearnerProgress;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
}) {
  const services = useServices();
  const modules = services.content.listModules();

  return (
    <section className="screen" data-testid="map-screen" aria-labelledby="map-title">
      <h1 id="map-title">Mapa da trilha</h1>
      {modules.map((module) => (
        <div className="card" key={module.id}>
          <h2>
            Módulo {module.order} — {module.title}
          </h2>
          <ul className="lesson-list">
            {module.lessons.map((entry) => {
              if (!entry.hasContent) {
                return (
                  <li
                    key={entry.id}
                    className="lesson-row is-planned"
                    data-testid={`map-lesson-${entry.id}`}
                  >
                    <span className="lesson-name">{entry.title}</span>
                    <span className="chip chip-planned">Em breve</span>
                  </li>
                );
              }
              const status = progress.lessonStatus[entry.id] ?? "locked";
              const unlocked = isLessonUnlocked(progress, entry.id);
              return (
                <li key={entry.id} className="lesson-row" data-testid={`map-lesson-${entry.id}`}>
                  <span className="lesson-name">
                    {entry.title}
                    <span className="muted"> · {entry.estimatedMinutes} min</span>
                  </span>
                  <span className={`chip chip-${status}`}>{STATUS_LABEL[status]}</span>
                  {unlocked && (
                    <button
                      type="button"
                      className="btn btn-small"
                      data-testid={`map-start-${entry.id}`}
                      onClick={() => onStartLesson(entry.id)}
                    >
                      {status === "completed"
                        ? "Refazer"
                        : status === "in_progress"
                          ? "Continuar"
                          : "Começar"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" data-testid="map-back" onClick={onBack}>
        Voltar
      </button>
    </section>
  );
}
