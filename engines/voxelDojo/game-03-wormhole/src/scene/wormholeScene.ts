import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { hashTruncCode } from "../sim/shortener"

/**
 * Three.js projection of the WORMHOLE sim. Renders only — all rules live in src/sim and src/game.
 *
 * Layout: two planets (origin = URL being shortened, destination = redirect target) linked by a
 * ring-portal gate labelled with the base62 code. Traveller streaks dive into the gate on the
 * origin side and emerge at the destination. A collision = the gate + a planet flash red.
 */

export const PALETTE = [
  "#4fc3f7",
  "#ffb74d",
  "#aed581",
  "#f06292",
  "#ba68c8",
  "#ffd54f",
  "#80cbc4",
  "#e0e0e0",
] as const

const PLANET_RADIUS = 1.6
const GATE_RADIUS = 2.0
const ORIGIN_POS = new THREE.Vector3(-7, 0, 0)
const DEST_POS = new THREE.Vector3(7, 0, 0)

/** Stable colour for a URL by hashing it (purely visual). */
function colorForUrl(url: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return PALETTE[h % PALETTE.length] as string
}

function makeTextSprite(text: string, color = "#80cbc4"): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d canvas context unavailable")
  ctx.fillStyle = "rgba(8,10,18,0.78)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
  ctx.font = "bold 64px ui-monospace, Menlo, monospace"
  ctx.fillStyle = color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(4, 2, 1)
  return sprite
}

export class WormholeScene {
  private readonly viewport: Viewport
  private group = new THREE.Group()
  private originMesh!: THREE.Mesh
  private destMesh!: THREE.Mesh
  private gate!: THREE.Mesh
  private gateLabel: THREE.Sprite | null = null
  private gateLight!: THREE.PointLight
  private travellers: THREE.InstancedMesh | null = null
  private flashTimer = 0
  /** when true the gate + destination flash red (collision misrouting) */
  colliding = false
  /** the current code displayed on the gate */
  code = "----"
  /** destination url colour (visual hint) */
  destColor = "#aed581"
  onGateClick: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#06080f",
      fogNear: 22,
      cameraPosition: [0, 6, 18],
      minDistance: 8,
      maxDistance: 50,
      ambientIntensity: 0.6,
      keyIntensity: 1.1,
      onFrame: () => {
        this.animateTravellers()
        this.animateFlash()
      },
    })

    this.viewport.scene.add(this.group)
    this.buildPlanets()
    this.buildGate()

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private buildPlanets(): void {
    this.originMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PLANET_RADIUS, 1),
      new THREE.MeshStandardMaterial({ color: "#4fc3f7", flatShading: true, emissive: "#1a3a4a" }),
    )
    this.originMesh.position.copy(ORIGIN_POS)
    this.originMesh.userData = { kind: "origin" }
    this.group.add(this.originMesh)

    this.destMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PLANET_RADIUS, 1),
      new THREE.MeshStandardMaterial({
        color: this.destColor,
        flatShading: true,
        emissive: "#2a3a1a",
      }),
    )
    this.destMesh.position.copy(DEST_POS)
    this.destMesh.userData = { kind: "destination" }
    this.group.add(this.destMesh)
  }

  private buildGate(): void {
    this.gate = new THREE.Mesh(
      new THREE.TorusGeometry(GATE_RADIUS, 0.12, 12, 48),
      new THREE.MeshStandardMaterial({
        color: "#80cbc4",
        emissive: "#80cbc4",
        emissiveIntensity: 0.8,
      }),
    )
    this.gate.rotation.y = Math.PI / 2
    this.gate.position.set(0, 0, 0)
    this.gate.userData = { kind: "gate" }
    this.group.add(this.gate)

    this.gateLight = new THREE.PointLight("#80cbc4", 2, 18)
    this.gateLight.position.set(0, 0, 0)
    this.group.add(this.gateLight)
  }

  private setGateLabel(code: string): void {
    if (this.gateLabel) {
      this.group.remove(this.gateLabel)
      ;(this.gateLabel.material.map as THREE.Texture | null)?.dispose()
      this.gateLabel.material.dispose()
      this.gateLabel = null
    }
    if (code && code !== "----") {
      const sprite = makeTextSprite(code)
      sprite.position.set(0, GATE_RADIUS + 1.0, 0)
      this.group.add(sprite)
      this.gateLabel = sprite
    }
    this.code = code
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects([
      this.gate,
      this.originMesh,
      this.destMesh,
    ])
    if (hits.length > 0 && this.onGateClick) this.onGateClick()
  }

  /** Rebuild the projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState): void {
    // Determine the code + colour to show from the current pending item.
    let code = "----"
    let colliding = false
    let destColor = this.destColor

    if (state.phase === "predicting") {
      if (state.level.id === "L1") {
        const url = state.urls[state.pendingIndex]
        if (url) {
          code = gateCodeFor(state)
          destColor = colorForUrl(url)
        }
      } else if (state.level.id === "L2") {
        const codes = [...state.map.keys()]
        const c = codes[state.redirectTotal]
        if (c) {
          code = c
          const entry = state.map.get(c)
          if (entry) destColor = colorForUrl(entry.url)
        }
      } else if (state.level.id === "L3") {
        const url = state.urls[state.pendingIndex]
        if (url) {
          code = gateCodeFor(state)
          destColor = colorForUrl(url)
          // collision flash if this URL would collide with an existing code
          colliding = wouldCollideSnapshot(state)
        }
      } else if (state.level.id === "L4") {
        code = state.collisionCode ?? "----"
        colliding = state.collisionCode !== null
        const url = state.urls[state.colliderIndex]
        if (url) destColor = colorForUrl(url)
      }
    }

    this.colliding = colliding || state.phase === "failed"
    this.setGateLabel(code)
    this.destColor = destColor
    ;(this.destMesh.material as THREE.MeshStandardMaterial).color.set(destColor)
    if (this.colliding) this.flashTimer = 1

    this.syncTravellers(state)
  }

  private syncTravellers(state: GameState): void {
    if (this.travellers) {
      this.group.remove(this.travellers)
      this.travellers.dispose()
      this.travellers = null
    }
    const count = Math.min(60, Math.max(6, state.map.size * 3 + 6))
    const mesh = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.05, 0.5, 4, 8),
      new THREE.MeshBasicMaterial({ color: this.colliding ? "#ef5350" : this.destColor }),
      count,
    )
    const m = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2
      const r = 2.2 + (i % 3) * 0.4
      const pos = new THREE.Vector3(Math.cos(t) * r, Math.sin(t * 2) * 1.2, Math.sin(t) * r * 0.4)
      m.makeTranslation(pos.x, pos.y, pos.z)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    this.group.add(mesh)
    this.travellers = mesh
  }

  private animateTravellers(): void {
    if (!this.travellers) return
    const t = performance.now() * 0.001
    const m = new THREE.Matrix4()
    const count = this.travellers.count
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2 + t * (1 + (i % 3) * 0.2)
      // Streaks flow from origin → gate → destination (a wormhole path).
      const span = Math.sin(phase) * 0.5 + 0.5 // 0..1
      const x = ORIGIN_POS.x + (DEST_POS.x - ORIGIN_POS.x) * span
      const y = Math.sin(span * Math.PI) * 2.2 + Math.sin(phase * 3) * 0.3
      const z = Math.cos(phase * 2) * 1.5
      m.makeTranslation(x, y, z)
      this.travellers.setMatrixAt(i, m)
    }
    this.travellers.instanceMatrix.needsUpdate = true
  }

  private animateFlash(): void {
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - 0.02)
    const mat = this.gate.material as THREE.MeshStandardMaterial
    const light = this.gateLight
    if (this.colliding || this.flashTimer > 0) {
      mat.color.set("#ef5350")
      mat.emissive.set("#ef5350")
      mat.emissiveIntensity = 1.2
      light.color.set("#ef5350")
      ;(this.destMesh.material as THREE.MeshStandardMaterial).emissive.set("#5a1010")
    } else {
      mat.color.set("#80cbc4")
      mat.emissive.set("#80cbc4")
      mat.emissiveIntensity = 0.8
      light.color.set("#80cbc4")
      ;(this.destMesh.material as THREE.MeshStandardMaterial).emissive.set("#2a3a1a")
    }
  }
}

// ── helpers that read sim truth to drive the projection ─

function gateCodeFor(state: GameState): string {
  if (state.level.id === "L1" || state.level.id === "L3") {
    const url = state.urls[state.pendingIndex]
    if (!url) return "----"
    return hashTruncCode(url)
  }
  return "----"
}

function wouldCollideSnapshot(state: GameState): boolean {
  const url = state.urls[state.pendingIndex]
  if (!url) return false
  const code = hashTruncCode(url)
  const existing = state.map.get(code)
  return existing ? existing.url !== url : false
}
