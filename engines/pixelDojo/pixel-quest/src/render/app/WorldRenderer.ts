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
import type { PolicyGateEncounterState } from "../../game/encounters/policyGate"
import type { RouteHealthEncounterState } from "../../game/encounters/routeHealth"
import type { WorldState } from "../../game/simulation/types"
import { getTileViews, isUnitCompleted } from "../../game/simulation/world"
import { CircuitBreakerScene } from "./CircuitBreakerScene"
import { PolicyGateScene } from "./PolicyGateScene"
import { SkillOrbitScene } from "./SkillOrbitScene"

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
  private readonly skillOrbitScene = new SkillOrbitScene()
  private readonly circuitBreakerScene = new CircuitBreakerScene()
  private readonly authGateScene = new PolicyGateScene()
  private readonly npcMeshes = new Map<string, Mesh>()
  private readonly gateMeshes = new Map<string, Mesh>()
  private readonly staticMeshes: Mesh[] = []
  private activeRegionId: string

  // Shared geometry and materials to avoid allocating thousands of objects per region
  private readonly sharedTileGeometry = new PlaneGeometry(tileSize, tileSize)
  private readonly sharedTileMaterials: Record<string, MeshBasicMaterial> = {}

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
    this.activeRegionId = initialWorld.region.id
    this.scene.add(this.playerMesh)

    // Initialize shared materials
    for (const [kind, colorHex] of Object.entries(tileColors)) {
      this.sharedTileMaterials[kind] = new MeshBasicMaterial({ color: colorHex })
    }

    this.buildStaticWorld(initialWorld)
    this.sync(initialWorld)
  }

  sync(world: WorldState): void {
    if (world.mode === "skill-orbit") {
      this.skillOrbitScene.render(this.renderer, world)
      return
    }
    if (world.mode === "circuit-breaker") {
      this.circuitBreakerScene.render(this.renderer, world)
      return
    }
    if (world.mode === "auth-gate") {
      this.authGateScene.render(this.renderer, world)
      return
    }
    if (world.region.id !== this.activeRegionId) {
      this.rebuildWorld(world)
    }
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
    this.skillOrbitScene.dispose()
    this.circuitBreakerScene.dispose()
    this.authGateScene.dispose()
    this.renderer.dispose()
    this.sharedTileGeometry.dispose()
    for (const material of Object.values(this.sharedTileMaterials)) {
      material.dispose()
    }
  }

  // The circuit-breaker scene projects a route_health encounter state. The
  // encounter truth lives in PixelQuestApp.activeEncounter (kept out of the
  // pure WorldState per the AGENTS.md invariant); the app pushes it here via
  // this setter whenever it enters / mutates / closes the duel.
  setCircuitBreakerEncounter(state: RouteHealthEncounterState | undefined): void {
    this.circuitBreakerScene.setEncounter(state)
  }

  // The auth-gate scene projects a policy_gate encounter state. Same invariant
  // as the circuit-breaker setter: the encounter truth lives in
  // PixelQuestApp.activeEncounter (kept out of the pure WorldState per the
  // AGENTS.md invariant); the app pushes it here on enter / mutate / close.
  setAuthGateEncounter(state: PolicyGateEncounterState | undefined): void {
    this.authGateScene.setEncounter(state)
  }

  private buildStaticWorld(world: WorldState): void {
    for (const tile of getTileViews(world.region)) {
      const material = this.sharedTileMaterials[tile.kind]
      let mesh: Mesh
      if (material !== undefined) {
        mesh = new Mesh(this.sharedTileGeometry, material)
        // Mark as shared so we don't dispose the shared material in rebuildWorld
        mesh.userData.isSharedTile = true
      } else {
        mesh = new Mesh(
          this.sharedTileGeometry,
          new MeshBasicMaterial({ color: tileColors[tile.kind] }),
        )
      }

      mesh.position.set(
        tile.position.x - world.region.map.width / 2 + 0.5,
        -tile.position.y + world.region.map.height / 2 - 0.5,
        0,
      )
      this.scene.add(mesh)
      this.staticMeshes.push(mesh)
    }
    for (const gate of world.region.gates) {
      const mesh = makeGate(gate)
      placeMesh(mesh, gate.position.x, gate.position.y, 0.12, world)
      this.gateMeshes.set(gate.id, mesh)
      this.scene.add(mesh)
      this.staticMeshes.push(mesh)
    }
  }

  private rebuildWorld(world: WorldState): void {
    for (const mesh of this.staticMeshes) {
      this.scene.remove(mesh)
      if (!mesh.userData.isSharedTile) {
        // Fallback mesh using its own material
        disposeMaterial(mesh)
      }
    }
    this.staticMeshes.length = 0
    for (const mesh of this.npcMeshes.values()) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      disposeMaterial(mesh)
    }
    this.npcMeshes.clear()
    this.gateMeshes.clear()
    this.activeRegionId = world.region.id
    this.buildStaticWorld(world)
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

function disposeMaterial(mesh: Mesh): void {
  const material = mesh.material
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose()
    }
  } else {
    material.dispose()
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
