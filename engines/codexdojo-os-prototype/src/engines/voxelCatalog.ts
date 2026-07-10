export const voxelCatalog = [
  { id: 'game-02-warehouse', name: 'WAREHOUSE', developmentUrl: 'http://127.0.0.1:5202/' },
  { id: 'game-03-wormhole', name: 'WORMHOLE', developmentUrl: 'http://127.0.0.1:5203/' },
  { id: 'game-05-relay-station', name: 'RELAY STATION', developmentUrl: 'http://127.0.0.1:5205/' },
  { id: 'game-06-pipeline-plant', name: 'PIPELINE PLANT', developmentUrl: 'http://127.0.0.1:5206/' },
  { id: 'game-07-checkpoint-city', name: 'CHECKPOINT CITY', developmentUrl: 'http://127.0.0.1:5207/' },
  { id: 'game-08-timeline-tower', name: 'TIMELINE TOWER', developmentUrl: 'http://127.0.0.1:5208/' },
  { id: 'game-09-docking-bay', name: 'DOCKING BAY', developmentUrl: 'http://127.0.0.1:5209/' },
  { id: 'game-10-hash-ring', name: 'HASH RING', developmentUrl: 'http://127.0.0.1:5177/' },
  { id: 'game-11-air-traffic', name: 'AIR TRAFFIC', developmentUrl: 'http://127.0.0.1:5211/' },
  { id: 'game-12-mission-control', name: 'MISSION CONTROL', developmentUrl: 'http://127.0.0.1:5212/' },
  { id: 'game-13-breaker-grid', name: 'BREAKER GRID', developmentUrl: 'http://127.0.0.1:5213/' },
  { id: 'game-14-river-delta', name: 'RIVER DELTA', developmentUrl: 'http://127.0.0.1:5214/' },
  { id: 'game-15-observatory', name: 'OBSERVATORY', developmentUrl: 'http://127.0.0.1:5215/' },
  { id: 'game-16-freight-yard', name: 'FREIGHT YARD', developmentUrl: 'http://127.0.0.1:5216/' },
  { id: 'game-17-lighthouse-network', name: 'LIGHTHOUSE NETWORK', developmentUrl: 'http://127.0.0.1:5217/' },
  { id: 'game-18-stacks', name: 'STACKS', developmentUrl: 'http://127.0.0.1:5218/' },
] as const

export type VoxelGameId = (typeof voxelCatalog)[number]['id']
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
