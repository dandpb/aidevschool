/**
 * Shared Three.js viewport host for voxelDojo games.
 *
 * Owns renderer / camera / controls / fog / lights / resize / animation loop.
 * Scene classes keep only concept projection (sync meshes from sim state).
 */
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { ProjectionContextHooks } from "./projection"

export interface ViewportOptions extends ProjectionContextHooks {
  background?: string
  fogNear?: number
  fogFar?: number
  cameraPosition?: [number, number, number]
  controlsTarget?: [number, number, number]
  minDistance?: number
  maxDistance?: number
  ambientIntensity?: number
  keyIntensity?: number
  keyPosition?: [number, number, number]
  /**
   * Per-frame hook invoked after controls.update() and before renderer.render().
   * Scenes use this for custom animation (e.g. traveller streaks, bot movement).
   */
  onFrame?: () => void
}

export interface Viewport {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  resize: () => void
  pause: () => void
  resume: () => void
  dispose: () => void
  setPointerFromEvent: (e: PointerEvent) => void
}

const DEFAULTS: Required<
  Pick<
    ViewportOptions,
    | "background"
    | "fogNear"
    | "fogFar"
    | "cameraPosition"
    | "controlsTarget"
    | "minDistance"
    | "maxDistance"
    | "ambientIntensity"
    | "keyIntensity"
    | "keyPosition"
  >
> = {
  background: "#0b0e14",
  fogNear: 24,
  fogFar: 60,
  cameraPosition: [0, 14, 24],
  controlsTarget: [0, 0, 0],
  minDistance: 8,
  maxDistance: 60,
  ambientIntensity: 0.7,
  keyIntensity: 1.2,
  keyPosition: [8, 16, 8],
}

export function createViewport(
  canvas: HTMLCanvasElement,
  options: ViewportOptions = {},
): Viewport {
  const opts = { ...DEFAULTS, ...options }

  let paused = false
  let disposed = false
  const onContextLost = (event: Event): void => {
    event.preventDefault()
    paused = true
    opts.onContextLost?.()
  }
  const onContextRestored = (): void => {
    if (disposed) return
    paused = false
    opts.onContextRestored?.()
  }
  const onContextCreationError = (): void => opts.onContextCreationError?.()
  canvas.addEventListener("webglcontextlost", onContextLost)
  canvas.addEventListener("webglcontextrestored", onContextRestored)
  canvas.addEventListener("webglcontextcreationerror", onContextCreationError)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  } catch (error) {
    canvas.removeEventListener("webglcontextlost", onContextLost)
    canvas.removeEventListener("webglcontextrestored", onContextRestored)
    canvas.removeEventListener("webglcontextcreationerror", onContextCreationError)
    throw error
  }
  const devicePixelRatio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 1), 2))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(opts.background)
  scene.fog = new THREE.Fog(opts.background, opts.fogNear, opts.fogFar)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(...opts.cameraPosition)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.minDistance = opts.minDistance
  controls.maxDistance = opts.maxDistance
  controls.target.set(...opts.controlsTarget)

  scene.add(new THREE.AmbientLight("#ffffff", opts.ambientIntensity))
  const key = new THREE.DirectionalLight("#ffffff", opts.keyIntensity)
  key.position.set(...opts.keyPosition)
  scene.add(key)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const resize = (): void => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 800
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 600
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const onResize = (): void => resize()
  window.addEventListener("resize", onResize)
  resize()

  renderer.setAnimationLoop(() => {
    if (paused || disposed) return
    controls.update()
    opts.onFrame?.()
    renderer.render(scene, camera)
  })

  const pause = (): void => {
    paused = true
  }

  const resume = (): void => {
    if (!disposed) paused = false
  }

  const setPointerFromEvent = (e: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    window.removeEventListener("resize", onResize)
    canvas.removeEventListener("webglcontextlost", onContextLost)
    canvas.removeEventListener("webglcontextrestored", onContextRestored)
    canvas.removeEventListener("webglcontextcreationerror", onContextCreationError)
    renderer.setAnimationLoop(null)
    controls.dispose()
    renderer.dispose()
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    raycaster,
    pointer,
    resize,
    pause,
    resume,
    dispose,
    setPointerFromEvent,
  }
}
