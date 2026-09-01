import { voxelCatalog, type VoxelGameId } from './voxelCatalog'

export type VoxelGamePickerProps = {
  readonly selectedId: VoxelGameId
  readonly onSelect: (gameId: VoxelGameId) => void
}

export function VoxelGamePicker({ selectedId, onSelect }: VoxelGamePickerProps) {
  return (
    <div className="voxel-game-picker">
      <label>
        <span>Simulação voxelDojo</span>
        <select
          aria-label="Experiência voxelDojo"
          value={selectedId}
          onChange={(event) => {
            const selected = voxelCatalog.find((game) => game.id === event.target.value)
            if (selected !== undefined) onSelect(selected.id)
          }}
        >
          {voxelCatalog.map((game) => (
            <option key={game.id} value={game.id}>{game.name}</option>
          ))}
        </select>
      </label>
      <p className="voxel-game-picker-note">
        Simulação · evidência bruta, não verificada. Não é um projeto do catálogo 01–18 nem domínio.
      </p>
    </div>
  )
}
