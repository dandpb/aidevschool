// Log Pier — three.js projection of the message-queue state.
//
// Render-only: every rule lives in src/game/log.ts. The scene reads snapshots
// and updates meshes. The mechanics:
//   - N parallel color-coded partition lanes stretching into the distance,
//     each a row of numbered offset slots.
//   - A Producer Platform at the front where the inbound orb floats, with a
//     3s deadline ring.
//   - Per-(group × partition) cursor rings sitting on the next-to-deliver slot.
//   - Lag strip glowing red between the cursor and the latest filled slot.
//   - Retention Tide creeping translucent wall that dissolves old slots.

import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { MessageQueueSnapshot } from "../game/log"

const LANE_SPACING = 3.6
const LANE_HALF_WIDTH = 0.9
const SLOT_SPACING = 1.6
const SLOT_SIZE = 0.7
const SLOT_MAX_VISIBLE = 12 // saturation for the lane length
const LANE_LENGTH = SLOT_MAX_VISIBLE * SLOT_SPACING

export interface SceneInput {
  readonly snapshot: MessageQueueSnapshot
  readonly focusedPartition: number
  readonly focusedGroup: number
}

interface LaneMeshes {
  group: THREE.Group
  slots: THREE.Mesh[]
  slotLabels: THREE.Sprite[]
  nextOffsetMarker: THREE.Mesh
  lagStrip: THREE.Mesh
  tideWall: THREE.Mesh
  laneLabel: THREE.Sprite
}

interface CursorMeshes {
  ring: THREE.Mesh
  label: THREE.Sprite
}

/** Builds the 3D pier and exposes sync(state). */
export class LogPierScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly lanes: LaneMeshes[] = []
  private readonly cursors: CursorMeshes[] = []
  private readonly platformGroup: THREE.Group
  private platformOrb: THREE.Mesh | null = null
  private readonly platformLight: THREE.PointLight
  private focusedPartition = 0
  private focusedGroup = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#07090f")
    this.scene.fog = new THREE.Fog("#07090f", 24, 60)

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200)
    this.camera.position.set(0, 9.5, 16)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 40
    this.controls.minDistance = 8
    this.controls.target.set(0, 1.6, -4)

    const ambient = new THREE.AmbientLight("#3d4663", 0.7)
    const dir = new THREE.DirectionalLight("#ffffff", 1.0)
    dir.position.set(6, 14, 8)
    this.scene.add(ambient, dir)
    this.platformLight = new THREE.PointLight("#ffd54f", 0, 12, 2)
    this.platformLight.position.set(0, 3, 6)
    this.scene.add(this.platformLight)

    // Floor grid — depth perception for the receding lanes.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: "#10131c", roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    this.scene.add(floor)
    const grid = new THREE.GridHelper(80, 80, "#1f2536", "#161b27")
    this.scene.add(grid)

    this.scene.add(new THREE.Group().add(this.makeBackdrop()))

    this.platformGroup = new THREE.Group()
    this.scene.add(this.platformGroup)
    this.buildPlatform()

    // Lanes built lazily on first sync (we need the snapshot's partition list).
    this.onResize()
    window.addEventListener("resize", this.onResize)
  }

  private onResize = (): void => {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private makeBackdrop(): THREE.Object3D {
    // Distant gradient backdrop — adds to the "pier stretching out" feel.
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 30),
      new THREE.MeshBasicMaterial({
        color: "#1a1f30",
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    )
    backdrop.position.set(0, 8, -28)
    return backdrop
  }

  private buildPlatform(): void {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.2, 1.8),
      new THREE.MeshStandardMaterial({ color: "#1a2030", emissive: "#0a0d18" }),
    )
    base.position.set(0, 0.1, 6)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: "#ffd54f", transparent: true, opacity: 0.6 }),
    )
    ring.position.set(0, 0.25, 6)
    ring.rotation.x = -Math.PI / 2
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: "#aab3cc" }),
    )
    pole.position.set(0, 0.55, 6)
    this.platformGroup.add(base, ring, pole)
  }

  private buildLanes(snapshot: MessageQueueSnapshot): void {
    if (this.lanes.length === snapshot.partitions.length) return
    // Clear stale (in case partition count differs) and rebuild.
    for (const lane of this.lanes) this.scene.remove(lane.group)
    this.lanes.length = 0
    const count = snapshot.partitions.length
    const half = (count - 1) / 2
    for (let i = 0; i < count; i += 1) {
      const x = (i - half) * LANE_SPACING
      const color = snapshot.partitions[i]?.color ?? "#ffffff"
      const group = new THREE.Group()
      // Lane floor strip — the channel the orbs slide along.
      const channel = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_HALF_WIDTH * 2, 0.05, LANE_LENGTH),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.05,
          transparent: true,
          opacity: 0.35,
        }),
      )
      channel.position.set(0, 0.04, -LANE_LENGTH / 2 + 3)
      group.add(channel)
      // Slot row.
      const slots: THREE.Mesh[] = []
      const slotLabels: THREE.Sprite[] = []
      for (let s = 0; s < SLOT_MAX_VISIBLE; s += 1) {
        const z = -s * SLOT_SPACING
        const slotMesh = new THREE.Mesh(
          new THREE.BoxGeometry(SLOT_SIZE, SLOT_SIZE, SLOT_SIZE),
          new THREE.MeshStandardMaterial({
            color: "#1a2030",
            emissive: color,
            emissiveIntensity: 0.0,
            transparent: true,
            opacity: 0.18,
          }),
        )
        slotMesh.position.set(0, SLOT_SIZE / 2 + 0.06, z)
        slotMesh.visible = false
        slots.push(slotMesh)
        group.add(slotMesh)
        const lab = makeTextSprite(`${s}`, "#7f8ab0")
        lab.position.set(LANE_HALF_WIDTH + 0.25, SLOT_SIZE + 0.2, z)
        lab.scale.set(0.6, 0.3, 1)
        slotLabels.push(lab)
        group.add(lab)
      }
      // nextOffset beacon — a slim glowing cube at the front of the lane.
      const nextOffsetMarker = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.2, 0.2),
        new THREE.MeshStandardMaterial({
          color: "#4fc3f7",
          emissive: "#4fc3f7",
          emissiveIntensity: 0.6,
        }),
      )
      nextOffsetMarker.position.set(-LANE_HALF_WIDTH - 0.3, 0.7, 0)
      group.add(nextOffsetMarker)
      // Lag strip — a translucent red bar between cursor and latest filled slot.
      const lagStrip = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_HALF_WIDTH * 1.4, 0.06, 1),
        new THREE.MeshBasicMaterial({
          color: "#f06292",
          transparent: true,
          opacity: 0.0,
        }),
      )
      lagStrip.position.set(0, 0.08, 0)
      group.add(lagStrip)
      // Retention tide wall — sits at beginningOffset.
      const tideWall = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_HALF_WIDTH * 2.4, 1.6, 0.08),
        new THREE.MeshBasicMaterial({
          color: "#7f8ab0",
          transparent: true,
          opacity: 0.0,
        }),
      )
      tideWall.position.set(0, 0.8, 0)
      group.add(tideWall)
      // Lane label.
      const laneLabel = makeTextSprite(`P${i}`, color)
      laneLabel.position.set(0, SLOT_SIZE + 1.4, 1.5)
      laneLabel.scale.set(1.0, 0.5, 1)
      group.add(laneLabel)

      group.position.set(x, 0, 0)
      this.scene.add(group)
      this.lanes.push({
        group,
        slots,
        slotLabels,
        nextOffsetMarker,
        lagStrip,
        tideWall,
        laneLabel,
      })
    }
  }

  private buildCursors(snapshot: MessageQueueSnapshot): void {
    if (this.cursors.length === snapshot.consumerGroups.length) return
    for (const c of this.cursors) {
      c.ring.removeFromParent()
      c.label.removeFromParent()
    }
    this.cursors.length = 0
    for (const g of snapshot.consumerGroups) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(SLOT_SIZE * 0.7, 0.06, 8, 32),
        new THREE.MeshStandardMaterial({
          color: "#ffd54f",
          emissive: "#ffd54f",
          emissiveIntensity: 0.7,
        }),
      )
      ring.rotation.x = -Math.PI / 2
      this.scene.add(ring)
      const label = makeTextSprite(`G${g.id}`, "#ffd54f")
      label.scale.set(0.8, 0.4, 1)
      this.scene.add(label)
      this.cursors.push({ ring, label })
    }
  }

  private updatePlatform(snapshot: MessageQueueSnapshot): void {
    if (this.platformOrb !== null) {
      this.platformGroup.remove(this.platformOrb)
      this.platformOrb = null
    }
    const orb = snapshot.pendingOrb
    if (orb === null) {
      this.platformLight.intensity = 0
      return
    }
    const color = orb.keyColor
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
      }),
    )
    mesh.position.set(0, 1.05, 6)
    this.platformOrb = mesh
    this.platformGroup.add(mesh)
    this.platformLight.color.set(color)
    this.platformLight.intensity = 2.4
  }

  private updateLanes(snapshot: MessageQueueSnapshot): void {
    const half = (snapshot.partitions.length - 1) / 2
    for (let i = 0; i < snapshot.partitions.length; i += 1) {
      const part = snapshot.partitions[i]
      const lane = this.lanes[i]
      if (part === undefined || lane === undefined) continue
      const focused = i === this.focusedPartition
      // Slot visibility + fill coloring.
      for (let s = 0; s < SLOT_MAX_VISIBLE; s += 1) {
        const slotMesh = lane.slots[s]
        if (slotMesh === undefined) continue
        const slot = part.slots[s]
        if (slot === null || slot === undefined) {
          slotMesh.visible = false
          continue
        }
        slotMesh.visible = true
        const mat = slotMesh.material as THREE.MeshStandardMaterial
        mat.color.set(slot.keyColor)
        const anyFetched = slot.fetchedBy.some((v) => v)
        const anyCommitted = slot.committedBy.some((v) => v)
        mat.emissive.set(slot.keyColor)
        if (anyCommitted) mat.emissiveIntensity = 0.15
        else if (anyFetched) mat.emissiveIntensity = 1.2
        else mat.emissiveIntensity = 0.55
        mat.opacity = anyCommitted ? 0.6 : 0.92
      }
      // nextOffset beacon slides along z = -nextOffset * spacing.
      const nextZ = -part.nextOffset * SLOT_SPACING
      lane.nextOffsetMarker.position.z = nextZ
      lane.nextOffsetMarker.visible = part.nextOffset < SLOT_MAX_VISIBLE
      // Lane label highlight.
      const labelMat = lane.laneLabel.material as THREE.SpriteMaterial
      labelMat.color.set(focused ? "#ffffff" : "#aab3cc")
      // Tide wall opacity — only show when beginningOffset > 0.
      const tideZ = -part.beginningOffset * SLOT_SPACING + SLOT_SPACING * 0.4
      lane.tideWall.position.z = tideZ
      const tideMat = lane.tideWall.material as THREE.MeshBasicMaterial
      tideMat.opacity = part.beginningOffset > 0 ? 0.35 : 0.0
      // Lag strip — covers from cursor of group 0 on this lane to nextOffset.
      // For visual simplicity, take the max lag among groups on this lane.
      let maxLag = 0
      for (const g of snapshot.consumerGroups) {
        if (g.partition === part.id && g.lag > maxLag) maxLag = g.lag
      }
      const lagStripMat = lane.lagStrip.material as THREE.MeshBasicMaterial
      if (maxLag <= 0) {
        lagStripMat.opacity = 0.0
      } else {
        lagStripMat.opacity = Math.min(0.8, 0.3 + maxLag * 0.15)
        const lengthZ = maxLag * SLOT_SPACING
        const startOffset = Math.max(part.beginningOffset, part.nextOffset - maxLag)
        const startZ = -startOffset * SLOT_SPACING
        lane.lagStrip.scale.z = Math.max(0.05, lengthZ)
        lane.lagStrip.position.z = startZ - lengthZ / 2
      }
      void half
    }
  }

  private updateCursors(snapshot: MessageQueueSnapshot): void {
    const half = (snapshot.partitions.length - 1) / 2
    for (let gi = 0; gi < snapshot.consumerGroups.length; gi += 1) {
      const g = snapshot.consumerGroups[gi]
      const cursor = this.cursors[gi]
      if (g === undefined || cursor === undefined) continue
      const partIdx = g.partition
      const x = (partIdx - half) * LANE_SPACING
      // Cursor sits on the slot it will read NEXT (committedOffset).
      const z = -g.committedOffset * SLOT_SPACING
      cursor.ring.position.set(x, SLOT_SIZE + 0.18, z)
      cursor.label.position.set(x + 0.6, SLOT_SIZE + 0.6, z)
      const focused = gi === this.focusedGroup
      const mat = cursor.ring.material as THREE.MeshStandardMaterial
      mat.color.set(focused ? "#ffffff" : "#ffd54f")
      mat.emissive.set(focused ? "#ffffff" : "#ffd54f")
      mat.emissiveIntensity = focused ? 1.0 : 0.5
    }
  }

  sync(input: SceneInput): void {
    this.focusedPartition = input.focusedPartition
    this.focusedGroup = input.focusedGroup
    const snapshot = input.snapshot
    this.buildLanes(snapshot)
    this.buildCursors(snapshot)
    this.updatePlatform(snapshot)
    this.updateLanes(snapshot)
    this.updateCursors(snapshot)
  }

  render(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize)
    this.renderer.dispose()
  }
}

function makeTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = "bold 32px ui-monospace, Menlo, monospace"
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  return new THREE.Sprite(mat)
}
