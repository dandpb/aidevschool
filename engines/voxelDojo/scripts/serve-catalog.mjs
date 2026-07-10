import process from "node:process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { dirname, resolve } from "node:path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const catalog = JSON.parse(readFileSync(resolve(root, "catalog.json"), "utf8"))
if (!Array.isArray(catalog)) throw new Error("voxelDojo catalog must be an array")
const games = catalog.map((game) => {
  if (
    typeof game !== "object" || game === null
    || typeof game.id !== "string"
    || typeof game.developmentPort !== "number"
  ) {
    throw new Error("voxelDojo catalog contains an invalid game")
  }
  return game
})

process.env.VITE_CODEXDOJO_OS_ORIGIN ??= "http://127.0.0.1:4174"
const servers = []

try {
  for (const { id, developmentPort } of games) {
    const server = await createServer({
      root: resolve(root, id),
      server: { host: "127.0.0.1", port: developmentPort, strictPort: true },
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
