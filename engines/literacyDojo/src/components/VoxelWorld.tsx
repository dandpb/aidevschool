export type VoxelWorldVariant = "welcome" | "map" | "celebration";

const WORLD_LABELS: Record<VoxelWorldVariant, string> = {
  welcome: "Vila Lume, uma pequena vila voxel com moradores, árvores e caminhos",
  map: "Mapa voxel da Vila Lume com bairros conectados pela trilha de aprendizagem",
  celebration: "Vila Lume iluminada para celebrar uma missão concluída",
};

export function VoxelWorld({ variant = "welcome" }: { variant?: VoxelWorldVariant }) {
  return (
    <div
      className={`voxel-world voxel-world-${variant}`}
      data-testid="vila-lume-scene"
      role="img"
      aria-label={WORLD_LABELS[variant]}
    >
      <span className="voxel-village-sign">VILA LUME</span>
      <span className="voxel-cloud voxel-cloud-one" />
      <span className="voxel-cloud voxel-cloud-two" />
      <span className="voxel-sun" />
      <span className="voxel-island voxel-island-back" />
      <span className="voxel-island voxel-island-main" />
      <span className="voxel-path" />
      <span className="voxel-school">
        <span className="voxel-school-roof" />
        <span className="voxel-school-door" />
        <span className="voxel-school-window" />
      </span>
      <span className="voxel-cottage">
        <span className="voxel-cottage-roof" />
        <span className="voxel-cottage-door" />
      </span>
      <span className="voxel-library">
        <span className="voxel-library-roof" />
        <span className="voxel-library-door" />
      </span>
      <span className="voxel-tree voxel-tree-one">
        <span />
      </span>
      <span className="voxel-tree voxel-tree-two">
        <span />
      </span>
      <span className="voxel-guide" aria-hidden="true">
        <span className="voxel-guide-antenna" />
        <span className="voxel-guide-head">
          <span className="voxel-guide-eyes" />
        </span>
        <span className="voxel-guide-body" />
      </span>
      <span className="voxel-resident voxel-resident-one">
        <span className="voxel-resident-head" />
        <span className="voxel-resident-body" />
      </span>
      <span className="voxel-resident voxel-resident-two">
        <span className="voxel-resident-head" />
        <span className="voxel-resident-body" />
      </span>
      <span className="voxel-resident voxel-resident-three">
        <span className="voxel-resident-head" />
        <span className="voxel-resident-body" />
      </span>
      <span className="voxel-spark voxel-spark-one" />
      <span className="voxel-spark voxel-spark-two" />
    </div>
  );
}
