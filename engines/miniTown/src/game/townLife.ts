export const ZONE_TYPES = ["residential", "shop", "workspace"] as const
export type ZoneType = (typeof ZONE_TYPES)[number]
export type ConstructionStage = "plot" | "foundation" | "frame" | "roofed" | "inhabited"
export type Activity = "at home" | "walking to work" | "working" | "serving neighbors" | "resting"
export type Cell = { readonly x: number; readonly y: number }
export type Road = {
  readonly id: string
  readonly cell: Cell
  readonly edge: "north" | "east" | "south" | "west"
}
export type Building = {
  readonly id: string
  readonly type: ZoneType
  readonly cell: Cell
  readonly paletteSeed: number
  stage: ConstructionStage
  stageSeconds: number
}
export type Block = { readonly id: string; readonly type: ZoneType; readonly buildings: Building[] }
export type Person = {
  readonly id: string
  readonly homeId: string
  readonly colorSeed: number
  activity: Activity
  stride: number
}
export type Vehicle = {
  readonly id: string
  readonly blockId: string
  readonly colorSeed: number
  progress: number
}
export type PlaceResult =
  | { readonly kind: "placed"; readonly block: Block }
  | { readonly kind: "occupied" }
const EDGES = [
  { edge: "north", x: 0, y: -1 },
  { edge: "east", x: 1, y: 0 },
  { edge: "south", x: 0, y: 1 },
  { edge: "west", x: -1, y: 0 },
] as const
function next(stage: ConstructionStage): ConstructionStage {
  switch (stage) {
    case "plot":
      return "foundation"
    case "foundation":
      return "frame"
    case "frame":
      return "roofed"
    case "roofed":
      return "inhabited"
    case "inhabited":
      return "inhabited"
  }
}
function activity(type: ZoneType, hour: number): Activity {
  switch (type) {
    case "residential":
      return hour >= 8 && hour < 18 ? "walking to work" : "at home"
    case "shop":
      return hour >= 9 && hour < 19 ? "serving neighbors" : "resting"
    case "workspace":
      return hour >= 8 && hour < 17 ? "working" : "resting"
  }
}
/** Shared block-footprint math: drag rectangle → row/column of up to 3 cells. */
export function blockSpan(
  start: Cell,
  end: Cell,
): { horizontal: boolean; length: number; anchor: Cell } {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y),
    length = Math.min(3, (horizontal ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y)) + 1),
    anchor = horizontal
      ? { x: Math.min(start.x, end.x), y: start.y }
      : { x: start.x, y: Math.min(start.y, end.y) }
  return { horizontal, length, anchor }
}
/** Cozy-town state kept independent from the renderer. */
export class TownLife {
  readonly blocks: Block[] = []
  readonly roads: Road[] = []
  readonly people: Person[] = []
  readonly vehicles: Vehicle[] = []
  /** Bumped whenever static geometry (blocks, roads, stages) changes; renderers compare it. */
  revision = 0
  #idNumber = 0
  place(type: ZoneType, start: Cell, end: Cell): PlaceResult {
    const cells = this.#cells(start, end)
    if (cells.some((cell) => Math.abs(cell.x) > 8 || Math.abs(cell.y) > 8 || this.#occupied(cell)))
      return { kind: "occupied" }
    const block: Block = {
      id: this.#id("block"),
      type,
      buildings: cells.map((cell) => ({
        id: this.#id("building"),
        type,
        cell,
        paletteSeed: this.#idNumber * 47,
        stage: "plot",
        stageSeconds: 0,
      })),
    }
    this.blocks.push(block)
    this.roads.push(...this.#roads(block))
    this.revision += 1
    return { kind: "placed", block }
  }
  tick(seconds: number, hour: number): void {
    for (const block of this.blocks) {
      for (const building of block.buildings) {
        building.stageSeconds += seconds
        while (building.stage !== "inhabited" && building.stageSeconds >= 4) {
          building.stageSeconds -= 4
          building.stage = next(building.stage)
          this.revision += 1
        }
      }
      if (
        block.buildings.every((building) => building.stage === "inhabited") &&
        !this.people.some((person) => person.homeId === block.id)
      ) {
        const count =
          block.type === "residential" ? block.buildings.length * 2 : block.buildings.length
        for (let index = 0; index < count; index++)
          this.people.push({
            id: this.#id("person"),
            homeId: block.id,
            colorSeed: this.#idNumber * 71,
            activity: "at home",
            stride: index / count,
          })
        this.vehicles.push({
          id: this.#id("car"),
          blockId: block.id,
          colorSeed: this.#idNumber * 97,
          progress: 0,
        })
      }
      for (const person of this.people)
        if (person.homeId === block.id) person.activity = activity(block.type, hour)
    }
    for (const vehicle of this.vehicles) vehicle.progress = (vehicle.progress + seconds * 0.08) % 1
  }
  #roads(block: Block): Road[] {
    const cells = block.buildings.map((building) => building.cell)
    return cells.flatMap((cell) =>
      EDGES.filter(
        (edge) =>
          !cells.some(
            (neighbor) => neighbor.x === cell.x + edge.x && neighbor.y === cell.y + edge.y,
          ),
      ).map((edge) => ({ id: this.#id("road"), cell, edge: edge.edge })),
    )
  }
  #cells(start: Cell, end: Cell): readonly Cell[] {
    const { horizontal, length, anchor } = blockSpan(start, end)
    return Array.from({ length }, (_, index) =>
      horizontal ? { x: anchor.x + index, y: anchor.y } : { x: anchor.x, y: anchor.y + index },
    )
  }
  #occupied(cell: Cell): boolean {
    return this.blocks.some((block) =>
      block.buildings.some((building) => building.cell.x === cell.x && building.cell.y === cell.y),
    )
  }
  #id(prefix: string): string {
    this.#idNumber += 1
    return `${prefix}-${this.#idNumber.toString(36)}`
  }
}
