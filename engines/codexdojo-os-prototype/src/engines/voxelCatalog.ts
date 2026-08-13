import catalog from '../../../voxelDojo/catalog.json' with { type: 'json' }

export type VoxelGameId = `game-${number}-${string}`

function isVoxelGameId(value: string): value is VoxelGameId {
  return /^game-\d{2}-[a-z0-9-]+$/.test(value)
}

export const voxelCatalog = catalog.map((game) => {
  if (!isVoxelGameId(game.id)) throw new Error(`Invalid voxelDojo game ID: ${game.id}`)
  return {
    id: game.id,
    name: game.name,
    developmentUrl: `http://127.0.0.1:${game.developmentPort}/`,
  }
})

export type VoxelUrlMap = Readonly<Partial<Record<VoxelGameId, string>>>

export function parseVoxelUrlMap(serialized: string | undefined): VoxelUrlMap {
  if (serialized === undefined || serialized.trim() === '') return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

  const knownIds = new Set<string>(voxelCatalog.map((game) => game.id))
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [VoxelGameId, string] => knownIds.has(entry[0]) && typeof entry[1] === 'string',
    ),
  )
}
