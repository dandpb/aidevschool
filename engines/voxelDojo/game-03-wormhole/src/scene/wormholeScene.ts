import * as THREE from "three"
import type { MissionProjection, ProjectionContextHooks } from "../../../shared/projection"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { hashTruncCode } from "../sim/shortener"
import { colorForUrl, DESTINATION_X, ORIGIN_X, WormholePortalVisual } from "./wormholePortalVisual"

/**
 * Three.js projection of the WORMHOLE sim. Renders only — all rules live in src/sim and src/game.
 *
 * Layout: two planets (origin = URL being shortened, destination = redirect target) linked by a
 * ring-portal gate labelled with the base62 code. Traveller streaks dive into the gate on the
 * origin side and emerge at the destination. A collision = the gate + a planet flash red.
 */

export class WormholeScene implements MissionProjection<GameState> {
  private readonly viewport: Viewport
  private readonly canvas: HTMLCanvasElement
  private readonly portalVisual: WormholePortalVisual
  private travellers: THREE.InstancedMesh | null = null
  private flashTimer = 0
  /** when true the gate + destination flash red (collision misrouting) */
  colliding = false
  /** the current code displayed on the gate */
  code = "----"
  /** destination url colour (visual hint) */
  destColor = "#aed581"
  onGateClick: (() => void) | null = null
  private disposed = false

  constructor(canvas: HTMLCanvasElement, hooks: ProjectionContextHooks = {}) {
    this.canvas = canvas
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
      ...hooks,
    })

    this.portalVisual = new WormholePortalVisual(this.destColor)
    this.viewport.scene.add(this.portalVisual.group)

    canvas.addEventListener("pointerdown", this.onPointerDown)
  }

  mount(): void {}

  focus(): void {
    this.canvas.focus()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.canvas.removeEventListener("pointerdown", this.onPointerDown)
    this.portalVisual.dispose()
    this.viewport.dispose()
  }

  private readonly onPointerDown = (event: PointerEvent): void => this.pick(event)

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects([...this.portalVisual.pickTargets])
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
    this.portalVisual.setGateLabel(code)
    this.code = code
    this.destColor = destColor
    this.portalVisual.setDestinationColor(destColor)
    if (this.colliding) this.flashTimer = 1

    this.syncTravellers(state)
  }

  private syncTravellers(state: GameState): void {
    if (this.travellers) {
      this.portalVisual.group.remove(this.travellers)
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
    this.portalVisual.group.add(mesh)
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
      const x = ORIGIN_X + (DESTINATION_X - ORIGIN_X) * span
      const y = Math.sin(span * Math.PI) * 2.2 + Math.sin(phase * 3) * 0.3
      const z = Math.cos(phase * 2) * 1.5
      m.makeTranslation(x, y, z)
      this.travellers.setMatrixAt(i, m)
    }
    this.travellers.instanceMatrix.needsUpdate = true
  }

  private animateFlash(): void {
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - 0.02)
    this.portalVisual.animateFeedback(this.colliding, this.flashTimer)
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
