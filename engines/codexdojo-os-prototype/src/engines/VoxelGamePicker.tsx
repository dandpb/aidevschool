import { voxelCatalog, type VoxelGameId } from './voxelCatalog'

export type VoxelGamePickerProps = {
  readonly selectedId: VoxelGameId
  readonly onSelect: (gameId: VoxelGameId) => void
}

export function VoxelGamePicker({ selectedId, onSelect }: VoxelGamePickerProps) {
  return (
    <label className="voxel-game-picker">
      <span>Experiência voxelDojo</span>
      <select
        aria-label="Experiência voxelDojo"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value as VoxelGameId)}
      >
        {voxelCatalog.map((game) => (
          <option key={game.id} value={game.id}>{game.name}</option>
        ))}
      </select>
    </label>
  )
}
