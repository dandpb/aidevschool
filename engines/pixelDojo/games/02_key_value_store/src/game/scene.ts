// 3D projection of the KV Warehouse. Read-only with respect to game state:
// every visual is derived from SceneState (a snapshot of the KvStore + the
// player's target shelf + the conveyor payload). The scene never mutates the
// store, metrics, or wave — it only renders.
//
// Mapping (concept -> visual), per docs/plans/02_key_value_store.md:
//   - hash bucket = numbered pedestal around the ring.
//   - SET crate   = amber box stacked on the pedestal; chain depth visible.
//   - TTL         = torus-style ring around the crate; drains (scale + color)
//                   as the TTL clock empties; dark crate when expired (still
//                   occupies the slot — lazy TTL made visible).
//   - Conveyor    = center cylinder; renders the current op's payload (crate
//                   for SET, beacon for GET/DEL/EXPIRE/PERSIST).
//   - Forklift    = pivot at the center; rotates to face targetShelf.

import {
  AmbientLight,
  BoxGeometry,
  type CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  CanvasTexture as ThreeCanvasTexture,
  WebGLRenderer,
} from "three"
import type { KvCrateView } from "./kvstore"

export type ConveyorPayload =
  | { readonly kind: "SET"; readonly key: string; readonly value: string }
  | { readonly kind: "GET"; readonly key: string }
  | { readonly kind: "DEL"; readonly key: string }
  | { readonly kind: "EXPIRE"; readonly key: string }
  | { readonly kind: "PERSIST"; readonly key: string }
  | { readonly kind: "EMPTY" }

export type SceneState = {
  readonly bucketCount: number
  readonly targetShelf: number
  readonly crates: readonly KvCrateView[]
  readonly conveyor: ConveyorPayload
  readonly finished: boolean
}

const RING_RADIUS = 5
const PEDESTAL_HEIGHT = 0.6
const CRATE_SIZE = 0.9
const CRATE_HEIGHT = 0.7

export class KvWarehouseScene {
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly ambient = new AmbientLight("#9ee0ff", 0.55)
  private readonly keyLight = new DirectionalLight("#f6dd88", 2.2)
  private readonly fillLight = new DirectionalLight("#67c2ff", 1.1)
  private readonly ring = new Group()
  private readonly conveyorGroup = new Group()
  private readonly forkliftGroup = new Group()
  private readonly pedestalMeshes: Mesh[] = []
  private readonly pedestalMaterials: MeshStandardMaterial[] = []
  private readonly labelSprites: Sprite[] = []
  private readonly crateGeometry = new BoxGeometry(CRATE_SIZE, CRATE_HEIGHT, CRATE_SIZE)
  private readonly ringGeometry = new CylinderGeometry(0.95, 0.95, 0.06, 24, 1, true)
  private readonly conveyorGeometry = new CylinderGeometry(0.9, 1.1, 0.4, 24)
  private readonly forkliftGeometry = new BoxGeometry(0.6, 0.5, 0.9)
  private readonly forkGeometry = new BoxGeometry(0.08, 0.06, 0.7)
  private readonly beaconGeometry = new SphereGeometry(0.32, 18, 12)
  private readonly crateMaterials = new Map<string, MeshStandardMaterial>()
  private readonly crateMeshes = new Map<string, Mesh>()
  private readonly crateLabels = new Map<string, Sprite>()
  private readonly crateRings = new Map<string, Mesh>()
  private readonly ringMaterials = new Map<string, MeshBasicMaterial>()
  private readonly textureCache = new Map<string, CanvasTexture>()
  private currentConveyorKey: string | null = null
  private currentConveyorMesh: Mesh | null = null
  private currentConveyorLabel: Sprite | null = null
  private forkliftAngle = 0
  private forkliftTargetAngle = 0

  constructor(private readonly container: HTMLElement) {
    const width = Math.max(container.clientWidth, 320)
    const height = Math.max(container.clientHeight, 240)
    this.camera = new PerspectiveCamera(50, width / height, 0.1, 100)
    this.camera.position.set(0, 8.5, 11)
    this.camera.lookAt(0, 0.6, 0)

    this.renderer = new WebGLRenderer({ antialias: true })
    this.scene.background = new Color("#070a12")
    this.scene.add(this.ambient, this.keyLight, this.fillLight)
    this.keyLight.position.set(4, 8, 5)
    this.fillLight.position.set(-5, 4, -3)
    this.scene.add(this.ring, this.conveyorGroup, this.forkliftGroup)
    this.buildFloor()
    this.buildConveyor()
    this.buildForklift()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
  }

  buildPedestals(bucketCount: number): void {
    this.clearPedestals()
    for (let i = 0; i < bucketCount; i += 1) {
      const angle = (i / bucketCount) * Math.PI * 2
      const x = Math.cos(angle) * RING_RADIUS
      const z = Math.sin(angle) * RING_RADIUS
      const material = new MeshStandardMaterial({
        color: "#1a2940",
        emissive: "#0a1424",
        emissiveIntensity: 0.4,
        roughness: 0.7,
        metalness: 0.2,
      })
      const geometry = new BoxGeometry(2.2, PEDESTAL_HEIGHT, 2.2)
      const mesh = new Mesh(geometry, material)
      mesh.position.set(x, PEDESTAL_HEIGHT / 2, z)
      mesh.rotation.y = -angle
      this.ring.add(mesh)
      this.pedestalMeshes.push(mesh)
      this.pedestalMaterials.push(material)

      const label = this.makeLabelSprite(`${i}`, "#f6dd88")
      label.position.set(x, PEDESTAL_HEIGHT + 1.4, z)
      label.scale.set(0.9, 0.5, 1)
      this.ring.add(label)
      this.labelSprites.push(label)
    }
  }

  sync(state: SceneState, _nowMs: number): void {
    if (this.pedestalMeshes.length !== state.bucketCount) {
      this.buildPedestals(state.bucketCount)
    }
    this.highlightPedestal(state.targetShelf)
    this.syncConveyor(state.conveyor)
    this.syncCrates(state.crates)
    this.forkliftTargetAngle = (state.targetShelf / state.bucketCount) * Math.PI * 2
  }

  render(): void {
    const diff = shortestAngle(this.forkliftAngle, this.forkliftTargetAngle)
    this.forkliftAngle += diff * 0.18
    const r = 2.4
    this.forkliftGroup.position.set(
      Math.cos(this.forkliftAngle) * r,
      0,
      Math.sin(this.forkliftAngle) * r,
    )
    // Forklift's forward is +Z (fork tines); rotate so forward faces outward.
    this.forkliftGroup.rotation.y = Math.PI / 2 - this.forkliftAngle
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return
    }
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose(): void {
    this.clearPedestals()
    for (const [, mat] of this.crateMaterials) mat.dispose()
    for (const [, mesh] of this.crateMeshes) {
      mesh.geometry.dispose()
      this.ring.remove(mesh)
    }
    for (const [, ring] of this.crateRings) this.ring.remove(ring)
    for (const [, mat] of this.ringMaterials) mat.dispose()
    for (const [, label] of this.crateLabels) disposeSprite(label)
    for (const [, texture] of this.textureCache) texture.dispose()
    this.crateMaterials.clear()
    this.crateMeshes.clear()
    this.crateRings.clear()
    this.ringMaterials.clear()
    this.crateLabels.clear()
    this.textureCache.clear()
    this.crateGeometry.dispose()
    this.ringGeometry.dispose()
    this.conveyorGeometry.dispose()
    this.forkliftGeometry.dispose()
    this.forkGeometry.dispose()
    this.beaconGeometry.dispose()
    this.disposeConveyor()
    this.disposeForklift()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  private buildFloor(): void {
    const floorGeometry = new BoxGeometry(20, 0.2, 20)
    const floorMaterial = new MeshStandardMaterial({
      color: "#0a0f18",
      emissive: "#04060a",
      emissiveIntensity: 0.2,
      roughness: 0.9,
      metalness: 0.1,
    })
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.position.set(0, -0.1, 0)
    this.scene.add(floor)
  }

  private buildConveyor(): void {
    const material = new MeshStandardMaterial({
      color: "#263349",
      emissive: "#0e1726",
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.3,
    })
    const conveyor = new Mesh(this.conveyorGeometry, material)
    conveyor.position.set(0, 0.2, 0)
    this.conveyorGroup.add(conveyor)
    const ringGeom = new PlaneGeometry(16, 16)
    const ringMat = new MeshBasicMaterial({
      color: "#1a2940",
      transparent: true,
      opacity: 0.18,
    })
    const ring = new Mesh(ringGeom, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    this.scene.add(ring)
  }

  private buildForklift(): void {
    const bodyMat = new MeshStandardMaterial({
      color: "#f6dd88",
      emissive: "#5b4310",
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.3,
    })
    const body = new Mesh(this.forkliftGeometry, bodyMat)
    body.position.set(0, 0.5, 0)
    this.forkliftGroup.add(body)
    const forkMat = new MeshStandardMaterial({
      color: "#cfa64a",
      emissive: "#3a2a08",
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.4,
    })
    const forkLeft = new Mesh(this.forkGeometry, forkMat)
    forkLeft.position.set(-0.18, 0.32, 0.5)
    this.forkliftGroup.add(forkLeft)
    const forkRight = new Mesh(this.forkGeometry, forkMat)
    forkRight.position.set(0.18, 0.32, 0.5)
    this.forkliftGroup.add(forkRight)
    this.forkliftGroup.position.set(0, 0, 2.4)
  }

  private disposeForklift(): void {
    const seen = new Set<Material>()
    this.forkliftGroup.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose()
        const material = obj.material
        if (Array.isArray(material)) {
          for (const m of material) {
            if (!seen.has(m)) {
              m.dispose()
              seen.add(m)
            }
          }
        } else if (!seen.has(material)) {
          material.dispose()
          seen.add(material)
        }
      }
    })
  }

  private clearPedestals(): void {
    for (const mat of this.pedestalMaterials) mat.dispose()
    for (const mesh of this.pedestalMeshes) {
      mesh.geometry.dispose()
      this.ring.remove(mesh)
    }
    this.pedestalMeshes.length = 0
    this.pedestalMaterials.length = 0
    for (const label of this.labelSprites) {
      disposeSprite(label)
      this.ring.remove(label)
    }
    this.labelSprites.length = 0
  }

  private highlightPedestal(target: number): void {
    for (let i = 0; i < this.pedestalMaterials.length; i += 1) {
      const mat = this.pedestalMaterials[i]
      if (mat === undefined) {
        continue
      }
      if (i === target) {
        mat.emissive.set("#3a5a18")
        mat.emissiveIntensity = 0.85
      } else {
        mat.emissive.set("#0a1424")
        mat.emissiveIntensity = 0.4
      }
    }
  }

  private syncConveyor(payload: ConveyorPayload): void {
    const signature = conveyorSignature(payload)
    if (signature === this.currentConveyorKey) {
      return
    }
    this.disposeConveyor()
    this.currentConveyorKey = signature
    if (payload.kind === "EMPTY") {
      return
    }
    const color = conveyorColor(payload)
    const mat = new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.2,
    })
    const isCrate = payload.kind === "SET"
    const mesh = new Mesh(isCrate ? this.crateGeometry : this.beaconGeometry, mat)
    mesh.position.set(0, isCrate ? 1.0 : 0.9, 0)
    this.conveyorGroup.add(mesh)
    this.currentConveyorMesh = mesh
    const label = this.makeLabelSprite(payload.key, "#ffffff")
    label.position.set(0, isCrate ? 1.7 : 1.5, 0)
    label.scale.set(2.0, 0.6, 1)
    this.conveyorGroup.add(label)
    this.currentConveyorLabel = label
  }

  private disposeConveyor(): void {
    if (this.currentConveyorMesh !== null) {
      const mat = this.currentConveyorMesh.material
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose()
      } else {
        mat.dispose()
      }
      this.conveyorGroup.remove(this.currentConveyorMesh)
      this.currentConveyorMesh = null
    }
    if (this.currentConveyorLabel !== null) {
      disposeSprite(this.currentConveyorLabel)
      this.conveyorGroup.remove(this.currentConveyorLabel)
      this.currentConveyorLabel = null
    }
    this.currentConveyorKey = null
  }

  private syncCrates(crates: readonly KvCrateView[]): void {
    const seen = new Set<string>()
    const bucketCount = this.pedestalMeshes.length
    for (const crate of crates) {
      const id = `${crate.bucketIdx}:${crate.chainPos}`
      seen.add(id)
      const angle = bucketCount > 0 ? (crate.bucketIdx / bucketCount) * Math.PI * 2 : 0
      const x = Math.cos(angle) * RING_RADIUS
      const z = Math.sin(angle) * RING_RADIUS
      const y = PEDESTAL_HEIGHT + CRATE_HEIGHT / 2 + crate.chainPos * (CRATE_HEIGHT + 0.05)
      let mesh = this.crateMeshes.get(id)
      let mat = this.crateMaterials.get(id)
      if (mesh === undefined || mat === undefined) {
        mat = new MeshStandardMaterial({
          color: "#f0c674",
          emissive: "#3a2a08",
          emissiveIntensity: 0.5,
          roughness: 0.45,
          metalness: 0.2,
        })
        mesh = new Mesh(this.crateGeometry, mat)
        this.ring.add(mesh)
        this.crateMeshes.set(id, mesh)
        this.crateMaterials.set(id, mat)
        const label = this.makeLabelSprite(crate.key, "#0a0a0a")
        label.scale.set(1.6, 0.45, 1)
        mesh.add(label)
        label.position.set(0, CRATE_HEIGHT / 2 + 0.18, 0)
        this.crateLabels.set(id, label)
      }
      mesh.position.set(x, y, z)
      mesh.rotation.y = -angle
      if (crate.live) {
        mat.color.set("#f0c674")
        mat.emissive.set("#3a2a08")
        mat.emissiveIntensity = 0.55
      } else {
        mat.color.set("#1a2030")
        mat.emissive.set("#000000")
        mat.emissiveIntensity = 0.05
      }
      this.syncRing(id, crate, x, y, z)
    }
    for (const [id, mesh] of this.crateMeshes) {
      if (seen.has(id)) {
        continue
      }
      this.ring.remove(mesh)
      this.crateMeshes.delete(id)
      const mat = this.crateMaterials.get(id)
      if (mat !== undefined) {
        mat.dispose()
        this.crateMaterials.delete(id)
      }
      const ring = this.crateRings.get(id)
      if (ring !== undefined) {
        this.ring.remove(ring)
        this.crateRings.delete(id)
      }
      const ringMat = this.ringMaterials.get(id)
      if (ringMat !== undefined) {
        ringMat.dispose()
        this.ringMaterials.delete(id)
      }
      const label = this.crateLabels.get(id)
      if (label !== undefined) {
        disposeSprite(label)
        this.crateLabels.delete(id)
      }
    }
  }

  private syncRing(id: string, crate: KvCrateView, x: number, y: number, z: number): void {
    if (crate.ttlRemainingMs === null || crate.ttlTotalMs === null) {
      const existing = this.crateRings.get(id)
      if (existing !== undefined) {
        this.ring.remove(existing)
        this.crateRings.delete(id)
        const mat = this.ringMaterials.get(id)
        if (mat !== undefined) {
          mat.dispose()
          this.ringMaterials.delete(id)
        }
      }
      return
    }
    const ratio =
      crate.ttlTotalMs > 0 ? Math.max(0, Math.min(1, crate.ttlRemainingMs / crate.ttlTotalMs)) : 0
    let ring = this.crateRings.get(id)
    let mat = this.ringMaterials.get(id)
    if (ring === undefined || mat === undefined) {
      mat = new MeshBasicMaterial({ color: "#7ac46b" })
      ring = new Mesh(this.ringGeometry, mat)
      this.ring.add(ring)
      this.crateRings.set(id, ring)
      this.ringMaterials.set(id, mat)
    }
    const color = ratio > 0.5 ? "#7ac46b" : ratio > 0.2 ? "#f6dd88" : "#c44b3a"
    mat.color.set(color)
    mat.opacity = crate.live ? 0.85 : 0
    mat.transparent = true
    const radius = 0.95 * (0.4 + 0.6 * ratio)
    ring.scale.set(radius, 1, radius)
    ring.position.set(x, y + 0.02, z)
    ring.rotation.x = Math.PI / 2
  }

  private makeLabelSprite(text: string, color: string): Sprite {
    const cached = this.textureCache.get(text)
    if (cached !== undefined) {
      const material = new SpriteMaterial({ map: cached, depthTest: false })
      const sprite = new Sprite(material)
      sprite.userData["sharedTexture"] = true
      return sprite
    }
    const texture = makeTextTexture(text, color)
    this.textureCache.set(text, texture)
    const material = new SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new Sprite(material)
    sprite.userData["sharedTexture"] = true
    return sprite
  }
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
    ctx.font = "bold 30px 'Courier New', monospace"
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
    if (map !== null) {
      map.dispose()
    }
  }
  material.dispose()
}

function conveyorSignature(payload: ConveyorPayload): string {
  if (payload.kind === "EMPTY") {
    return "EMPTY"
  }
  if (payload.kind === "SET") {
    return `SET:${payload.key}=${payload.value}`
  }
  return `${payload.kind}:${payload.key}`
}

function conveyorColor(payload: ConveyorPayload): Color {
  switch (payload.kind) {
    case "SET":
      return new Color("#f0c674")
    case "GET":
      return new Color("#7ac46b")
    case "DEL":
      return new Color("#c44b3a")
    case "EXPIRE":
      return new Color("#f6dd88")
    case "PERSIST":
      return new Color("#9ee0ff")
    case "EMPTY":
      return new Color("#000000")
  }
}

function shortestAngle(from: number, to: number): number {
  const twoPi = Math.PI * 2
  let delta = (to - from) % twoPi
  if (delta < -Math.PI) delta += twoPi
  if (delta > Math.PI) delta -= twoPi
  return delta
}
