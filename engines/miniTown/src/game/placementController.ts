/**
 * Click-and-drag zone placement. Captures pointer events on the renderer's
 * canvas, raycasts against an invisible ground plane, and:
 *
 *   • click (no movement) → place a single 1×1 zone of the active type
 *   • drag (movement ≥ ~half a cell) → place a 1×N line of zones along the
 *     dominant axis (capped at 3 cells)
 *
 * The active zone type is selectable via `setZoneType`. The preview overlay
 * is a translucent green plane that tracks the drag in real time. All
 * placement goes through `Town.placeZone`, which validates the cells are
 * grass and triggers the road recompute.
 *
 * The controller's rAF loop re-renders the scene every frame, so the
 * preview, the placed zones, and the new roads all appear without any extra
 * tick call.
 */

import * as THREE from "three"
import { TILES } from "../sim/grid"
import { ZONE_TYPES, type ZoneType } from "../sim/zones"
import type { TownController } from "./controller"

const HALF = TILES / 2
const MAX_BLOCK_LENGTH = 3

export class PlacementController {
  readonly #controller: TownController
  #selectedType: ZoneType = "residential"
  #dragging = false
  #startCell: { readonly x: number; readonly y: number } | null = null
  #currentCell: { readonly x: number; readonly y: number } | null = null
  #pointerId: number | null = null
  readonly #raycaster = new THREE.Raycaster()
  readonly #pointer = new THREE.Vector2()
  readonly #groundPlane: THREE.Mesh
  readonly #preview: THREE.Mesh
  readonly #previewMaterial: THREE.MeshBasicMaterial
  readonly #unsubscribe: () => void
  #disposed = false

  constructor(controller: TownController) {
    this.#controller = controller

    // Invisible ground plane for raycasting. `visible: false` would skip
    // raycasts, so we use `material.transparent + opacity: 0`.
    const planeGeo = new THREE.PlaneGeometry(TILES, TILES)
    const planeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    this.#groundPlane = new THREE.Mesh(planeGeo, planeMat)
    this.#groundPlane.rotation.x = -Math.PI / 2
    this.#groundPlane.position.y = 0.01
    this.#groundPlane.name = "placement-ground"
    controller.sceneRoot.scene.add(this.#groundPlane)

    // Translucent green preview plane.
    const previewGeo = new THREE.PlaneGeometry(1, 1)
    this.#previewMaterial = new THREE.MeshBasicMaterial({
      color: 0x3da55a,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
    this.#preview = new THREE.Mesh(previewGeo, this.#previewMaterial)
    this.#preview.rotation.x = -Math.PI / 2
    this.#preview.position.y = 0.05
    this.#preview.visible = false
    controller.sceneRoot.scene.add(this.#preview)

    const dom = controller.sceneRoot.renderer.domElement
    dom.addEventListener("pointerdown", this.#onPointerDown)
    dom.addEventListener("pointermove", this.#onPointerMove)
    dom.addEventListener("pointerup", this.#onPointerUp)
    dom.addEventListener("pointercancel", this.#onPointerUp)

    this.#unsubscribe = () => {
      dom.removeEventListener("pointerdown", this.#onPointerDown)
      dom.removeEventListener("pointermove", this.#onPointerMove)
      dom.removeEventListener("pointerup", this.#onPointerUp)
      dom.removeEventListener("pointercancel", this.#onPointerUp)
    }
  }

  setZoneType(type: ZoneType): void {
    if (ZONE_TYPES.includes(type)) this.#selectedType = type
  }

  getZoneType(): ZoneType {
    return this.#selectedType
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    const cell = this.#cellAtPointer(e)
    if (!cell) return
    this.#dragging = true
    this.#startCell = cell
    this.#currentCell = cell
    this.#pointerId = e.pointerId
    try {
      this.#controller.sceneRoot.renderer.domElement.setPointerCapture(e.pointerId)
    } catch {
      // setPointerCapture can throw if the pointer is already released.
    }
    this.#updatePreview()
    e.preventDefault()
  }

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#dragging) return
    const cell = this.#cellAtPointer(e)
    if (!cell) return
    this.#currentCell = cell
    this.#updatePreview()
  }

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#dragging) return
    this.#dragging = false
    const start = this.#startCell
    const end = this.#currentCell
    this.#startCell = null
    this.#currentCell = null
    this.#preview.visible = false
    const dom = this.#controller.sceneRoot.renderer.domElement
    if (this.#pointerId !== null && dom.hasPointerCapture(this.#pointerId)) {
      dom.releasePointerCapture(this.#pointerId)
    }
    this.#pointerId = null
    if (!start || !end) return
    this.#commitDrag(start, end)
  }

  #cellAtPointer(e: PointerEvent): { x: number; y: number } | null {
    const dom = this.#controller.sceneRoot.renderer.domElement
    const rect = dom.getBoundingClientRect()
    this.#pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.#pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.#raycaster.setFromCamera(this.#pointer, this.#controller.cameraRig.camera)
    const hits = this.#raycaster.intersectObject(this.#groundPlane, false)
    const first = hits[0]
    if (!first) return null
    const wx = first.point.x
    const wz = first.point.z
    const x = Math.floor(wx + HALF)
    const y = Math.floor(wz + HALF)
    if (!this.#controller.town.grid.inBounds(x, y)) return null
    return { x, y }
  }

  #updatePreview(): void {
    if (!this.#startCell || !this.#currentCell) {
      this.#preview.visible = false
      return
    }
    const rect = this.#rectFromDrag(this.#startCell, this.#currentCell)
    const w = rect.x1 - rect.x0 + 1
    const h = rect.y1 - rect.y0 + 1
    this.#preview.visible = true
    this.#preview.scale.set(w, h, 1)
    this.#preview.position.set(
      rect.x0 - HALF + 0.5 + (w - 1) / 2,
      0.05,
      rect.y0 - HALF + 0.5 + (h - 1) / 2,
    )
  }

  /**
   * Build the placement rectangle from a drag's start/end. Axis = the longer
   * of |dx| / |dy|. Capped at 3 cells. The anchor is `start`; the rectangle
   * extends in the end direction (or the opposite if the user dragged
   * backwards).
   */
  #rectFromDrag(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): { x0: number; x1: number; y0: number; y1: number } {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (absX >= absY) {
      const length = Math.min(MAX_BLOCK_LENGTH, absX + 1)
      const x0 = dx >= 0 ? start.x : start.x - (length - 1)
      return { x0, x1: x0 + length - 1, y0: start.y, y1: start.y }
    }
    const length = Math.min(MAX_BLOCK_LENGTH, absY + 1)
    const y0 = dy >= 0 ? start.y : start.y - (length - 1)
    return { x0: start.x, x1: start.x, y0, y1: y0 + length - 1 }
  }

  #commitDrag(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const rect = this.#rectFromDrag(start, end)
    // Shared blockId so road-recompute treats the cells as one block.
    const blockId = `block-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x10000).toString(36)}`
    for (let y = rect.y0; y <= rect.y1; y++) {
      for (let x = rect.x0; x <= rect.x1; x++) {
        this.#controller.town.placeZone(this.#selectedType, x, y, blockId)
      }
    }
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#unsubscribe()
    this.#controller.sceneRoot.scene.remove(this.#groundPlane)
    this.#controller.sceneRoot.scene.remove(this.#preview)
    this.#groundPlane.geometry.dispose()
    disposeMaterial(this.#groundPlane.material)
    this.#preview.geometry.dispose()
    this.#previewMaterial.dispose()
  }
}

// `Mesh.material` is typed `Material | Material[]`; in our construction we
// always pass a single material, but the union is a TypeScript hazard. This
// local helper narrows and disposes.
function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) for (const x of material) x.dispose()
  else material.dispose()
}
