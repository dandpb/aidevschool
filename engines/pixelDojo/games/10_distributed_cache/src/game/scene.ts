// 3D projection of the consistent-hash ring. Read-only with respect to game
// state: every visual is derived from SceneState (a snapshot of the HashRing +
// locked keys + the active step). The scene never mutates the ring, metrics, or
// wave — it only renders.
//
// Mapping (concept -> visual), per docs/plans/10_distributed_cache.md:
//   - hash ring = a luminous torus floating at arena center, marked with M
//     tick flares (M = RING_SIZE = 64).
//   - vnode = a crystal shard tower standing on the ring at its hash position;
//     towers are color-coded by their owning node so the player sees the
//     unequal arcs of a real consistent-hash ring (not a neat round-robin).
//   - key orb = a glowing sphere that sits on the ring at the key's hash tick
//     and is colored by its current owner. Hot keys pulse orange.
//   - incoming orb = the next key to be released, hovering above its hash
//     tick with a "ready" glow.
//   - add-node-required = ghost towers at the proposed vnode positions.
//   - remove-node-required = the doomed node's towers pulse red.

import {
  AmbientLight,
  type CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  CanvasTexture as ThreeCanvasTexture,
  TorusGeometry,
  WebGLRenderer,
} from "three"
import { type NodeId, RING_SIZE } from "./ring"

export type TowerView = {
  readonly nodeId: NodeId
  readonly pos: number
}

export type OrbView = {
  readonly id: number
  readonly key: string
  readonly hashPos: number
  readonly isHot: boolean
  readonly owner: NodeId | null
}

export type IncomingOrbView = {
  readonly key: string
  readonly hashPos: number
  readonly isHot: boolean
} | null

export type PendingAddView = {
  readonly nodeId: NodeId
  readonly vnodes: readonly number[]
} | null

export type PendingRemoveView = {
  readonly nodeId: NodeId
} | null

export type SceneState = {
  readonly towers: readonly TowerView[]
  readonly orbs: readonly OrbView[]
  readonly incoming: IncomingOrbView
  readonly pendingAdd: PendingAddView
  readonly pendingRemove: PendingRemoveView
  readonly strategy: "ring" | "modn"
  readonly finished: boolean
}

const RING_RADIUS = 5
const RING_TUBE = 0.08

// Stable color per node id — hashed so the same id always gets the same color.
const NODE_COLORS: ReadonlyArray<string> = [
  "#7ac46b",
  "#9ee0ff",
  "#f6dd88",
  "#c44b3a",
  "#b88bff",
  "#ff9a3c",
  "#3cc4c4",
  "#f06292",
]

export function nodeColor(id: NodeId): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return NODE_COLORS[h % NODE_COLORS.length] ?? "#ffffff"
}

export class RingKeeperScene {
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly ambient = new AmbientLight("#9ee0ff", 0.55)
  private readonly keyLight = new DirectionalLight("#f6dd88", 2.0)
  private readonly fillLight = new DirectionalLight("#67c2ff", 1.0)
  private readonly ringGroup = new Group()
  private readonly towersGroup = new Group()
  private readonly orbsGroup = new Group()
  private readonly ghostGroup = new Group()
  private readonly ringGeometry = new TorusGeometry(RING_RADIUS, RING_TUBE, 16, 128)
  private readonly tickGeometry = new TorusGeometry(0.12, 0.025, 8, 16)
  private readonly towerGeometry = new MeshStandardMaterial({
    color: "#7ac46b",
    emissive: "#1a3a18",
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.4,
  })
  private readonly orbGeometry = new SphereGeometry(0.18, 18, 14)
  private readonly towerMeshes = new Map<string, Mesh>() // key `${nodeId}:${pos}`
  private readonly towerLabels = new Map<string, Sprite>()
  private readonly orbMeshes = new Map<number, Mesh>()
  private readonly orbLabels = new Map<number, Sprite>()
  private readonly ghostMeshes: Mesh[] = []
  private readonly textureCache = new Map<string, CanvasTexture>()
  private readonly tickMeshes: Mesh[] = []
  private currentGhostKey: string | null = null

  constructor(private readonly container: HTMLElement) {
    const width = Math.max(container.clientWidth, 320)
    const height = Math.max(container.clientHeight, 240)
    this.camera = new PerspectiveCamera(50, width / height, 0.1, 100)
    this.camera.position.set(0, 8.0, 10.5)
    this.camera.lookAt(0, 0.4, 0)

    this.renderer = new WebGLRenderer({ antialias: true })
    this.scene.background = new Color("#070a12")
    this.scene.add(this.ambient, this.keyLight, this.fillLight)
    this.keyLight.position.set(4, 8, 5)
    this.fillLight.position.set(-5, 4, -3)
    this.scene.add(this.ringGroup, this.towersGroup, this.orbsGroup, this.ghostGroup)
    this.buildFloor()
    this.buildRing()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
  }

  sync(state: SceneState, nowMs: number): void {
    this.syncTowers(state.towers, state.pendingRemove)
    this.syncOrbs(state.orbs, nowMs)
    // Incoming orb and pending-add ghost share the ghost group — they're
    // mutually exclusive (a step is either a release-orb with an incoming
    // orb, or an add-node-required with ghosts). Resolve both through one
    // focus key so they don't fight over the group.
    this.syncFocus(state.incoming, state.pendingAdd, nowMs)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose(): void {
    for (const [, mesh] of this.towerMeshes) {
      mesh.geometry.dispose()
      this.towersGroup.remove(mesh)
    }
    for (const [, label] of this.towerLabels) disposeSprite(label)
    for (const [, mesh] of this.orbMeshes) {
      mesh.geometry.dispose()
      this.orbsGroup.remove(mesh)
    }
    for (const [, label] of this.orbLabels) disposeSprite(label)
    for (const mesh of this.ghostMeshes) {
      mesh.geometry.dispose()
      this.ghostGroup.remove(mesh)
    }
    for (const tick of this.tickMeshes) {
      tick.geometry.dispose()
      this.ringGroup.remove(tick)
    }
    this.towerGeometry.dispose()
    this.ringGeometry.dispose()
    this.tickGeometry.dispose()
    this.orbGeometry.dispose()
    for (const [, texture] of this.textureCache) texture.dispose()
    this.towerMeshes.clear()
    this.towerLabels.clear()
    this.orbMeshes.clear()
    this.orbLabels.clear()
    this.ghostMeshes.length = 0
    this.tickMeshes.length = 0
    this.textureCache.clear()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  private buildFloor(): void {
    const floorGeometry = new TorusGeometry(RING_RADIUS * 1.8, RING_RADIUS * 1.4, 8, 64)
    const floorMaterial = new MeshStandardMaterial({
      color: "#0a0f18",
      emissive: "#04060a",
      emissiveIntensity: 0.2,
      roughness: 0.9,
      metalness: 0.1,
    })
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = Math.PI / 2
    floor.position.y = -0.4
    this.scene.add(floor)
  }

  private buildRing(): void {
    // Luminous torus tilted so the player sees the full ring.
    const ringMat = new MeshBasicMaterial({ color: "#2a4a6a", transparent: true, opacity: 0.55 })
    const ring = new Mesh(this.ringGeometry, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0
    this.ringGroup.add(ring)
    // Tick flares — one per ring slot, dim by default.
    for (let pos = 0; pos < RING_SIZE; pos += 1) {
      const tickMat = new MeshBasicMaterial({ color: "#1c2a40", transparent: true, opacity: 0.6 })
      const tick = new Mesh(this.tickGeometry, tickMat)
      const { x, z } = ringPosition(pos)
      tick.position.set(x, 0, z)
      tick.rotation.x = Math.PI / 2
      this.ringGroup.add(tick)
      this.tickMeshes.push(tick)
    }
  }

  private syncTowers(towers: readonly TowerView[], pendingRemove: PendingRemoveView): void {
    const seen = new Set<string>()
    for (const t of towers) {
      const key = `${t.nodeId}:${t.pos}`
      seen.add(key)
      const { x, z } = ringPosition(t.pos)
      let mesh = this.towerMeshes.get(key)
      if (mesh === undefined) {
        const geom = new MeshStandardMaterial({
          color: nodeColor(t.nodeId),
          emissive: nodeColor(t.nodeId),
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.4,
        })
        mesh = new Mesh(new TorusGeometry(0.32, 0.1, 8, 24), geom)
        mesh.rotation.x = Math.PI / 2
        mesh.position.set(x, 0, z)
        this.towersGroup.add(mesh)
        this.towerMeshes.set(key, mesh)
        const label = this.makeLabel(t.nodeId, "#ffffff")
        label.position.set(x, 1.0, z)
        label.scale.set(1.4, 0.42, 1)
        this.towersGroup.add(label)
        this.towerLabels.set(key, label)
      }
      // Pulse the doomed node's towers red.
      const isDoomed = pendingRemove !== null && pendingRemove.nodeId === t.nodeId
      const mat = mesh.material as MeshStandardMaterial
      if (isDoomed) {
        mat.color.set("#c44b3a")
        mat.emissive.set("#c44b3a")
        mat.emissiveIntensity = 0.7 + 0.3 * Math.sin(performance.now() / 120)
      } else {
        mat.color.set(nodeColor(t.nodeId))
        mat.emissive.set(nodeColor(t.nodeId))
        mat.emissiveIntensity = 0.4
      }
    }
    for (const [key, mesh] of this.towerMeshes) {
      if (seen.has(key)) continue
      mesh.geometry.dispose()
      this.towersGroup.remove(mesh)
      this.towerMeshes.delete(key)
      const label = this.towerLabels.get(key)
      if (label !== undefined) {
        disposeSprite(label)
        this.towersGroup.remove(label)
        this.towerLabels.delete(key)
      }
    }
  }

  private syncOrbs(orbs: readonly OrbView[], nowMs: number): void {
    const seen = new Set<number>()
    for (const orb of orbs) {
      seen.add(orb.id)
      const { x, z } = ringPosition(orb.hashPos)
      const y = 0.55 + (orb.isHot ? 0.15 : 0)
      let mesh = this.orbMeshes.get(orb.id)
      let label = this.orbLabels.get(orb.id)
      if (mesh === undefined) {
        const color = orb.isHot ? "#ff9a3c" : ownerColor(orb.owner)
        const mat = new MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.3,
        })
        mesh = new Mesh(this.orbGeometry, mat)
        mesh.position.set(x, y, z)
        this.orbsGroup.add(mesh)
        this.orbMeshes.set(orb.id, mesh)
        label = this.makeLabel(orb.key, orb.isHot ? "#ff9a3c" : "#ffffff")
        label.position.set(x, y + 0.45, z)
        label.scale.set(0.9, 0.32, 1)
        this.orbsGroup.add(label)
        this.orbLabels.set(orb.id, label)
      }
      // Hot keys pulse.
      const mat = mesh.material as MeshStandardMaterial
      if (orb.isHot) {
        const pulse = 0.7 + 0.3 * Math.sin(nowMs / 140)
        mat.emissiveIntensity = pulse
        const scale = 1 + 0.1 * Math.sin(nowMs / 140)
        mesh.scale.setScalar(scale)
      }
    }
    for (const [id, mesh] of this.orbMeshes) {
      if (seen.has(id)) continue
      mesh.geometry.dispose()
      this.orbsGroup.remove(mesh)
      this.orbMeshes.delete(id)
      const label = this.orbLabels.get(id)
      if (label !== undefined) {
        disposeSprite(label)
        this.orbsGroup.remove(label)
        this.orbLabels.delete(id)
      }
    }
  }

  private syncFocus(incoming: IncomingOrbView, pendingAdd: PendingAddView, nowMs: number): void {
    const focusKey =
      pendingAdd !== null
        ? `add:${pendingAdd.nodeId}`
        : incoming !== null
          ? `incoming:${incoming.key}:${incoming.hashPos}`
          : "__none__"
    if (focusKey === this.currentGhostKey) {
      // Animate pulse on existing ghosts.
      const pulse = 0.5 + 0.4 * Math.sin(nowMs / 160)
      for (const m of this.ghostMeshes) {
        ;(m.material as MeshBasicMaterial).opacity = pulse
      }
      return
    }
    this.clearGhosts()
    this.currentGhostKey = focusKey
    if (pendingAdd !== null) {
      for (const vpos of pendingAdd.vnodes) {
        const { x, z } = ringPosition(vpos)
        const mat = new MeshBasicMaterial({
          color: "#7ac46b",
          transparent: true,
          opacity: 0.5,
        })
        const mesh = new Mesh(new TorusGeometry(0.32, 0.08, 8, 24), mat)
        mesh.rotation.x = Math.PI / 2
        mesh.position.set(x, 0.15, z)
        this.ghostGroup.add(mesh)
        this.ghostMeshes.push(mesh)
      }
      return
    }
    if (incoming !== null) {
      const { x, z } = ringPosition(incoming.hashPos)
      const color = incoming.isHot ? "#ff9a3c" : "#f6dd88"
      const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      const mesh = new Mesh(new TorusGeometry(0.35, 0.06, 8, 24), mat)
      mesh.rotation.x = Math.PI / 2
      mesh.position.set(x, 0.3, z)
      this.ghostGroup.add(mesh)
      this.ghostMeshes.push(mesh)
    }
  }

  private clearGhosts(): void {
    for (const m of this.ghostMeshes) {
      m.geometry.dispose()
      ;(m.material as Material).dispose()
      this.ghostGroup.remove(m)
    }
    this.ghostMeshes.length = 0
    this.currentGhostKey = null
  }

  private makeLabel(text: string, color: string): Sprite {
    const cached = this.textureCache.get(`${text}:${color}`)
    if (cached !== undefined) {
      const material = new SpriteMaterial({ map: cached, depthTest: false })
      const sprite = new Sprite(material)
      sprite.userData["sharedTexture"] = true
      return sprite
    }
    const texture = makeTextTexture(text, color)
    this.textureCache.set(`${text}:${color}`, texture)
    const material = new SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new Sprite(material)
    sprite.userData["sharedTexture"] = true
    return sprite
  }
}

function ownerColor(owner: NodeId | null): string {
  if (owner === null) return "#888888"
  return nodeColor(owner)
}

function ringPosition(pos: number): { x: number; z: number } {
  const angle = (pos / RING_SIZE) * Math.PI * 2
  return { x: Math.cos(angle) * RING_RADIUS, z: Math.sin(angle) * RING_RADIUS }
}

function makeTextTexture(text: string, color: string): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx !== null) {
    ctx.fillStyle = "rgba(8, 11, 18, 0.85)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = color
    ctx.font = "bold 28px 'Courier New', monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new ThreeCanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function disposeSprite(sprite: Sprite): void {
  const material = sprite.material as SpriteMaterial
  if (sprite.userData["sharedTexture"] !== true) {
    const map = material.map
    if (map !== null) map.dispose()
  }
  material.dispose()
}
