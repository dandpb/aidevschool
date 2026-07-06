// 3D projection of the Traffic Forge. Read-only with respect to game state:
// every visual is derived from SceneState (a snapshot of pillar health, the
// current orb, the in-flight orb, and the algorithm). The scene never mutates
// game state — it only renders.
//
// Mapping (concept -> visual), per docs/plans/11_load_balancer.md:
//   - backend pool         = ring of N pillars around the dispatcher
//   - dispatcher / proxy   = central cone-turret
//   - pillar health        = colored torus ring atop the pillar
//                            (green=healthy, amber=unhealthy, dark=dead)
//   - in-flight load       = floating counter above each pillar
//   - request orb          = sphere at the turret (current) or arcing (in-flight)
//   - sticky session glyph = floating text label on the orb/pillar
//   - mid-flight failure   = in-flight orb flashes red, freezes mid-arc

import {
  AmbientLight,
  type CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
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
  type Texture,
  TorusGeometry,
  WebGLRenderer,
} from "three"
import type { Algorithm, Health, OrbShape } from "./dispatcher"

export type PillarView = {
  readonly id: number
  readonly health: Health
  readonly inflight: number
  readonly stickySession: string | null
}

export type OrbView = {
  readonly shape: OrbShape
  readonly session: string | null
}

export type InflightView = {
  readonly shape: OrbShape
  readonly session: string | null
  readonly pillarId: number
  // 0 = at turret, 1 = at pillar.
  readonly progress: number
  readonly stalled: boolean
  readonly retrying: boolean
}

export type SceneState = {
  readonly pillarCount: number
  readonly pillars: readonly PillarView[]
  readonly algorithm: Algorithm
  readonly currentOrb: OrbView | null
  readonly inflightOrb: InflightView | null
  readonly targetPillarId: number | null
  readonly finished: boolean
}

const RING_RADIUS = 5
const PILLAR_HEIGHT = 2.2

export class TrafficForgeScene {
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly ambient = new AmbientLight("#9ee0ff", 0.55)
  private readonly keyLight = new DirectionalLight("#f6dd88", 2.0)
  private readonly fillLight = new DirectionalLight("#67c2ff", 1.0)
  private readonly ring = new Group()
  private readonly turretGroup = new Group()
  private readonly pillarMeshes: Mesh[] = []
  private readonly pillarMaterials: MeshStandardMaterial[] = []
  private readonly healthRings: Mesh[] = []
  private readonly healthRingMaterials: MeshBasicMaterial[] = []
  private readonly pillarLabels: Sprite[] = []
  private readonly inflightLabels: Sprite[] = []
  private readonly pillarGeometry = new CylinderGeometry(0.85, 0.95, PILLAR_HEIGHT, 16)
  private readonly turretGeometry = new ConeGeometry(0.9, 1.6, 8)
  private readonly turretBaseGeometry = new CylinderGeometry(1.1, 1.3, 0.4, 8)
  private readonly orbGeometry = new SphereGeometry(0.45, 24, 16)
  private readonly heavyOrbGeometry = new SphereGeometry(0.65, 24, 16)
  private readonly ringGeometry = new TorusGeometry(0.95, 0.08, 8, 32)
  private readonly floorGeometry = new CircleGeometry(14, 64)
  private readonly textureCache = new Map<string, CanvasTexture>()
  private currentOrbMesh: Mesh | null = null
  private currentOrbLabel: Sprite | null = null
  private currentOrbSig = ""
  private inflightOrbMesh: Mesh | null = null
  private inflightOrbLabel: Sprite | null = null
  private beamMesh: Mesh | null = null
  private readonly beamMaterial = new MeshBasicMaterial({
    color: "#f6dd88",
    transparent: true,
    opacity: 0.35,
  })
  private readonly beamGeometry = new CylinderGeometry(0.04, 0.04, 1, 8)
  private turretSpin = 0

  constructor(private readonly container: HTMLElement) {
    const width = Math.max(container.clientWidth, 320)
    const height = Math.max(container.clientHeight, 240)
    this.camera = new PerspectiveCamera(50, width / height, 0.1, 100)
    this.camera.position.set(0, 9.5, 12)
    this.camera.lookAt(0, 1.0, 0)

    this.renderer = new WebGLRenderer({ antialias: true })
    this.scene.background = new Color("#070a12")
    this.scene.add(this.ambient, this.keyLight, this.fillLight)
    this.keyLight.position.set(4, 8, 5)
    this.fillLight.position.set(-5, 4, -3)
    this.scene.add(this.ring, this.turretGroup)
    this.buildFloor()
    this.buildTurret()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
  }

  buildPillars(count: number): void {
    this.clearPillars()
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * RING_RADIUS
      const z = Math.sin(angle) * RING_RADIUS

      const mat = new MeshStandardMaterial({
        color: "#1a2940",
        emissive: "#0a1424",
        emissiveIntensity: 0.4,
        roughness: 0.7,
        metalness: 0.2,
      })
      const mesh = new Mesh(this.pillarGeometry, mat)
      mesh.position.set(x, PILLAR_HEIGHT / 2, z)
      this.ring.add(mesh)
      this.pillarMeshes.push(mesh)
      this.pillarMaterials.push(mat)

      const ringMat = new MeshBasicMaterial({ color: "#7ac46b" })
      const ring = new Mesh(this.ringGeometry, ringMat)
      ring.position.set(x, PILLAR_HEIGHT + 0.1, z)
      ring.rotation.x = Math.PI / 2
      this.ring.add(ring)
      this.healthRings.push(ring)
      this.healthRingMaterials.push(ringMat)

      const idLabel = this.makeLabelSprite(`P${i}`, "#f6dd88")
      idLabel.position.set(x, PILLAR_HEIGHT + 0.85, z)
      idLabel.scale.set(0.9, 0.45, 1)
      this.ring.add(idLabel)
      this.pillarLabels.push(idLabel)

      const loadLabel = this.makeLabelSprite("0", "#ffffff")
      loadLabel.position.set(x, PILLAR_HEIGHT + 0.45, z)
      loadLabel.scale.set(0.8, 0.4, 1)
      this.ring.add(loadLabel)
      this.inflightLabels.push(loadLabel)
    }
  }

  sync(state: SceneState, _nowMs: number): void {
    if (this.pillarMeshes.length !== state.pillarCount) {
      this.buildPillars(state.pillarCount)
    }
    for (let i = 0; i < state.pillars.length; i += 1) {
      const view = state.pillars[i]
      if (view === undefined) {
        continue
      }
      const mat = this.pillarMaterials[i]
      const ringMat = this.healthRingMaterials[i]
      const loadLabel = this.inflightLabels[i]
      if (mat === undefined || ringMat === undefined || loadLabel === undefined) {
        continue
      }
      const isTarget = state.targetPillarId === view.id
      let color = "#1a2940"
      let emissive = "#0a1424"
      let emissiveIntensity = 0.4
      let ringColor = "#444444"
      if (view.health === "healthy") {
        color = "#1e3a1e"
        emissive = "#0a2a0a"
        emissiveIntensity = 0.55
        ringColor = "#7ac46b"
      } else if (view.health === "unhealthy") {
        color = "#3a2410"
        emissive = "#2a1604"
        emissiveIntensity = 0.6
        ringColor = "#f6a13a"
      } else {
        color = "#0a0e16"
        emissive = "#000000"
        emissiveIntensity = 0.05
        ringColor = "#222222"
      }
      if (isTarget) {
        emissive = "#5b4310"
        emissiveIntensity = 1.0
      }
      mat.color.set(color)
      mat.emissive.set(emissive)
      mat.emissiveIntensity = emissiveIntensity
      ringMat.color.set(ringColor)
      this.updateLabel(loadLabel, `${view.inflight}`, view.inflight > 0 ? "#ffe08a" : "#8896a8")
    }

    this.syncCurrentOrb(state.currentOrb)
    this.syncInflightOrb(state.inflightOrb)
    this.turretSpin = (this.turretSpin + 0.01) % (Math.PI * 2)
    this.turretGroup.rotation.y = this.turretSpin
  }

  render(): void {
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
    this.clearPillars()
    this.disposeCurrentOrb()
    this.disposeInflightOrb()
    this.disposeBeam()
    this.disposeTurret()
    this.pillarGeometry.dispose()
    this.turretGeometry.dispose()
    this.turretBaseGeometry.dispose()
    this.orbGeometry.dispose()
    this.heavyOrbGeometry.dispose()
    this.ringGeometry.dispose()
    this.floorGeometry.dispose()
    this.beamGeometry.dispose()
    this.beamMaterial.dispose()
    for (const [, texture] of this.textureCache) {
      texture.dispose()
    }
    this.textureCache.clear()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  private buildFloor(): void {
    const floorMat = new MeshStandardMaterial({
      color: "#0a0f18",
      emissive: "#04060a",
      emissiveIntensity: 0.2,
      roughness: 0.9,
      metalness: 0.1,
    })
    const floor = new Mesh(this.floorGeometry, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, -0.05, 0)
    this.scene.add(floor)
  }

  private buildTurret(): void {
    const baseMat = new MeshStandardMaterial({
      color: "#263349",
      emissive: "#0e1726",
      emissiveIntensity: 0.5,
      roughness: 0.6,
      metalness: 0.3,
    })
    const base = new Mesh(this.turretBaseGeometry, baseMat)
    base.position.set(0, 0.2, 0)
    this.turretGroup.add(base)
    const coneMat = new MeshStandardMaterial({
      color: "#f6dd88",
      emissive: "#5b4310",
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.4,
    })
    const cone = new Mesh(this.turretGeometry, coneMat)
    cone.position.set(0, 1.2, 0)
    this.turretGroup.add(cone)
    this.turretGroup.position.set(0, 0, 0)
  }

  private disposeTurret(): void {
    const seen = new Set<Material>()
    this.turretGroup.traverse((obj) => {
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

  private clearPillars(): void {
    for (const mat of this.pillarMaterials) {
      mat.dispose()
    }
    for (const mesh of this.pillarMeshes) {
      this.ring.remove(mesh)
    }
    for (const mat of this.healthRingMaterials) {
      mat.dispose()
    }
    for (const ring of this.healthRings) {
      this.ring.remove(ring)
    }
    for (const label of this.pillarLabels) {
      disposeSprite(label)
      this.ring.remove(label)
    }
    for (const label of this.inflightLabels) {
      disposeSprite(label)
      this.ring.remove(label)
    }
    this.pillarMeshes.length = 0
    this.pillarMaterials.length = 0
    this.healthRings.length = 0
    this.healthRingMaterials.length = 0
    this.pillarLabels.length = 0
    this.inflightLabels.length = 0
  }

  private syncCurrentOrb(orb: OrbView | null): void {
    if (orb === null) {
      this.disposeCurrentOrb()
      return
    }
    const sig = `${orb.shape}:${orb.session ?? ""}`
    if (sig === this.currentOrbSig && this.currentOrbMesh !== null) {
      return
    }
    this.disposeCurrentOrb()
    this.currentOrbSig = sig
    const geo = orb.shape === "heavy" ? this.heavyOrbGeometry : this.orbGeometry
    const color = orbColor(orb.shape)
    const mat = new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.2,
    })
    const mesh = new Mesh(geo, mat)
    mesh.position.set(0, 2.1, 0)
    this.turretGroup.add(mesh)
    this.currentOrbMesh = mesh
    if (orb.session !== null) {
      const label = this.makeLabelSprite(orb.session, "#ffe08a")
      label.position.set(0, 2.85, 0)
      label.scale.set(1.6, 0.45, 1)
      this.turretGroup.add(label)
      this.currentOrbLabel = label
    }
  }

  private disposeCurrentOrb(): void {
    if (this.currentOrbMesh !== null) {
      disposeMaterial(this.currentOrbMesh)
      this.turretGroup.remove(this.currentOrbMesh)
      this.currentOrbMesh = null
    }
    if (this.currentOrbLabel !== null) {
      disposeSprite(this.currentOrbLabel)
      this.turretGroup.remove(this.currentOrbLabel)
      this.currentOrbLabel = null
    }
    this.currentOrbSig = ""
  }

  private syncInflightOrb(orb: InflightView | null): void {
    if (orb === null) {
      this.disposeInflightOrb()
      this.disposeBeam()
      return
    }
    const N = this.pillarMeshes.length
    if (N === 0) {
      return
    }
    const angle = (orb.pillarId / N) * Math.PI * 2
    const tx = Math.cos(angle) * RING_RADIUS
    const tz = Math.sin(angle) * RING_RADIUS
    const ty = PILLAR_HEIGHT + 0.3

    const t = clamp(orb.progress, 0, 1)
    const x = tx * t
    const z = tz * t
    const arcHeight = 2.5
    const y = 2.1 + (ty - 2.1) * t + arcHeight * Math.sin(t * Math.PI)

    if (this.inflightOrbMesh === null) {
      const geo = orb.shape === "heavy" ? this.heavyOrbGeometry : this.orbGeometry
      const baseColor = orbColor(orb.shape)
      const mat = new MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.2,
      })
      const mesh = new Mesh(geo, mat)
      this.scene.add(mesh)
      this.inflightOrbMesh = mesh
    }
    if (this.inflightOrbMesh !== null) {
      const mat = this.inflightOrbMesh.material
      if (mat instanceof MeshStandardMaterial) {
        const c = orb.stalled ? "#ff5555" : orb.retrying ? "#9ee0ff" : orbColor(orb.shape)
        mat.color.set(c)
        mat.emissive.set(c)
        mat.emissiveIntensity = orb.stalled ? 1.5 : 0.7
      }
      this.inflightOrbMesh.position.set(x, y, z)
    }

    if (orb.session !== null && this.inflightOrbLabel === null) {
      const label = this.makeLabelSprite(orb.session, "#ffe08a")
      label.scale.set(1.5, 0.4, 1)
      this.scene.add(label)
      this.inflightOrbLabel = label
    }
    if (this.inflightOrbLabel !== null) {
      this.inflightOrbLabel.position.set(x, y + 0.7, z)
      if (orb.session === null) {
        disposeSprite(this.inflightOrbLabel)
        this.scene.remove(this.inflightOrbLabel)
        this.inflightOrbLabel = null
      }
    }

    this.syncBeam(tx, ty, tz, orb.stalled)
  }

  private syncBeam(tx: number, ty: number, tz: number, stalled: boolean): void {
    const fx = 0
    const fy = 1.6
    const fz = 0
    const dx = tx - fx
    const dy = ty - fy
    const dz = tz - fz
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len < 0.001) {
      return
    }
    if (this.beamMesh === null) {
      this.beamMesh = new Mesh(this.beamGeometry, this.beamMaterial)
      this.scene.add(this.beamMesh)
    }
    this.beamMaterial.color.set(stalled ? "#ff5555" : "#f6dd88")
    this.beamMesh.scale.set(1, len, 1)
    this.beamMesh.position.set((fx + tx) / 2, (fy + ty) / 2, (fz + tz) / 2)
    // Orient cylinder (default +Y) along the vector (dx, dy, dz).
    const axisX = -dz
    const axisZ = dx
    const axisLen = Math.sqrt(axisX * axisX + axisZ * axisZ)
    if (axisLen > 0.0001) {
      this.beamMesh.rotation.set(0, Math.atan2(axisZ, axisX), 0)
    }
    // Pitch the beam so it tilts from vertical toward the target.
    const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)))
    this.beamMesh.rotation.set(pitch - Math.PI / 2, this.beamMesh.rotation.y, 0)
  }

  private disposeInflightOrb(): void {
    if (this.inflightOrbMesh !== null) {
      disposeMaterial(this.inflightOrbMesh)
      this.scene.remove(this.inflightOrbMesh)
      this.inflightOrbMesh = null
    }
    if (this.inflightOrbLabel !== null) {
      disposeSprite(this.inflightOrbLabel)
      this.scene.remove(this.inflightOrbLabel)
      this.inflightOrbLabel = null
    }
  }

  private disposeBeam(): void {
    if (this.beamMesh !== null) {
      this.scene.remove(this.beamMesh)
      this.beamMesh = null
    }
  }

  private updateLabel(label: Sprite, text: string, color: string): void {
    const material = label.material
    const map = material.map
    // If the text/color didn't change, skip the texture rewrite.
    if (label.userData["text"] === text && label.userData["color"] === color) {
      return
    }
    label.userData["text"] = text
    label.userData["color"] = color
    if (map !== null) {
      redrawTextTexture(map, text, color)
    }
  }

  private makeLabelSprite(text: string, color: string): Sprite {
    const cached = this.textureCache.get(text)
    if (cached !== undefined) {
      const material = new SpriteMaterial({ map: cached, depthTest: false })
      const sprite = new Sprite(material)
      sprite.userData["sharedTexture"] = true
      sprite.userData["text"] = text
      sprite.userData["color"] = color
      return sprite
    }
    const texture = makeTextTexture(text, color)
    this.textureCache.set(text, texture)
    const material = new SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new Sprite(material)
    sprite.userData["sharedTexture"] = true
    sprite.userData["text"] = text
    sprite.userData["color"] = color
    return sprite
  }
}

function orbColor(shape: OrbShape): Color {
  switch (shape) {
    case "plain":
      return new Color("#ffffff")
    case "heavy":
      return new Color("#e8553a")
    case "sticky":
      return new Color("#ffd24a")
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
    ctx.font = "bold 28px 'Courier New', monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new ThreeCanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function redrawTextTexture(texture: Texture, text: string, color: string): void {
  const image = texture.image as unknown
  const canvas = image as HTMLCanvasElement | undefined
  if (canvas === undefined) {
    return
  }
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "rgba(8, 11, 18, 0.85)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.font = "bold 28px 'Courier New', monospace"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  texture.needsUpdate = true
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

function disposeMaterial(mesh: Mesh): void {
  const material = mesh.material
  if (Array.isArray(material)) {
    for (const m of material) {
      m.dispose()
    }
  } else {
    material.dispose()
  }
}

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo
  if (value > hi) return hi
  return value
}

// algorithm param is part of the SceneState contract (forward compatibility
// for HUD-style algorithm indicators in the 3D scene). Referenced here to keep
// the type re-export live without forcing callers to import from dispatcher.
export type { Algorithm }
