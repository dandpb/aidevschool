import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"
import type { Doc, ScoredDoc } from "../sim/index"

/**
 * Three.js projection of the inverted-index library.
 *
 * - **Shelves**: a row of labeled bookcase slots, one per term in the corpus (the keys of the
 *   inverted index). Each shelf holds the word-cards (postings) for that term.
 * - **Word-cards**: small flat planes filed on the shelf of their term, one per posting (docId
 *   label) — the physical posting list.
 * - **Query orb**: a glowing sphere at the front of the library. When the query fires, light-beam
 *   cylinders shoot from the orb to every shelf whose term is in the query.
 * - **Result books**: the documents that matched, shown as glowing book meshes behind the shelves,
 *   emissive brightness ∝ score, sorted left→right by rank.
 *
 * Renders only — all rules live in src/sim and src/game.
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

const SHELF_Y = 0
const SHELF_SPACING = 2.0
const SHELF_DEPTH = 1.2
const SHELF_W = 1.7
const SHELF_H = 1.5
const ORB_Z = 7
const BOOK_BASE_Y = -3.5

const BEAM_COLOR = new THREE.Color("#4fc3f7")
const BOOK_COLOR = new THREE.Color("#ffd54f")
const SHELF_COLOR = new THREE.Color("#3d4663")
const CARD_COLOR = new THREE.Color("#e6e9f2")

/** A reusable sprite-text label anchored in 3D (cheap — CanvasTexture plane, no font pipeline). */
function makeLabel(text: string, color = "#e6e9f2"): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = "bold 36px ui-monospace, Menlo, monospace"
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 8)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.0, 0.5, 1)
  return sprite
}

/** Caching label factory so the same text reuses one texture across renders. */
class LabelCache {
  private map = new Map<string, THREE.Sprite>()
  get(text: string, color?: string): THREE.Sprite {
    const key = `${text}|${color ?? ""}`
    let s = this.map.get(key)
    if (!s) {
      s = makeLabel(text, color)
      this.map.set(key, s)
    }
    return s.clone()
  }
}

export interface SceneView {
  /** terms in shelf order */
  shelves: string[]
  /** ranked docs (the result books) */
  ranking: ScoredDoc[]
  /** the level's query terms (which shelves get a beam) */
  queryTerms: string[]
  /** all docs in the corpus (for the book row) */
  docs: Doc[]
  /** current phase — beams render only once the query is firing/cleared */
  phase: GameState["phase"]
}

export class StacksScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private root = new THREE.Group()
  private shelfGroup = new THREE.Group()
  private cardGroup = new THREE.Group()
  private beamGroup = new THREE.Group()
  private bookGroup = new THREE.Group()
  private labelGroup = new THREE.Group()
  private orb!: THREE.Mesh
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private labels = new LabelCache()
  /** clickable targets: shelf sprites (term) and book meshes (docId). */
  private pickables: THREE.Object3D[] = []
  onShelfClick: ((term: string) => void) | null = null
  onBookClick: ((docId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 22, 60)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(0, 6, 18)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 50
    this.controls.minDistance = 8
    this.controls.target.set(0, 0, 0)

    this.scene.add(this.root)
    this.root.add(this.shelfGroup, this.cardGroup, this.beamGroup, this.bookGroup, this.labelGroup)

    // floor grid for spatial anchoring
    const grid = new THREE.GridHelper(50, 50, "#1c2236", "#141a2b")
    grid.position.y = BOOK_BASE_Y - 0.8
    this.scene.add(grid)
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.8))
    const key = new THREE.DirectionalLight("#ffffff", 1.0)
    key.position.set(6, 14, 8)
    this.scene.add(key)

    this.buildOrb()
    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    })
  }

  private buildOrb(): void {
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7),
      new THREE.MeshStandardMaterial({
        color: "#4fc3f7",
        emissive: "#4fc3f7",
        emissiveIntensity: 0.8,
        flatShading: true,
      }),
    )
    orb.position.set(0, 2.5, ORB_Z)
    orb.userData = { kind: "orb" }
    this.orb = orb
    this.root.add(orb)
    const label = this.labels.get("query")
    label.position.set(0, 3.8, ORB_Z)
    this.labelGroup.add(label)
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
    const hits = this.raycaster.intersectObjects(this.pickables, true)
    const first = hits[0]
    if (!first) return
    // walk up to find a tagged userData
    let obj: THREE.Object3D | null = first.object
    while (obj && !obj.userData?.kind) obj = obj.parent
    if (!obj) return
    const ud = obj.userData as { kind: string; term?: string; docId?: string }
    if (ud.kind === "shelf" && ud.term && this.onShelfClick) this.onShelfClick(ud.term)
    else if (ud.kind === "book" && ud.docId && this.onBookClick) this.onBookClick(ud.docId)
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    const view: SceneView = {
      shelves: state.shelves,
      ranking: state.ranking,
      queryTerms: state.queryTerms,
      docs: state.docs,
      phase: state.phase,
    }
    this.clearDynamic()
    this.pickables = []
    this.syncShelves(view)
    this.syncBooks(view)
    if (view.queryTerms.length > 0 && state.phase !== "briefing") this.syncBeams(view)
  }

  private clearDynamic(): void {
    for (const g of [
      this.shelfGroup,
      this.cardGroup,
      this.beamGroup,
      this.bookGroup,
      this.labelGroup,
    ])
      while (g.children.length) g.remove(g.children[0] as THREE.Object3D)
  }

  /** Lay shelves out in a centered horizontal row; each shelf gets a term label. */
  private shelfX(term: string, shelves: readonly string[]): number {
    const idx = shelves.indexOf(term)
    const span = shelves.length
    return (idx - (span - 1) / 2) * SHELF_SPACING
  }

  private syncShelves(view: SceneView): void {
    for (const term of view.shelves) {
      const x = this.shelfX(term, view.shelves)
      // shelf slab (a flat box)
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(SHELF_W, 0.1, SHELF_DEPTH),
        new THREE.MeshStandardMaterial({ color: SHELF_COLOR, flatShading: true }),
      )
      slab.position.set(x, SHELF_Y, 0)
      this.shelfGroup.add(slab)
      // two end-plates so it reads as a bookcase slot
      for (const sx of [-SHELF_W / 2, SHELF_W / 2]) {
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, SHELF_H, SHELF_DEPTH),
          new THREE.MeshStandardMaterial({ color: SHELF_COLOR, flatShading: true }),
        )
        plate.position.set(x + sx, SHELF_Y + SHELF_H / 2, 0)
        this.shelfGroup.add(plate)
      }
      // term label above the shelf
      const label = this.labels.get(term, "#4fc3f7")
      label.position.set(x, SHELF_Y + SHELF_H + 0.3, 0)
      this.labelGroup.add(label)

      // word-cards (postings) filed on this shelf — one per posting
      const postings = this.postingsFor(term, view)
      postings.forEach((docId, i) => {
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.45, 0.6),
          new THREE.MeshStandardMaterial({
            color: CARD_COLOR,
            emissive: "#1a2030",
            emissiveIntensity: 0.3,
            flatShading: true,
            side: THREE.DoubleSide,
          }),
        )
        const col = i % 3
        const row = Math.floor(i / 3)
        card.position.set(x + (col - 1) * 0.5, SHELF_Y + 0.45 + row * 0.7, 0.05)
        card.userData = { kind: "card", term, docId }
        this.cardGroup.add(card)
        const cardLabel = this.labels.get(docId, "#aab3cc")
        cardLabel.scale.set(0.7, 0.18, 1)
        cardLabel.position.copy(card.position)
        cardLabel.position.z += 0.03
        this.labelGroup.add(cardLabel)
      })

      // shelf is clickable for L1 filing
      const picker = new THREE.Mesh(
        new THREE.BoxGeometry(SHELF_W, SHELF_H, SHELF_DEPTH),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      picker.position.set(x, SHELF_Y + SHELF_H / 2, 0)
      picker.userData = { kind: "shelf", term }
      this.shelfGroup.add(picker)
      this.pickables.push(picker)
    }
  }

  /** The posting list (docIds) for a term, derived from the inverted index carried in the view. */
  private postingsFor(term: string, _view: SceneView): string[] {
    // We do not thread the index into the view to keep render pure; the controller exposes the
    // ranking but posting lists come from the live snapshot. We rebuild from docs to stay honest.
    // (Cheap at this corpus size.)
    return _view.docs.filter((d) => tokenizeKeep(d.text).includes(term)).map((d) => d.id)
  }

  private syncBeams(view: SceneView): void {
    const orbPos = this.orb.position.clone()
    for (const term of view.queryTerms) {
      const x = this.shelfX(term, view.shelves)
      const target = new THREE.Vector3(x, SHELF_Y + SHELF_H / 2, 0)
      const dir = new THREE.Vector3().subVectors(target, orbPos)
      const len = dir.length()
      if (len < 0.001) continue
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, len, 8),
        new THREE.MeshBasicMaterial({ color: BEAM_COLOR, transparent: true, opacity: 0.7 }),
      )
      // orient cylinder along dir
      beam.position.copy(orbPos).addScaledVector(dir, 0.5)
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
      this.beamGroup.add(beam)
    }
  }

  /** Result books: documents that matched, glowing brighter the higher the score, in rank order. */
  private syncBooks(view: SceneView): void {
    const ranked = view.ranking
    const maxScore = ranked.length > 0 ? Math.max(...ranked.map((r) => r.score)) : 1
    const span = Math.max(1, ranked.length)
    ranked.forEach((r, i) => {
      const x = (i - (span - 1) / 2) * 1.4
      const heat = maxScore > 0 ? r.score / maxScore : 0
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.1, 0.25),
        new THREE.MeshStandardMaterial({
          color: BOOK_COLOR,
          emissive: BOOK_COLOR,
          emissiveIntensity: 0.25 + heat * 0.95,
          flatShading: true,
        }),
      )
      book.position.set(x, BOOK_BASE_Y + 0.6, 0)
      book.scale.setScalar(0.85 + heat * 0.5)
      book.userData = { kind: "book", docId: r.docId }
      this.bookGroup.add(book)
      this.pickables.push(book)
      const rankLabel = this.labels.get(`${i + 1}. ${r.docId}`, "#ffd54f")
      rankLabel.scale.set(1.1, 0.28, 1)
      rankLabel.position.set(x, BOOK_BASE_Y + 1.5, 0)
      this.labelGroup.add(rankLabel)
    })
  }
}

/**
 * Local tokenizer mirror (lowercase + split on non-word). The scene only needs it to lay out
 * word-cards; the canonical implementation lives in src/sim/index.ts. Kept inline so the renderer
 * has zero coupling to the sim module's API surface beyond plain data.
 */
function tokenizeKeep(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}
