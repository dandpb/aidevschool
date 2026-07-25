import type { OnboardingTaskCategory } from "../domain/progress";

const TASK_DETAILS: Record<OnboardingTaskCategory, { label: string; guidance: string }> = {
  scheduling: {
    label: "organizar um agendamento",
    guidance: "Transforme compromissos e prioridades em um rascunho de agenda.",
  },
  communication: {
    label: "preparar uma mensagem",
    guidance: "Crie um rascunho de mensagem e revise o que vai enviar.",
  },
  news_research: {
    label: "pesquisar uma notícia",
    guidance: "Estruture perguntas e confira fontes antes de compartilhar.",
  },
};

export function taskDetails(category: OnboardingTaskCategory) {
  return TASK_DETAILS[category];
}

export function VoxelTaskArt({ category }: { category: OnboardingTaskCategory }) {
  return (
    <span
      className={`voxel-task voxel-task-${category}`}
      aria-label={`Ilustração de ${taskDetails(category).label}`}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
