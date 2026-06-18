import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "three"
import type { RegionGate, RegionNpc, TileKind } from "../../content/types"
import type { WorldState } from "../../game/simulation/types"
import { getTileViews, isUnitCompleted } from "../../game/simulation/world"

const internalWidth = 320
const internalHeight = 240
const tileSize = 1

const tileColors: Readonly<Record<TileKind, string>> = {
  floor: "#25384f",
  wall: "#101626",
  lab: "#314860",
  gate: "#6b4f1d",
  terminal: "#3a6c72",
  water: "#18345b",
}

export class WorldRenderer {
  private readonly renderer: WebGLRenderer
  private readonly scene: Scene
  private readonly camera: OrthographicCamera
  private readonly playerMesh: Mesh
  private readonly npcMeshes = new Map<string, Mesh>()
  private readonly gateMeshes = new Map<string, Mesh>()

  constructor(host: HTMLElement, initialWorld: WorldState) {
    this.renderer = new WebGLRenderer({ antialias: false, alpha: false })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(internalWidth, internalHeight, false)
    this.renderer.domElement.className = "game-canvas"
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.setAttribute("aria-label", "PixelDojo Quest WebGL playfield")
    this.renderer.domElement.addEventListener("pointerdown", () => this.renderer.domElement.focus())
    host.append(this.renderer.domElement)

    this.scene = new Scene()
    this.scene.background = new Color("#080b12")
    this.camera = createCamera(initialWorld.region.map.width, initialWorld.region.map.height)
    this.playerMesh = makeSprite("#f0d56b", "#3a2f0a", 0.34)
    this.scene.add(this.playerMesh)
    this.buildStaticWorld(initialWorld)
    this.sync(initialWorld)
  }

  sync(world: WorldState): void {
    placeMesh(this.playerMesh, world.player.position.x, world.player.position.y, 0.24, world)
    for (const npc of world.region.npcs) {
      const mesh = this.getNpcMesh(npc)
      placeMesh(mesh, npc.position.x, npc.position.y, 0.22, world)
    }
    for (const gate of world.region.gates) {
      const mesh = this.gateMeshes.get(gate.id)
      if (mesh === undefined) {
        continue
      }
      const material = mesh.material
      if (material instanceof MeshBasicMaterial) {
        material.color.set(isUnitCompleted(world, gate.requiresUnitId) ? "#7ac46b" : "#b56b2a")
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer.dispose()
  }

  private buildStaticWorld(world: WorldState): void {
    const tileGeometry = new PlaneGeometry(tileSize, tileSize)
    for (const tile of getTileViews(world.region)) {
      const mesh = new Mesh(tileGeometry, new MeshBasicMaterial({ color: tileColors[tile.kind] }))
      mesh.position.set(
        tile.position.x - world.region.map.width / 2 + 0.5,
        -tile.position.y + world.region.map.height / 2 - 0.5,
        0,
      )
      this.scene.add(mesh)
    }
    for (const gate of world.region.gates) {
      const mesh = makeGate(gate)
      placeMesh(mesh, gate.position.x, gate.position.y, 0.12, world)
      this.gateMeshes.set(gate.id, mesh)
      this.scene.add(mesh)
    }
  }

  private getNpcMesh(npc: RegionNpc): Mesh {
    const existing = this.npcMeshes.get(npc.id)
    if (existing !== undefined) {
      return existing
    }
    const mesh = makeSprite("#67c2ff", "#112f45", 0.3)
    this.npcMeshes.set(npc.id, mesh)
    this.scene.add(mesh)
    return mesh
  }
}

function createCamera(mapWidth: number, mapHeight: number): OrthographicCamera {
  const aspect = internalWidth / internalHeight
  const visibleHeight = Math.max(mapHeight, 11)
  const visibleWidth = Math.max(mapWidth, visibleHeight * aspect)
  const camera = new OrthographicCamera(
    -visibleWidth / 2,
    visibleWidth / 2,
    visibleHeight / 2,
    -visibleHeight / 2,
    0.1,
    100,
  )
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  return camera
}

function makeSprite(fill: string, outline: string, size: number): Mesh {
  const geometry = new BoxGeometry(size, size, 0.08)
  const material = new MeshBasicMaterial({ color: fill })
  const mesh = new Mesh(geometry, material)
  const outlineMesh = new Mesh(
    new BoxGeometry(size + 0.12, size + 0.12, 0.04),
    new MeshBasicMaterial({ color: outline }),
  )
  outlineMesh.position.z = -0.04
  mesh.add(outlineMesh)
  return mesh
}

function makeGate(gate: RegionGate): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(0.78, 0.78, 0.06),
    new MeshBasicMaterial({ color: "#b56b2a" }),
  )
  mesh.name = gate.id
  return mesh
}

function placeMesh(mesh: Mesh, x: number, y: number, z: number, world: WorldState): void {
  mesh.position.set(x - world.region.map.width / 2 + 0.5, -y + world.region.map.height / 2 - 0.5, z)
}
