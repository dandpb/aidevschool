import * as THREE from "three"

const DEG = Math.PI / 180

/** Default starting view: ~35° pitch, 35 units from origin. */
const DEFAULT_AZIMUTH = 0
const DEFAULT_POLAR = 55 * DEG // angle from +Y down
const DEFAULT_DISTANCE = 35

const MIN_DISTANCE = 15
const MAX_DISTANCE = 60

const DAMPING = 0.12 // 0 = no smoothing, 1 = never moves
const DRAG_SENSITIVITY = 0.005
const ZOOM_SENSITIVITY = 0.0015

export interface CameraRigOptions {
  /** DOM element that receives pointer / wheel events. Defaults to canvas. */
  readonly domElement?: HTMLElement
  /** Override starting distance (clamped to range). */
  readonly distance?: number
  /** Override starting azimuth. */
  readonly azimuth?: number
  /** Override starting polar. */
  readonly polar?: number
}

/**
 * Orbit-style camera with damping. Mouse drag rotates azimuth/polar,
 * wheel zooms in/out within `[MIN_DISTANCE, MAX_DISTANCE]`.
 * Always looks at the world origin.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera

  #azimuth = DEFAULT_AZIMUTH
  #polar = DEFAULT_POLAR
  #distance = DEFAULT_DISTANCE

  #targetAzimuth = DEFAULT_AZIMUTH
  #targetPolar = DEFAULT_POLAR
  #targetDistance = DEFAULT_DISTANCE

  #domElement: HTMLElement
  #dragging = false
  #lastX = 0
  #lastY = 0

  constructor(domElement: HTMLElement, options: CameraRigOptions = {}) {
    this.#domElement = options.domElement ?? domElement
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)

    if (options.distance !== undefined) {
      this.#distance = clamp(options.distance, MIN_DISTANCE, MAX_DISTANCE)
      this.#targetDistance = this.#distance
    }
    if (options.azimuth !== undefined) {
      this.#azimuth = options.azimuth
      this.#targetAzimuth = options.azimuth
    }
    if (options.polar !== undefined) {
      this.#polar = clampPolar(options.polar)
      this.#targetPolar = this.#polar
    }

    this.#attach()
    this.apply()
  }

  /** Smoothly approach the target values. Call every frame from the main loop. */
  update(): void {
    this.#azimuth += (this.#targetAzimuth - this.#azimuth) * DAMPING
    this.#polar += (this.#targetPolar - this.#polar) * DAMPING
    this.#distance += (this.#targetDistance - this.#distance) * DAMPING
    this.apply()
  }

  /** Resize sync. Call from the host when the canvas dimensions change. */
  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
  }

  get distance(): number {
    return this.#distance
  }

  get azimuth(): number {
    return this.#azimuth
  }

  get polar(): number {
    return this.#polar
  }

  private apply(): void {
    const sinPolar = Math.sin(this.#polar)
    const x = this.#distance * sinPolar * Math.sin(this.#azimuth)
    const z = this.#distance * sinPolar * Math.cos(this.#azimuth)
    const y = this.#distance * Math.cos(this.#polar)
    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0)
  }

  #attach(): void {
    const el = this.#domElement
    el.addEventListener("pointerdown", this.#onPointerDown)
    el.addEventListener("pointermove", this.#onPointerMove)
    el.addEventListener("pointerup", this.#onPointerUp)
    el.addEventListener("pointercancel", this.#onPointerUp)
    el.addEventListener("pointerleave", this.#onPointerUp)
    el.addEventListener("wheel", this.#onWheel, { passive: false })
  }

  #onPointerDown = (e: PointerEvent): void => {
    this.#dragging = true
    this.#lastX = e.clientX
    this.#lastY = e.clientY
    this.#domElement.setPointerCapture(e.pointerId)
  }

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#dragging) return
    const dx = e.clientX - this.#lastX
    const dy = e.clientY - this.#lastY
    this.#lastX = e.clientX
    this.#lastY = e.clientY
    this.#targetAzimuth -= dx * DRAG_SENSITIVITY
    this.#targetPolar = clampPolar(this.#targetPolar - dy * DRAG_SENSITIVITY)
  }

  #onPointerUp = (e: PointerEvent): void => {
    if (!this.#dragging) return
    this.#dragging = false
    if (this.#domElement.hasPointerCapture(e.pointerId)) {
      this.#domElement.releasePointerCapture(e.pointerId)
    }
  }

  #onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const factor = 1 + e.deltaY * ZOOM_SENSITIVITY
    this.#targetDistance = clamp(this.#targetDistance * factor, MIN_DISTANCE, MAX_DISTANCE)
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** Clamp polar to (5°, 80°) so the camera never flips over or sits flat. */
function clampPolar(value: number): number {
  return clamp(value, 5 * DEG, 80 * DEG)
}
