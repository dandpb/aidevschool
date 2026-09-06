import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelWorld } from "../components/VoxelWorld";
import type { ModuleCheckpointId } from "../domain/checkpoints";
import { isLessonGateLocked } from "../domain/checkpoints";
import { type LearnerProgress, type LessonStatus, isLessonUnlocked } from "../domain/progress";
import { buildTrackQueries } from "../domain/trackQueries";

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

const ZONE_NAMES = [
  "Praça do Encontro",
  "Oficina de Contexto",
  "Biblioteca da Dúvida",
  "Correio Seguro",
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
  onOpenCheckpoint,
}: {
  progress: LearnerProgress;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
  onOpenCheckpoint: (checkpointId: ModuleCheckpointId) => void;
}) {
  const services = useServices();
  const queries = buildTrackQueries(progress, services.content, services.clock);
  const { trackSummary: summary, statusLabel } = queries;
  const modules = services.content.listModules();

  return (
    <section className="screen map-screen" data-testid="map-screen" aria-labelledby="map-title">
      <div className="map-hero">
        <div className="map-hero-copy">
          <p className="eyebrow">VILA LUME</p>
          <h1 id="map-title">Mapa da Vila Lume</h1>
          <p>
            Cada pedido leva de 3 a 5 minutos. Tente primeiro, receba feedback e ilumine o próximo
            caminho.
          </p>
          <div className="map-summary" aria-label="Resumo da trilha">
            <span>
              <strong>{summary.completed}</strong>/{summary.total} missões
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
          Comece pelo pedido marcado como Disponível. Os bairros seguintes aparecem conforme você
          pratica.
        </p>
      </MentorGuide>

      <div className="learning-worlds">
        {queries.moduleSummaries.map(({ module, completedCount, totalCount }, moduleIndex) => (
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
                <p className="world-kicker">BAIRRO {module.order}</p>
                <h2 id={`module-${module.id}`}>{ZONE_NAMES[moduleIndex] ?? module.title}</h2>
                <p>
                  <strong>{module.title}.</strong>{" "}
                  {ZONE_COPY[moduleIndex] ?? "Pratique uma nova habilidade com IA."}
                </p>
              </div>
              <span className="world-count">
                {completedCount}/{totalCount}
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
                const gateLocked =
                  status === "locked" && isLessonGateLocked(progress, modules, entry.id);
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
                        {entry.estimatedMinutes} min ·{" "}
                        {gateLocked ? "Complete o Desafio do Módulo anterior" : statusLabel[status]}
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
                    ) : gateLocked ? (
                      <span className="chip chip-locked" data-testid={`map-gate-${entry.id}`}>
                        Desafio pendente
                      </span>
                    ) : (
                      <span className={`chip chip-${status}`}>{statusLabel[status]}</span>
                    )}
                  </li>
                );
              })}
            </ol>

            {queries.checkpointSummaries
              .filter((item) => item.module.id === module.id)
              .map((item) => {
                if (!item.available && !item.completed) return null;
                const nextModuleTitle = item.gatesModuleTitle;
                return (
                  <div
                    key={`checkpoint-${item.checkpoint.id}`}
                    className={`card checkpoint-card ${
                      item.completed ? "checkpoint-card-done" : "checkpoint-card-open"
                    }`}
                    data-testid={`checkpoint-${item.checkpoint.id}`}
                  >
                    <p className="card-kicker">DESAFIO DO MÓDULO {module.order}</p>
                    <h3>
                      {item.completed
                        ? `Desafio do Módulo ${module.order} concluído ✓`
                        : `Desafio do Módulo ${module.order}`}
                    </h3>
                    <p className="muted">
                      {item.completed
                        ? `Bairro ${module.order} completo! Sua próxima revisão já está agendada.`
                        : `Revisão rápida de ${module.title} — menos de 3 minutos.`}
                    </p>
                    {!item.completed && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        data-testid={`checkpoint-start-${item.checkpoint.id}`}
                        onClick={() => onOpenCheckpoint(item.checkpoint.id)}
                      >
                        Fazer desafio
                      </button>
                    )}
                    {!item.completed && nextModuleTitle && (
                      <p
                        className="checkpoint-gate-hint"
                        data-testid={`checkpoint-gate-${item.checkpoint.id}`}
                      >
                        Complete o Desafio do Módulo {module.order} para entrar no próximo bairro.
                      </p>
                    )}
                  </div>
                );
              })}
          </section>
        ))}
      </div>

      <div className="map-footer-actions">
        <button type="button" className="btn btn-secondary" data-testid="map-back" onClick={onBack}>
          Voltar ao início
        </button>
      </div>
    </section>
  );
}
