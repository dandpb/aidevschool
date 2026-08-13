import { describe, expect, it } from 'vitest'
import { parseVoxelUrlMap, voxelCatalog } from './voxelCatalog'

describe('voxelDojo OS catalog', () => {
  it('covers every implemented voxelDojo game exactly once', () => {
    expect(voxelCatalog.map((game) => game.id)).toEqual([
      'game-02-warehouse',
      'game-03-wormhole',
      'game-05-relay-station',
      'game-06-pipeline-plant',
      'game-07-checkpoint-city',
      'game-08-timeline-tower',
      'game-09-docking-bay',
      'game-10-hash-ring',
      'game-11-air-traffic',
      'game-12-mission-control',
      'game-13-breaker-grid',
      'game-14-river-delta',
      'game-15-observatory',
      'game-16-freight-yard',
      'game-17-lighthouse-network',
      'game-18-stacks',
    ])
    expect(new Set(voxelCatalog.map((game) => game.developmentUrl)).size).toBe(16)
  })

  it('accepts only string URLs for known games', () => {
    expect(parseVoxelUrlMap(JSON.stringify({
      'game-02-warehouse': 'https://voxel.example/warehouse/',
      'unknown-game': 'https://attacker.example/',
      'game-03-wormhole': 42,
    }))).toEqual({ 'game-02-warehouse': 'https://voxel.example/warehouse/' })
    expect(parseVoxelUrlMap('not-json')).toEqual({})
  })
})
