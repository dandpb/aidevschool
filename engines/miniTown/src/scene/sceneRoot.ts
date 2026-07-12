import * as THREE from "three"
import { CameraRig } from "./camera"
import { type DayNightDeltas, type DayNightPalette, DEFAULT_PALETTE } from "./dayNight"
import { Ground } from "./ground"

export interface SceneRootOptions {
  readonly palette?: DayNightPalette
}

/**
 * The fixed rendering pipeline shared by every other scene component:
 *  - Three.js Scene with linear fog (interpolated by day/night).
 *  - WebGLRenderer that fills its host element.
 *  - Camera, lights, ground, and a sky-gradient backdrop mesh.
 *
 * `applyDayNight(deltas)` is the only way external code mutates the lighting /
 * sky / fog. Everything else is set up once at construction time.
 */
export class SceneRoot {
  readonly scene: THREE.Scene
  readonly renderer: THREE.WebGLRenderer
  readonly cameraRig: CameraRig
  readonly sun: THREE.DirectionalLight
  readonly hemi: THREE.HemisphereLight
  readonly ambient: THREE.AmbientLight
  readonly ground: Ground
  /** A large gradient skydome (inside-out sphere). Its vertex colours are
   *  re-tinted from the day/night deltas each frame. */
  readonly sky: THREE.Mesh

  #host: HTMLElement
  #palette: DayNightPalette

  constructor(host: HTMLElement, options: SceneRootOptions = {}) {
    this.#host = host
    this.#palette = options.palette ?? DEFAULT_PALETTE

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(this.#palette.fogDay, 30, 80)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(this.#palette.skyDay, 1)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(this.renderer.domElement)

    this.cameraRig = new CameraRig(this.renderer.domElement)
    this.handleResize()

    // Lights — single sun + hemisphere fill + tiny ambient floor.
    this.sun = new THREE.DirectionalLight(this.#palette.sunMidday, 1)
    this.sun.position.set(20, 30, 10)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 120
    this.sun.shadow.camera.left = -25
    this.sun.shadow.camera.right = 25
    this.sun.shadow.camera.top = 25
    this.sun.shadow.camera.bottom = -25
    this.scene.add(this.sun)

    this.hemi = new THREE.HemisphereLight(
      this.#palette.hemiTopDay,
      this.#palette.hemiBottomDay,
      0.6,
    )
    this.scene.add(this.hemi)

    this.ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambient)

    this.ground = new Ground()
    this.scene.add(this.ground.group)

    this.sky = createSkydome()
    this.scene.add(this.sky)

    window.addEventListener("resize", this.handleResize)
  }

  /** Update the world from a day/night tick. */
  applyDayNight(deltas: DayNightDeltas): void {
    this.sun.position.copy(deltas.sunPosition)
    this.sun.intensity = deltas.sunIntensity
    this.sun.color.copy(deltas.sunColor)

    this.hemi.color.copy(deltas.hemiTop)
    this.hemi.groundColor.copy(deltas.hemiBottom)
    this.hemi.intensity = deltas.hemiIntensity

    this.ambient.intensity = deltas.ambientIntensity

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(deltas.fogColor)
    }
    tintSkydome(this.sky, deltas.skyHorizon, deltas.skyZenith)
    this.renderer.setClearColor(deltas.skyZenith, 1)
  }

  handleResize = (): void => {
    const rect = this.#host.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    this.renderer.setSize(w, h, false)
    this.cameraRig.resize(w, h)
  }

  render(): void {
    this.cameraRig.update()
    this.renderer.render(this.scene, this.cameraRig.camera)
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize)
    this.renderer.dispose()
    this.ground.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose()
        } else {
          mat.dispose()
        }
      }
    })
    if (this.renderer.domElement.parentElement === this.#host) {
      this.#host.removeChild(this.renderer.domElement)
    }
  }
}

/**
 * Inward-facing icosahedron with two-colour vertex gradient: horizon (bottom
 * ring) and zenith (top vertex). Painted via vertex colours so we can re-tint
 * it every frame from the day/night palette without rebuilding geometry.
 */
function createSkydome(): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(120, 4)
  // Flat-shade friendly: keep original positions, paint a colour per vertex.
  const positions = geo.attributes.position
  if (!positions) throw new Error("IcosahedronGeometry has no position attribute")
  const colours = new Float32Array(positions.count * 3)
  const tmp = new THREE.Vector3()
  const horizon = new THREE.Color("#cfe6f0")
  const zenith = new THREE.Color("#a3d0e8")
  for (let i = 0; i < positions.count; i++) {
    tmp.fromBufferAttribute(positions, i)
    // Y in [-radius, +radius] → t in [0, 1]
    const t = (tmp.y / 120 + 1) / 2
    const c = horizon.clone().lerp(zenith, t)
    colours[i * 3] = c.r
    colours[i * 3 + 1] = c.g
    colours[i * 3 + 2] = c.b
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3))
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = "sky"
  return mesh
}

function tintSkydome(mesh: THREE.Mesh, horizon: THREE.Color, zenith: THREE.Color): void {
  const colourAttr = mesh.geometry.getAttribute("color")
  if (!colourAttr) return
  const positions = mesh.geometry.getAttribute("position")
  if (!positions) return
  const tmp = new THREE.Vector3()
  const c = new THREE.Color()
  for (let i = 0; i < positions.count; i++) {
    tmp.fromBufferAttribute(positions, i)
    const t = (tmp.y / 120 + 1) / 2
    c.copy(horizon).lerp(zenith, t)
    colourAttr.setXYZ(i, c.r, c.g, c.b)
  }
  colourAttr.needsUpdate = true
}
