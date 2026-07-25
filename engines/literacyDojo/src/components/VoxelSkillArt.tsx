import { useServices } from "../app/services";
import type { SkillId } from "../data/generated/lessons";

type Cube = { left: number; top: number; tone: "solid" | "light" | "accent" | "faded" };

/**
 * Cena voxel por habilidade: uma metáfora visual curta que ajuda a explicar o
 * que a lição treina, antes de qualquer texto longo. É copy de UI sobre a
 * habilidade (nível trilha), não conteúdo de lição — conteúdo vem do read model.
 */
const SKILL_SCENES: Record<SkillId, { cubes: Cube[]; caption: string }> = {
  entender: {
    cubes: [
      { left: 4, top: 40, tone: "solid" },
      { left: 34, top: 22, tone: "light" },
      { left: 64, top: 44, tone: "accent" },
    ],
    caption: "A IA entrega blocos prontos. Quem decide onde cada um encaixa é você.",
  },
  pedir: {
    cubes: [
      { left: 8, top: 56, tone: "solid" },
      { left: 8, top: 32, tone: "solid" },
      { left: 8, top: 8, tone: "accent" },
      { left: 44, top: 56, tone: "faded" },
    ],
    caption: "Cada bloco é uma parte do pedido: objetivo, contexto, público, formato.",
  },
  avaliar: {
    cubes: [
      { left: 4, top: 44, tone: "solid" },
      { left: 32, top: 44, tone: "accent" },
      { left: 60, top: 44, tone: "solid" },
      { left: 32, top: 16, tone: "faded" },
    ],
    caption: "Um bloco solto parece igual aos outros — a checagem é o que revela.",
  },
  proteger: {
    cubes: [
      { left: 4, top: 20, tone: "solid" },
      { left: 4, top: 46, tone: "solid" },
      { left: 40, top: 33, tone: "light" },
      { left: 72, top: 33, tone: "accent" },
    ],
    caption: "Alguns blocos ficam do lado de fora: dados que não entram no pedido.",
  },
  aplicar: {
    cubes: [
      { left: 6, top: 52, tone: "solid" },
      { left: 30, top: 52, tone: "solid" },
      { left: 18, top: 28, tone: "light" },
      { left: 54, top: 30, tone: "accent" },
    ],
    caption: "Blocos praticados viram uma tarefa real concluída.",
  },
  decidir: {
    cubes: [
      { left: 4, top: 10, tone: "solid" },
      { left: 4, top: 40, tone: "faded" },
      { left: 38, top: 25, tone: "accent" },
      { left: 64, top: 10, tone: "solid" },
      { left: 64, top: 40, tone: "light" },
    ],
    caption: "Dois caminhos de blocos — um com fundação sólida, outro instável. A decisão é sua.",
  },
  integrar: {
    cubes: [
      { left: 4, top: 46, tone: "solid" },
      { left: 28, top: 46, tone: "solid" },
      { left: 16, top: 22, tone: "accent" },
      { left: 52, top: 28, tone: "light" },
      { left: 52, top: 52, tone: "solid" },
    ],
    caption: "Blocos de dois sistemas diferentes conectados por uma peça central.",
  },
  codificar: {
    cubes: [
      { left: 4, top: 46, tone: "solid" },
      { left: 28, top: 46, tone: "solid" },
      { left: 52, top: 46, tone: "solid" },
      { left: 28, top: 22, tone: "accent" },
    ],
    caption: "Blocos empilhados com a peça laranja destacada: o código que você revisou e aprovou.",
  },
};

export function VoxelSkillArt({ skillId }: { skillId: SkillId }) {
  const title = useServices().content.getSkillTitle(skillId);
  const scene = SKILL_SCENES[skillId];
  return (
    <figure className="voxel-figure" data-testid={`voxel-skill-${skillId}`}>
      <span className="voxel-scene voxel-scene-skill" aria-hidden="true">
        {scene.cubes.map((cube) => (
          <span
            key={`${cube.left}-${cube.top}`}
            className={`voxel voxel-${cube.tone}`}
            style={{ left: cube.left, top: cube.top }}
          />
        ))}
      </span>
      <figcaption>
        <strong>{title}:</strong> {scene.caption}
      </figcaption>
    </figure>
  );
}
