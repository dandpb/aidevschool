import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  type WebGLRenderer,
} from "three"
import type { RouteHealthEncounterState } from "../../game/encounters/routeHealth"
import type { WorldState } from "../../game/simulation/types"

// Visualizes a route_health encounter as a 3D circuit-breaker diorama. The
// encounter state is the truth; this scene is a pure read-only projection — it
// never mutates the encounter and derives every visual from
// RouteHealthEncounterState. This follows the established SkillOrbitScene
// pattern: a self-contained sub-scene with its own PerspectiveCamera + dispose,
// driven by WorldRenderer.sync dispatching on world.mode === "circuit-breaker".
//
// Mapping (state -> visual):
//   - Each check in definition.checks = one route sphere orbiting the client.
//   - check.type === "healthy"  -> green sphere.
//   - check.type === "unhealthy" -> red sphere.
//   - The current check (state.index) pulses to signal "decide now".
//   - bad_routes > 0 (cascade leaks) -> red crackle intensity on the client cube
//     scales with heatPeak; the whole group shakes when overheated.
//   - routed count -> bright feeder beam count from client to healthy spheres.
export class CircuitBreakerScene {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(52, 4 / 3, 0.1, 100)
  private readonly group = new Group()
  private readonly clientGeometry = new BoxGeometry(0.62, 0.62, 0.62)
  private readonly routeGeometry = new SphereGeometry(0.28, 18, 12)
  private readonly clientMesh: Mesh
  private readonly routeMeshes: Mesh[] = []
  private state: RouteHealthEncounterState | undefined
  private builtKey = ""

  constructor() {
    this.scene.background = new Color("#080b12")
    this.camera.position.set(0, 3.6, 5.4)
    this.camera.lookAt(0, 0.4, 0)

    const ambient = new AmbientLight("#9ee0ff", 0.55)
    const keyLight = new DirectionalLight("#f6dd88", 2.4)
    keyLight.position.set(2.2, 4.4, 3.0)
    const fillLight = new DirectionalLight("#67c2ff", 1.3)
    fillLight.position.set(-3.6, 2.0, -2.4)
    this.scene.add(ambient, keyLight, fillLight, this.group)

    this.clientMesh = new Mesh(
      this.clientGeometry,
      new MeshStandardMaterial({
        color: "#f0d56b",
        emissive: "#5b4310",
        emissiveIntensity: 0.32,
        roughness: 0.4,
        metalness: 0.18,
      }),
    )
    this.clientMesh.position.set(0, 0.4, 0)
    this.group.add(this.clientMesh)
  }

  setEncounter(state: RouteHealthEncounterState | undefined): void {
    this.state = state
  }

  render(renderer: WebGLRenderer, _world: WorldState): void {
    const state = this.state
    const time = performance.now() * 0.001
    if (state !== undefined) {
      const nextKey = `${state.definition.id}@${state.definition.checks.length}`
      if (nextKey !== this.builtKey) {
        this.rebuildRoutes(state)
        this.builtKey = nextKey
      }
      this.updateRouteVisuals(state, time)
      this.updateClient(state, time)
    }
    // Slow rotation gives spatial reading of the ring; shake when overheated.
    const overheated =
      state?.evidence?.metrics.kind === "pixelquest-route-health"
        ? state.evidence.metrics.overheated
        : state !== undefined && state.badRoutes > state.definition.maxBadRoutes
    this.group.rotation.y = overheated ? time * 4.2 + Math.sin(time * 30) * 0.08 : time * 0.12
    renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.clearRoutes()
    this.clientGeometry.dispose()
    this.routeGeometry.dispose()
    disposeMaterial(this.clientMesh.material)
  }

  private rebuildRoutes(state: RouteHealthEncounterState): void {
    this.clearRoutes()
    const total = Math.max(state.definition.checks.length, 1)
    const radius = 2.6
    for (let index = 0; index < state.definition.checks.length; index += 1) {
      const check = state.definition.checks[index]
      if (check === undefined) {
        continue
      }
      const material = new MeshStandardMaterial({
        color: check.type === "healthy" ? "#7ac46b" : "#c44b3a",
        emissive: check.type === "healthy" ? "#1f4a1f" : "#4a1410",
        emissiveIntensity: 0.3,
        roughness: 0.5,
        metalness: 0.08,
      })
      const mesh = new Mesh(this.routeGeometry, material)
      const angle = (Math.PI * 2 * index) / total
      mesh.position.set(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius)
      mesh.userData["checkIndex"] = index
      this.routeMeshes.push(mesh)
      this.group.add(mesh)
    }
  }

  private updateRouteVisuals(state: RouteHealthEncounterState, time: number): void {
    const handledUpTo = state.index
    for (const mesh of this.routeMeshes) {
      const checkIndex = mesh.userData["checkIndex"] as number
      const check = state.definition.checks[checkIndex]
      if (check === undefined) {
        continue
      }
      const material = mesh.material as MeshStandardMaterial
      const isCurrent = checkIndex === handledUpTo && !state.complete
      const isPast = checkIndex < handledUpTo
      if (isCurrent) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 6)
        material.emissiveIntensity = 0.5 + pulse * 0.7
        mesh.scale.setScalar(1.25 + pulse * 0.15)
      } else if (isPast) {
        material.emissiveIntensity = 0.18
        mesh.scale.setScalar(0.92)
      } else {
        material.emissiveIntensity = 0.32
        mesh.scale.setScalar(1)
      }
    }
  }

  private updateClient(state: RouteHealthEncounterState, time: number): void {
    const material = this.clientMesh.material as MeshStandardMaterial
    const total = Math.max(state.definition.checks.length, 1)
    const leakRatio = Math.min(state.badRoutes / total, 1)
    const heatRatio = Math.min(state.heatPeak / 200, 1)
    // As bad routes accumulate, the client cube shifts from amber toward red
    // and its emissive pulse quickens — the visible "cascade" alarm.
    const r = 0.94 + leakRatio * 0.06
    const g = 0.83 - leakRatio * 0.55
    const b = 0.42 - leakRatio * 0.38
    material.color.setRGB(r, g, b)
    material.emissive.setRGB(0.36 * leakRatio, 0.1 * (1 - leakRatio), 0.05)
    const pulseHz = 1.2 + heatRatio * 9
    material.emissiveIntensity = 0.3 + heatRatio * (0.4 + 0.4 * Math.sin(time * pulseHz))
    const scale = 1 + heatRatio * 0.08 * Math.sin(time * pulseHz * 1.4)
    this.clientMesh.scale.setScalar(scale)
  }

  private clearRoutes(): void {
    for (const mesh of this.routeMeshes) {
      this.group.remove(mesh)
      disposeMaterial(mesh.material)
    }
    this.routeMeshes.length = 0
  }
}

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose()
    }
  } else {
    material.dispose()
  }
}
