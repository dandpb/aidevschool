export type VoxelWorldVariant = "welcome" | "map" | "celebration";

const WORLD_LABELS: Record<VoxelWorldVariant, string> = {
  welcome: "Uma pequena escola voxel cercada por árvores, nuvens e caminhos",
  map: "Um mundo voxel com ilhas conectadas que representam a trilha de aprendizagem",
  celebration: "Uma ilha voxel em festa para celebrar uma lição concluída",
};

export function VoxelWorld({ variant = "welcome" }: { variant?: VoxelWorldVariant }) {
  return (
    <div
      className={`voxel-world voxel-world-${variant}`}
      role="img"
      aria-label={WORLD_LABELS[variant]}
    >
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
      <span className="voxel-spark voxel-spark-one" />
      <span className="voxel-spark voxel-spark-two" />
    </div>
  );
}
