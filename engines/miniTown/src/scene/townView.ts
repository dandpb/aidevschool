import * as THREE from "three"
import {
  type Block,
  type Building,
  blockSpan,
  type Cell,
  type Road,
  type TownLife,
  type ZoneType,
} from "../game/townLife"
import type { DayPhase } from "./dayNight"
import { disposeTree } from "./dispose"

type Callbacks = {
  onPlace: (type: ZoneType, start: Cell, end: Cell) => void
  onHover: (blockId: string | null) => void
}
const WALLS = ["#f3d7a8", "#d7e2d7", "#ead5c9"] as const
const ROOFS = ["#bc684f", "#4b7669", "#597ca1"] as const
const ACCENTS = ["#e88862", "#efc767", "#62a0ad", "#7ca971"] as const

/** Rendering and pointer picking only; TownLife remains the canonical simulation. */
export class TownView {
  readonly group = new THREE.Group()
  #static = new THREE.Group()
  #moving = new THREE.Group()
  #picker = new THREE.Raycaster()
  #pointer = new THREE.Vector2()
  #ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  #selection = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.12, 1)),
    new THREE.LineBasicMaterial({ color: "#fff1ad" }),
  )
  #targets = new Map<THREE.Object3D, string>()
  #warm: THREE.MeshStandardMaterial[] = []
  #lamps: THREE.PointLight[] = []
  #people = new Map<string, THREE.Group>()
  #vehicles = new Map<string, THREE.Group>()
  #blockById = new Map<string, Block>()
  #builtRev = -1
  #tool: ZoneType | null = null
  #dragStart: Cell | null = null
  constructor(
    private readonly camera: THREE.Camera,
    private readonly canvas: HTMLCanvasElement,
    private readonly on: Callbacks,
  ) {
    this.group.add(this.#static, this.#moving, this.#ground, this.#selection)
    this.#ground.rotation.x = -Math.PI / 2
    this.#ground.position.y = 0.03
    this.#selection.visible = false
    canvas.addEventListener("pointerdown", this.#onPointerDown)
    canvas.addEventListener("pointermove", this.#onPointerMove)
    canvas.addEventListener("pointerup", this.#onPointerUp)
    canvas.addEventListener("pointerleave", this.#onPointerLeave)
  }
  setTool(tool: ZoneType | null): void {
    this.#tool = tool
    this.#selection.visible = false
  }
  sync(life: TownLife, phase: DayPhase): void {
    if (life.revision !== this.#builtRev) {
      this.#builtRev = life.revision
      this.#blockById = new Map(life.blocks.map((block) => [block.id, block]))
      this.#rebuild(life)
    }
    const glow = phase === "night" || phase === "dusk" ? 1.3 : phase === "sunset" ? 0.35 : 0
    for (const material of this.#warm) material.emissiveIntensity = glow
    for (const lamp of this.#lamps) lamp.intensity = glow * 1.9
    this.#movePeople(life, phase)
    this.#moveVehicles(life)
  }
  #rebuild(life: TownLife): void {
    disposeTree(this.#static)
    this.#static.clear()
    this.#targets.clear()
    this.#warm = []
    this.#lamps = []
    const roadsByCell = new Map<string, Road[]>()
    for (const road of life.roads) {
      const key = `${road.cell.x},${road.cell.y}`,
        list = roadsByCell.get(key)
      if (list) list.push(road)
      else roadsByCell.set(key, [road])
    }
    for (const block of life.blocks) {
      for (const building of block.buildings) {
        this.#static.add(this.#building(block, building))
        for (const road of roadsByCell.get(`${building.cell.x},${building.cell.y}`) ?? [])
          this.#static.add(this.#road(road.cell, road.edge))
      }
      if (block.buildings.every((building) => building.stage === "inhabited")) this.#addLamp(block)
    }
  }
  #building(block: Block, building: Building): THREE.Group {
    const group = new THREE.Group()
    group.position.set(building.cell.x, 0, building.cell.y)
    group.add(box(0.84, 0.06, 0.84, "#916e4d", 0.03))
    if (building.stage !== "plot") group.add(box(0.76, 0.12, 0.76, "#d5c9b7", 0.08))
    if (building.stage === "plot") {
      for (const [x, z] of [
        [-0.34, -0.34],
        [0.34, -0.34],
        [0.34, 0.34],
        [-0.34, 0.34],
      ])
        group.add(box(0.04, 0.34, 0.04, "#8b613f", 0.22, x, z))
      return group
    }
    if (building.stage === "foundation") return group
    const wall = new THREE.MeshStandardMaterial({
        color: colorAt(WALLS, building.paletteSeed),
        roughness: 0.92,
      }),
      roof = new THREE.MeshStandardMaterial({
        color: colorAt(ROOFS, building.paletteSeed),
        roughness: 0.85,
      }),
      warm = new THREE.MeshStandardMaterial({
        color: "#ffd878",
        emissive: "#ff9e3d",
        emissiveIntensity: 0,
      }),
      height = block.type === "workspace" ? 0.92 : 0.62
    group.add(box(0.72, height, 0.72, wall, height / 2))
    if (building.stage === "frame") return group
    if (block.type === "residential") group.add(roofShape(roof, height + 0.34))
    if (block.type === "shop") {
      group.add(box(0.81, 0.12, 0.78, roof, height + 0.07))
      group.add(awning(colorAt(ACCENTS, building.paletteSeed), height * 0.62))
    }
    if (block.type === "workspace") {
      group.add(box(0.82, 0.12, 0.82, roof, height + 0.07))
      group.add(box(0.52, 0.31, 0.02, warm, height * 0.57, 0.371))
    }
    if (block.type !== "workspace") group.add(box(0.2, 0.22, 0.025, warm, height * 0.55, 0.371))
    this.#warm.push(warm)
    this.#targets.set(group, block.id)
    return group
  }
  #road(cell: Cell, edge: "north" | "east" | "south" | "west"): THREE.Mesh {
    const horizontal = edge === "north" || edge === "south",
      road = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? 1.18 : 0.18, 0.035, horizontal ? 0.18 : 1.18),
        new THREE.MeshStandardMaterial({ color: "#e4d5bb", roughness: 1 }),
      ),
      offset = 0.59
    if (edge === "north") road.position.set(cell.x, 0.02, cell.y - offset)
    if (edge === "east") road.position.set(cell.x + offset, 0.02, cell.y)
    if (edge === "south") road.position.set(cell.x, 0.02, cell.y + offset)
    if (edge === "west") road.position.set(cell.x - offset, 0.02, cell.y)
    return road
  }
  #addLamp(block: Block): void {
    const home = block.buildings[0]
    if (!home) return
    const lamp = new THREE.PointLight("#ffbd68", 0, 4, 2)
    lamp.position.set(home.cell.x - 0.58, 0.55, home.cell.y - 0.58)
    this.#static.add(
      lamp,
      box(0.05, 0.65, 0.05, "#40535b", 0.33, home.cell.x - 0.58, home.cell.y - 0.58),
    )
    this.#lamps.push(lamp)
  }
  #movePeople(life: TownLife, phase: DayPhase): void {
    const now = performance.now() * 0.001
    for (const person of life.people) {
      const block = this.#blockById.get(person.homeId)
      if (!block) continue
      let mesh = this.#people.get(person.id)
      if (!mesh) {
        mesh = personShape(colorAt(ACCENTS, person.colorSeed))
        this.#people.set(person.id, mesh)
        this.#moving.add(mesh)
      }
      const home = block.buildings[person.colorSeed % block.buildings.length]
      if (!home) continue
      const moving =
          person.activity === "walking to work" || person.activity === "serving neighbors",
        angle = (now + person.stride * 6) % (Math.PI * 2)
      mesh.position.set(
        home.cell.x + (moving ? Math.cos(angle) * 0.64 : 0.17),
        0.18,
        home.cell.y + (moving ? Math.sin(angle) * 0.64 : 0.18),
      )
      mesh.rotation.y = angle
      mesh.visible = phase !== "night" || person.activity === "at home"
    }
  }
  #moveVehicles(life: TownLife): void {
    for (const vehicle of life.vehicles) {
      const block = this.#blockById.get(vehicle.blockId),
        home = block?.buildings[0]
      if (!home) continue
      let mesh = this.#vehicles.get(vehicle.id)
      if (!mesh) {
        mesh = carShape(colorAt(ACCENTS, vehicle.colorSeed))
        this.#vehicles.set(vehicle.id, mesh)
        this.#moving.add(mesh)
      }
      const angle = vehicle.progress * Math.PI * 2
      mesh.position.set(
        home.cell.x + Math.cos(angle) * 0.94,
        0.12,
        home.cell.y + Math.sin(angle) * 0.94,
      )
      mesh.rotation.y = -angle
    }
  }
  #cell(event: PointerEvent): Cell | null {
    const rect = this.canvas.getBoundingClientRect()
    this.#pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.#picker.setFromCamera(this.#pointer, this.camera)
    const hit = this.#picker.intersectObject(this.#ground)[0]
    return hit ? { x: Math.round(hit.point.x), y: Math.round(hit.point.z) } : null
  }
  #onPointerDown = (event: PointerEvent): void => {
    if (!this.#tool) return
    const cell = this.#cell(event)
    if (cell) this.#dragStart = cell
  }
  #onPointerMove = (event: PointerEvent): void => {
    const cell = this.#cell(event)
    if (!cell) return
    if (this.#tool && this.#dragStart) this.#showSelection(this.#dragStart, cell)
    else this.#pickHover()
  }
  #onPointerUp = (event: PointerEvent): void => {
    if (!this.#tool || !this.#dragStart) return
    this.on.onPlace(this.#tool, this.#dragStart, this.#cell(event) ?? this.#dragStart)
    this.#dragStart = null
    this.#selection.visible = false
  }
  #onPointerLeave = (): void => {
    this.#dragStart = null
    this.#selection.visible = false
    this.on.onHover(null)
  }
  #pickHover(): void {
    this.#picker.setFromCamera(this.#pointer, this.camera)
    const hit = this.#picker.intersectObjects(this.#static.children, true)[0]
    let object = hit?.object
    while (object) {
      const block = this.#targets.get(object)
      if (block) {
        this.on.onHover(block)
        return
      }
      object = object.parent ?? undefined
    }
    this.on.onHover(null)
  }
  #showSelection(start: Cell, end: Cell): void {
    const { horizontal, length, anchor } = blockSpan(start, end),
      x = horizontal ? anchor.x + (length - 1) / 2 : anchor.x,
      z = horizontal ? anchor.y : anchor.y + (length - 1) / 2
    this.#selection.scale.set(horizontal ? length : 1, 1, horizontal ? 1 : length)
    this.#selection.position.set(x, 0.15, z)
    this.#selection.visible = true
  }
}
function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material | string,
  y: number,
  x = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    typeof material === "string"
      ? new THREE.MeshStandardMaterial({ color: material, roughness: 0.9 })
      : material,
  )
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
function roofShape(material: THREE.Material, y: number): THREE.Mesh {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.48, 4), material)
  roof.position.y = y
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  return roof
}
function awning(color: string, y: number): THREE.Group {
  const group = new THREE.Group()
  for (let index = -1; index <= 1; index++)
    group.add(box(0.19, 0.08, 0.13, index % 2 ? "#fff0d5" : color, y, index * 0.19, 0.43))
  return group
}
function personShape(color: string): THREE.Group {
  const group = new THREE.Group()
  group.add(box(0.14, 0.24, 0.11, color, 0.22))
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 6, 5),
    new THREE.MeshStandardMaterial({ color: "#f1c3a2", roughness: 1 }),
  )
  head.position.y = 0.4
  group.add(head)
  return group
}
function carShape(color: string): THREE.Group {
  const group = new THREE.Group()
  group.add(box(0.42, 0.15, 0.24, color, 0.14))
  group.add(box(0.24, 0.12, 0.22, "#cce6e8", 0.26, -0.04))
  return group
}
function colorAt(colors: readonly string[], seed: number): string {
  return colors[Math.abs(seed) % colors.length] ?? "#f3d7a8"
}
