import process from "node:process"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { dirname, resolve } from "node:path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const games = [
  ["game-02-warehouse", 5202],
  ["game-03-wormhole", 5203],
  ["game-05-relay-station", 5205],
  ["game-06-pipeline-plant", 5206],
  ["game-07-checkpoint-city", 5207],
  ["game-08-timeline-tower", 5208],
  ["game-09-docking-bay", 5209],
  ["game-10-hash-ring", 5177],
  ["game-11-air-traffic", 5211],
  ["game-12-mission-control", 5212],
  ["game-13-breaker-grid", 5213],
  ["game-14-river-delta", 5214],
  ["game-15-observatory", 5215],
  ["game-16-freight-yard", 5216],
  ["game-17-lighthouse-network", 5217],
  ["game-18-stacks", 5218],
]

process.env.VITE_CODEXDOJO_OS_ORIGIN ??= "http://127.0.0.1:4174"
const servers = []

try {
  for (const [game, port] of games) {
    const server = await createServer({
      root: resolve(root, game),
      server: { host: "127.0.0.1", port, strictPort: true },
    })
    await server.listen()
    servers.push(server)
  }
  console.log(`voxelDojo catalog ready: ${games.length} games`)
} catch (error) {
  await Promise.all(servers.map((server) => server.close()))
  throw error
}

const close = async () => {
  await Promise.all(servers.map((server) => server.close()))
  process.exit(0)
}

process.once("SIGINT", close)
process.once("SIGTERM", close)
