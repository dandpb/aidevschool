import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

export interface ViewportOptions {
  background?: string
  fogNear?: number
  fogFar?: number
  cameraPosition?: [number, number, number]
  minDistance?: number
  maxDistance?: number
  ambientIntensity?: number
  keyIntensity?: number
  keyPosition?: [number, number, number]
}

export interface Viewport {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  resize: () => void
  dispose: () => void
  setPointerFromEvent: (e: PointerEvent) => void
}

const DEFAULTS: Required<ViewportOptions> = {
  background: "#0b0e14",
  fogNear: 24,
  fogFar: 60,
  cameraPosition: [0, 14, 24],
  minDistance: 8,
  maxDistance: 60,
  ambientIntensity: 0.7,
  keyIntensity: 1.2,
  keyPosition: [8, 16, 8],
}

export function createViewport(canvas: HTMLCanvasElement, options: ViewportOptions = {}): Viewport {
  const opts = { ...DEFAULTS, ...options }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(opts.background)
  scene.fog = new THREE.Fog(opts.background, opts.fogNear, opts.fogFar)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(...opts.cameraPosition)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.minDistance = opts.minDistance
  controls.maxDistance = opts.maxDistance

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
    controls.update()
    renderer.render(scene, camera)
  })

  const setPointerFromEvent = (e: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  const dispose = (): void => {
    window.removeEventListener("resize", onResize)
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
    dispose,
    setPointerFromEvent,
  }
}
