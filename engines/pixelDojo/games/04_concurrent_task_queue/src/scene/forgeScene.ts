import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"
import type { Task } from "../sim/queue"

// Palette: green=clear-success, yellow=transient, red=poison, blue=done
const COLOR_CLEAR = "#7bd88f"
const COLOR_TRANSIENT = "#ffd54f"
const COLOR_POISON = "#ef5350"
const COLOR_DONE = "#4fc3f7"
const COLOR_RETRY_RACK = "#ba68c8"
const COLOR_SCRAP = "#8d6e63"

const HOPPER_RADIUS = 4
const ARM_RING_RADIUS = 7.5

function colorForKind(kind: Task["kind"]): string {
  if (kind === "clear") return COLOR_CLEAR
  if (kind === "transient") return COLOR_TRANSIENT
  return COLOR_POISON
}

function angleOnRing(index: number, total: number): number {
  if (total <= 1) return 0
  return (index / total) * Math.PI * 2
}

/** Three.js projection of the forge state. Render-only — all rules live in src/sim + src/game. */
export class ForgeScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private readonly root = new THREE.Group()
  private readonly hopperGroup = new THREE.Group()
  private readonly armsGroup = new THREE.Group()
  private readonly rackGroup = new THREE.Group()
  private readonly scrapGroup = new THREE.Group()
  private ingotMeshes = new Map<string, THREE.Mesh>()
  private armMeshes: THREE.Mesh[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private hopperFullPulse = 0
  onIngotClick: ((ingotId: string) => void) | null = null
  onClassifyRetry: (() => void) | null = null
  onClassifyDlq: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 20, 50)

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(0, 9, 16)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 36
    this.controls.minDistance = 8
    this.controls.target.set(0, 1, 0)

    this.scene.add(this.root)
    this.root.add(this.hopperGroup, this.armsGroup, this.rackGroup, this.scrapGroup)

    this.buildForge()
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.65))
    const key = new THREE.DirectionalLight("#ffffff", 1.1)
    key.position.set(8, 14, 8)
    this.scene.add(key)
    const fill = new THREE.PointLight("#4fc3f7", 0.5, 40)
    fill.position.set(-6, 6, -4)
    this.scene.add(fill)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.animateArms()
      this.animateHopper()
      this.renderer.render(this.scene, this.camera)
    })
  }

  private buildForge(): void {
    // Hopper base — a wide, shallow cylinder where queued ingots sit.
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(HOPPER_RADIUS + 0.6, HOPPER_RADIUS + 1.1, 0.6, 48),
      new THREE.MeshStandardMaterial({ color: "#1a2030", flatShading: true }),
    )
    base.position.y = -0.3
    this.hopperGroup.add(base)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(HOPPER_RADIUS + 0.6, 0.08, 8, 64),
      new THREE.MeshStandardMaterial({
        color: "#3d4663",
        emissive: "#3d4663",
        emissiveIntensity: 0.3,
      }),
    )
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.02
    this.hopperGroup.add(rim)

    // Forge arms (workers) — tall pylons around the hopper.
    this.armMeshes = []
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Group()
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 4.2, 12),
        new THREE.MeshStandardMaterial({ color: "#2a3450", metalness: 0.4, roughness: 0.6 }),
      )
      pylon.position.y = 2.1
      arm.add(pylon)
      const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({
          color: "#4fc3f7",
          emissive: "#4fc3f7",
          emissiveIntensity: 0.4,
        }),
      )
      head.position.y = 4.2
      arm.add(head)
      const angle = (i / 3) * Math.PI * 2
      arm.position.set(Math.cos(angle) * ARM_RING_RADIUS, 0, Math.sin(angle) * ARM_RING_RADIUS)
      arm.userData = { headMesh: head, baseAngle: angle }
      this.armsGroup.add(arm)
      this.armMeshes.push(pylon)
    }

    // Annealing rack (retry/backoff) — purple bay to the west.
    const rackBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.4, 1.6),
      new THREE.MeshStandardMaterial({ color: "#221a30", flatShading: true }),
    )
    rackBase.position.set(-9.5, 0.2, -3)
    this.rackGroup.add(rackBase)
    const rackPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8),
      new THREE.MeshStandardMaterial({
        color: COLOR_RETRY_RACK,
        emissive: COLOR_RETRY_RACK,
        emissiveIntensity: 0.6,
      }),
    )
    rackPost.position.set(-9.5, 1.0, -3)
    this.rackGroup.add(rackPost)
    this.rackGroup.userData = { rackBasePosition: new THREE.Vector3(-9.5, 0.5, -3) }

    // Scrap chute (DLQ) — brown bay to the east.
    const scrapBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.6, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: "#2a1f1a", flatShading: true }),
    )
    scrapBase.position.set(9.5, 0.2, -3)
    this.scrapGroup.add(scrapBase)
    const scrapPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8),
      new THREE.MeshStandardMaterial({
        color: COLOR_SCRAP,
        emissive: COLOR_SCRAP,
        emissiveIntensity: 0.5,
      }),
    )
    scrapPost.position.set(9.5, 1.0, -3)
    this.scrapGroup.add(scrapPost)
    this.scrapGroup.userData = { scrapBasePosition: new THREE.Vector3(9.5, 0.6, -3) }

    // Floor grid for spatial reference.
    const grid = new THREE.GridHelper(40, 40, "#1a2030", "#141925")
    grid.position.y = -0.6
    this.scene.add(grid)
  }

  private resize(): void {
    const el = this.renderer.domElement
    const w = el.clientWidth || el.parentElement?.clientWidth || 800
    const h = el.clientHeight || el.parentElement?.clientHeight || 600
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const ingotHits = this.raycaster.intersectObjects([...this.ingotMeshes.values()])
    const firstIngot = ingotHits[0]
    if (firstIngot && this.onIngotClick) {
      const id = (firstIngot.object.userData as { ingotId?: string }).ingotId
      if (id) {
        this.onIngotClick(id)
        return
      }
    }
    // Click on the rack = route retry; click on the scrap = route dlq.
    const rackHits = this.raycaster.intersectObjects(this.rackGroup.children, true)
    if (rackHits.length > 0 && this.onClassifyRetry) {
      this.onClassifyRetry()
      return
    }
    const scrapHits = this.raycaster.intersectObjects(this.scrapGroup.children, true)
    if (scrapHits.length > 0 && this.onClassifyDlq) {
      this.onClassifyDlq()
    }
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncIngots(state)
    this.syncArmHeads(state)
    this.hopperFullPulse = state.lastBackpressure === "full" ? 1 : 0
  }

  private syncArmHeads(state: GameState): void {
    // Map running tasks to arms by index — head glows when busy.
    const running = state.tasks.filter((t) => t.status === "running")
    const needsClassify = state.tasks.filter((t) => t.status === "needs-classify")
    this.armsGroup.children.forEach((arm, i) => {
      const head = (arm.userData as { headMesh?: THREE.Mesh }).headMesh
      if (!head) return
      const busy = i < running.length + needsClassify.length
      const mat = head.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = busy ? 1.2 : 0.3
      arm.scale.setY(busy ? 1.05 : 1.0)
    })
  }

  private syncIngots(state: GameState): void {
    const wanted = new Set(state.tasks.map((t) => t.id))
    for (const [id, mesh] of this.ingotMeshes) {
      if (!wanted.has(id)) {
        this.root.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        this.ingotMeshes.delete(id)
      }
    }

    // Bucket tasks by status for layout.
    const queued = state.tasks.filter((t) => t.status === "queued")
    const retrying = state.tasks.filter((t) => t.status === "retrying")
    const running = state.tasks.filter((t) => t.status === "running")
    const needsClassify = state.tasks.filter((t) => t.status === "needs-classify")
    const done = state.tasks.filter((t) => t.status === "done")
    const dlq = state.tasks.filter((t) => t.status === "dlq")

    queued.forEach((task, i) => {
      this.placeIngot(task, this.hopperSlot(i, queued.length), 0.6)
    })
    retrying.forEach((task, i) => {
      this.placeIngot(task, this.rackSlot(i, retrying.length, state.cursor), 0.6)
    })
    running.forEach((task, i) => {
      this.placeIngot(task, this.armSlot(i), 1.2)
    })
    needsClassify.forEach((task, i) => {
      this.placeIngot(task, this.armSlot(i + running.length, true), 1.6)
    })
    done.forEach((task, i) => {
      this.placeIngot(task, this.doneSlot(i, done.length), 0.4)
    })
    dlq.forEach((task, i) => {
      this.placeIngot(task, this.scrapSlot(i, dlq.length), 0.5)
    })
  }

  private placeIngot(task: Task, pos: THREE.Vector3, scale: number): void {
    let mesh = this.ingotMeshes.get(task.id)
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ flatShading: true }),
      )
      mesh.userData = { ingotId: task.id }
      this.root.add(mesh)
      this.ingotMeshes.set(task.id, mesh)
    }
    mesh.position.copy(pos)
    mesh.scale.setScalar(scale)
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (task.status === "retrying") {
      mat.color = new THREE.Color(COLOR_RETRY_RACK)
      mat.emissive = new THREE.Color(COLOR_TRANSIENT)
      mat.emissiveIntensity = 0.5
    } else if (task.status === "dlq") {
      mat.color = new THREE.Color(COLOR_SCRAP)
      mat.emissive = new THREE.Color(COLOR_POISON)
      mat.emissiveIntensity = 0.3
    } else if (task.status === "done") {
      mat.color = new THREE.Color(COLOR_DONE)
      mat.emissive = new THREE.Color(COLOR_DONE)
      mat.emissiveIntensity = 0.4
    } else {
      mat.color = new THREE.Color(colorForKind(task.kind))
      // brightness scales with priority for "next-dispatch" readability
      const heat = Math.min(1, task.priority / 9)
      mat.emissive = new THREE.Color(colorForKind(task.kind))
      mat.emissiveIntensity = 0.3 + heat * 0.7
    }
  }

  private hopperSlot(index: number, total: number): THREE.Vector3 {
    const angle = angleOnRing(index, Math.max(total, 4))
    const r = total <= 1 ? 0 : HOPPER_RADIUS * 0.6
    return new THREE.Vector3(Math.cos(angle) * r, 0.6, Math.sin(angle) * r)
  }

  private armSlot(index: number, hover = false): THREE.Vector3 {
    const arm = this.armsGroup.children[index % 3]
    if (!arm) return new THREE.Vector3(0, 1, 0)
    const angle = (arm.userData as { baseAngle: number }).baseAngle
    const r = ARM_RING_RADIUS - 1.4
    return new THREE.Vector3(Math.cos(angle) * r, hover ? 2.4 : 1.5, Math.sin(angle) * r)
  }

  private rackSlot(index: number, total: number, _now: number): THREE.Vector3 {
    const base = (this.rackGroup.userData as { rackBasePosition: THREE.Vector3 }).rackBasePosition
    const offset = total <= 1 ? 0 : (index - (total - 1) / 2) * 0.7
    return new THREE.Vector3(base.x + offset, 0.7, base.z)
  }

  private scrapSlot(index: number, total: number): THREE.Vector3 {
    const base = (this.scrapGroup.userData as { scrapBasePosition: THREE.Vector3 })
      .scrapBasePosition
    const angle = total <= 1 ? 0 : (index / total) * Math.PI * 2
    const r = 0.5
    return new THREE.Vector3(base.x + Math.cos(angle) * r, base.y, base.z + Math.sin(angle) * r)
  }

  private doneSlot(index: number, total: number): THREE.Vector3 {
    const angle = total <= 1 ? Math.PI / 4 : (index / total) * Math.PI - Math.PI / 2
    return new THREE.Vector3(Math.cos(angle) * 6.5, 0.4, 6 + Math.sin(angle) * 1.5)
  }

  private animateArms(): void {
    const t = performance.now() * 0.001
    this.armsGroup.children.forEach((arm, i) => {
      const head = (arm.userData as { headMesh?: THREE.Mesh }).headMesh
      if (!head) return
      head.rotation.y = t * (0.6 + i * 0.1)
      head.position.y = 4.2 + Math.sin(t * 1.5 + i) * 0.1
    })
  }

  private animateHopper(): void {
    const rim = this.hopperGroup.children[1]
    if (!rim) return
    const mat = (rim as THREE.Mesh).material as THREE.MeshStandardMaterial
    if (this.hopperFullPulse > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.006)
      mat.emissive = new THREE.Color("#ef5350")
      mat.emissiveIntensity = 0.4 + pulse * 0.6
    } else {
      mat.emissive = new THREE.Color("#3d4663")
      mat.emissiveIntensity = 0.3
    }
  }
}
