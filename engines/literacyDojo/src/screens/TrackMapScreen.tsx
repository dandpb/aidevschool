import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelWorld } from "../components/VoxelWorld";
import { type LearnerProgress, type LessonStatus, isLessonUnlocked } from "../domain/progress";
import { trackSummary } from "../domain/track";

const STATUS_LABEL: Record<LessonStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
};

const STATUS_ICON: Record<LessonStatus, string> = {
  locked: "◆",
  available: "▶",
  in_progress: "↗",
  completed: "✓",
};

const ZONE_COPY = [
  "Descubra o que a IA faz — e o que continua sendo decisão humana.",
  "Aprenda a pedir melhor, comparar alternativas e ajustar o resultado.",
  "Reconheça sinais de erro e verifique antes de confiar.",
  "Use IA com segurança em situações reais do cotidiano.",
];

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
  const { completed, total } = trackSummary(modules, progress);

  return (
    <section className="screen map-screen" data-testid="map-screen" aria-labelledby="map-title">
      <div className="map-hero">
        <div className="map-hero-copy">
          <p className="eyebrow">SUA JORNADA</p>
          <h1 id="map-title">Mapa de mundos</h1>
          <p>
            Cada missão leva de 3 a 5 minutos. Tente primeiro, receba feedback e desbloqueie o
            próximo caminho.
          </p>
          <div className="map-summary" aria-label="Resumo da trilha">
            <span>
              <strong>{completed}</strong>/{total} missões
            </span>
            <span>
              <strong>{progress.xp}</strong> XP
            </span>
            <span>
              <strong>{progress.streak.current}</strong> dias de sequência
            </span>
          </div>
        </div>
        <VoxelWorld variant="map" />
      </div>

      <MentorGuide compact testId="map-guide">
        <p>
          Comece pela missão marcada como Disponível. As ilhas seguintes aparecem conforme você
          pratica.
        </p>
      </MentorGuide>

      <div className="learning-worlds">
        {modules.map((module, moduleIndex) => {
          const moduleCompleted = module.lessons.filter(
            (lesson) => progress.lessonStatus[lesson.id] === "completed",
          ).length;
          return (
            <section
              className={`learning-world learning-world-${(moduleIndex % 4) + 1}`}
              key={module.id}
              aria-labelledby={`module-${module.id}`}
            >
              <header className="world-heading">
                <div className="world-number" aria-hidden="true">
                  {module.order}
                </div>
                <div>
                  <p className="world-kicker">MUNDO {module.order}</p>
                  <h2 id={`module-${module.id}`}>{module.title}</h2>
                  <p>{ZONE_COPY[moduleIndex] ?? "Pratique uma nova habilidade com IA."}</p>
                </div>
                <span className="world-count">
                  {moduleCompleted}/{module.lessons.length}
                </span>
              </header>

              <ol className="lesson-list">
                {module.lessons.map((entry, lessonIndex) => {
                  if (!entry.hasContent) {
                    return (
                      <li
                        key={entry.id}
                        className="lesson-row is-planned"
                        data-testid={`map-lesson-${entry.id}`}
                      >
                        <span className="lesson-node lesson-node-planned" aria-hidden="true">
                          ◇
                        </span>
                        <span className="lesson-copy">
                          <span className="lesson-order">MISSÃO {lessonIndex + 1}</span>
                          <span className="lesson-name">{entry.title}</span>
                        </span>
                        <span className="chip chip-planned">Em breve</span>
                      </li>
                    );
                  }

                  const status = progress.lessonStatus[entry.id] ?? "locked";
                  const unlocked = isLessonUnlocked(progress, entry.id);
                  return (
                    <li
                      key={entry.id}
                      className={`lesson-row lesson-row-${status}`}
                      data-testid={`map-lesson-${entry.id}`}
                    >
                      <span className={`lesson-node lesson-node-${status}`} aria-hidden="true">
                        {STATUS_ICON[status]}
                      </span>
                      <span className="lesson-copy">
                        <span className="lesson-order">MISSÃO {lessonIndex + 1}</span>
                        <span className="lesson-name">{entry.title}</span>
                        <span className="lesson-meta">
                          {entry.estimatedMinutes} min · {STATUS_LABEL[status]}
                        </span>
                      </span>
                      {unlocked ? (
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
                      ) : (
                        <span className={`chip chip-${status}`}>{STATUS_LABEL[status]}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="map-footer-actions">
        <button type="button" className="btn btn-secondary" data-testid="map-back" onClick={onBack}>
          Voltar ao início
        </button>
      </div>
    </section>
  );
}
