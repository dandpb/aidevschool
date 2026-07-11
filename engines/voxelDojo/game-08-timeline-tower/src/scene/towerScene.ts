import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import type { OrderEvent } from "../sim/sourcing"

const FLOOR_HEIGHT = 1.4
const FLOOR_SIZE = 3.2
const FLOOR_THICK = 0.5

/** Color per lifecycle event type — the floor's tint tells the player what happened. */
const TYPE_COLOR: Record<string, string> = {
  OrderCreated: "#4fc3f7",
  PaymentAuthorized: "#aed581",
  PaymentFailed: "#f06292",
  InventoryReserved: "#ffb74d",
  InventoryRejected: "#ef5350",
  OrderConfirmed: "#80cbc4",
  OrderCancelled: "#9e9e9e",
  OrderShipped: "#ba68c8",
  OrderDelivered: "#ffd54f",
}
export const PALETTE = [
  "#4fc3f7",
  "#aed581",
  "#ffb74d",
  "#f06292",
  "#ba68c8",
  "#ffd54f",
  "#80cbc4",
  "#ef5350",
] as const

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 *
 * The hero object is the TOWER: one BoxGeometry slab per event, stacked oldest→newest
 * bottom→top. An ELEVATOR ascends through the floors during replay (its y is animated
 * toward the replay head), and a floating readout hovers above showing the derived
 * projection. Two slabs sharing a base but different colors make the L4 "two views from
 * one stack" idea legible.
 */
export class TowerScene {
  private readonly viewport: Viewport
  private towerGroup = new THREE.Group()
  private floorMeshes: THREE.Mesh[] = []
  private elevator: THREE.Mesh
  private elevatorTargetY = 0
  private readout: THREE.Sprite
  private readoutCanvas: HTMLCanvasElement
  private readoutCtx: CanvasRenderingContext2D
  private readoutTexture: THREE.CanvasTexture

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 22,
      fogFar: 60,
      cameraPosition: [10, 8, 14],
      controlsTarget: [0, 3, 0],
      minDistance: 6,
      maxDistance: 50,
      ambientIntensity: 0.75,
      keyIntensity: 1.1,
      onFrame: () => {
        // animate the elevator toward its target y (the replay head)
        this.elevator.position.y += (this.elevatorTargetY - this.elevator.position.y) * 0.12
        this.elevator.rotation.z += 0.01
      },
    })

    this.viewport.scene.add(this.towerGroup)
    // foundation slab
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(FLOOR_SIZE + 0.6, 0.4, FLOOR_SIZE + 0.6),
      new THREE.MeshStandardMaterial({ color: "#1a2030", flatShading: true }),
    )
    base.position.y = -0.2
    this.towerGroup.add(base)
    // central spine
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8),
      new THREE.MeshBasicMaterial({ color: "#3d4663" }),
    )
    this.towerGroup.add(spine)

    // rim fill light (the cyan back-light from the original setup)
    const rim = new THREE.DirectionalLight("#4fc3f7", 0.35)
    rim.position.set(-10, 6, -8)
    this.viewport.scene.add(rim)

    // elevator — a glowing ring/box that rides up the spine during replay
    this.elevator = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.12, 10, 32),
      new THREE.MeshStandardMaterial({
        color: "#ffd54f",
        emissive: "#ffd54f",
        emissiveIntensity: 0.6,
      }),
    )
    this.elevator.rotation.x = Math.PI / 2
    this.towerGroup.add(this.elevator)

    // floating projection readout (canvas texture sprite above the tower)
    this.readoutCanvas = document.createElement("canvas")
    this.readoutCanvas.width = 512
    this.readoutCanvas.height = 256
    this.readoutCtx = this.readoutCanvas.getContext("2d") as CanvasRenderingContext2D
    this.readoutTexture = new THREE.CanvasTexture(this.readoutCanvas)
    this.readout = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.readoutTexture, transparent: true }),
    )
    this.readout.scale.set(6, 3, 1)
    this.towerGroup.add(this.readout)
    this.drawReadout("awaiting", "no events yet")
  }

  /** Rebuild the tower projection from a sim snapshot. */
  sync(state: GameState, statusLabel: string, shippedLabel: string): void {
    this.syncFloors(state.log)
    // the elevator sits at the replay head: the topmost folded floor
    const replayHead = Math.max(0, state.log.length - 1)
    this.elevatorTargetY = replayHead * FLOOR_HEIGHT + FLOOR_HEIGHT / 2
    this.readout.position.set(0, state.log.length * FLOOR_HEIGHT + 2.4, 0)
    this.drawReadout(statusLabel, shippedLabel)
  }

  private syncFloors(log: readonly OrderEvent[]): void {
    // remove extra floors
    while (this.floorMeshes.length > log.length) {
      const m = this.floorMeshes.pop() as THREE.Mesh
      this.towerGroup.remove(m)
      m.geometry.dispose()
    }
    // add or update floors — one slab per event, stacked bottom→top
    log.forEach((event, i) => {
      let mesh = this.floorMeshes[i]
      const color = TYPE_COLOR[event.type] ?? "#aab3cc"
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(FLOOR_SIZE, FLOOR_THICK, FLOOR_SIZE),
          new THREE.MeshStandardMaterial({ flatShading: true }),
        )
        mesh.position.set(0, i * FLOOR_HEIGHT + FLOOR_HEIGHT / 2, 0)
        this.towerGroup.add(mesh)
        this.floorMeshes[i] = mesh
      } else {
        mesh.position.y = i * FLOOR_HEIGHT + FLOOR_HEIGHT / 2
      }
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color = new THREE.Color(color)
      mat.emissive = new THREE.Color(color)
      // top floor glows brightest (it is the newest appended event)
      mat.emissiveIntensity = i === log.length - 1 ? 0.55 : 0.18
    })
    // keep the elevator above the base when the tower is empty
    if (log.length === 0) this.elevatorTargetY = 0
  }

  private drawReadout(statusLabel: string, shippedLabel: string): void {
    const ctx = this.readoutCtx
    const { width, height } = this.readoutCanvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "rgba(10,14,20,0.82)"
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = "#3d4663"
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, width - 4, height - 4)
    ctx.fillStyle = "#aab3cc"
    ctx.font = "bold 26px ui-monospace, monospace"
    ctx.fillText("PROJECTION (derived)", 24, 44)
    ctx.fillStyle = "#e6e9f2"
    ctx.font = "30px ui-monospace, monospace"
    ctx.fillText(`order_status: ${statusLabel}`, 24, 100)
    ctx.fillStyle = "#ba68c8"
    ctx.fillText(`shipment_list: ${shippedLabel}`, 24, 160)
    ctx.fillStyle = "#7f8ab0"
    ctx.font = "18px ui-monospace, monospace"
    ctx.fillText("rebuilt by folding the log", 24, 210)
    this.readoutTexture.needsUpdate = true
  }
}
