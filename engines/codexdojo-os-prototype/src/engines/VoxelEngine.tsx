import { useState } from 'react'
import { EmbeddedEngine } from './EmbeddedEngine'
import { VoxelGamePicker } from './VoxelGamePicker'
import { voxelCatalog, type VoxelGameId, type VoxelUrlMap } from './voxelCatalog'

const defaultGameId: VoxelGameId = 'game-10-hash-ring'

export type VoxelEngineProps = {
  readonly configuredUrls: VoxelUrlMap
  readonly compatibilityUrl: string | undefined
  readonly development: boolean
  readonly focused: boolean
  readonly onToggleFocus: () => void
}

export function VoxelEngine({
  configuredUrls,
  compatibilityUrl,
  development,
  focused,
  onToggleFocus,
}: VoxelEngineProps) {
  const [gameId, setGameId] = useState<VoxelGameId>(defaultGameId)
  const game = voxelCatalog.find((candidate) => candidate.id === gameId)
  if (game === undefined) throw new Error(`voxelDojo catalog is missing ${gameId}`)

  return (
    <>
      <VoxelGamePicker selectedId={gameId} onSelect={setGameId} />
      <EmbeddedEngine
        key={gameId}
        engineName={`voxelDojo · ${game.name}`}
        configuredUrl={configuredUrls[gameId] ?? (gameId === defaultGameId ? compatibilityUrl : undefined)}
        developmentUrl={game.developmentUrl}
        development={development}
        focused={focused}
        onToggleFocus={onToggleFocus}
        evidenceSource="voxeldojo"
      />
    </>
  )
}
