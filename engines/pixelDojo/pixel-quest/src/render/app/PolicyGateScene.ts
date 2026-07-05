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
  TorusGeometry,
  type WebGLRenderer,
} from "three"
import type { PolicyGateEncounterState } from "../../game/encounters/policyGate"
import type { WorldState } from "../../game/simulation/types"

// Visualizes a policy_gate encounter as a 3D "auth gate" diorama. The encounter
// state is the truth; this scene is a pure read-only projection — it never
// mutates the encounter and derives every visual from PolicyGateEncounterState.
// This follows the established CircuitBreakerScene pattern: a self-contained
// sub-scene with its own PerspectiveCamera + dispose, driven by WorldRenderer
// dispatching on world.mode === "auth-gate".
//
// Mapping (state -> visual):
//   - definition.checks[i] = one request orb orbiting the gate pillar in a ring.
//   - check.type === "allowed" -> green orb.
//   - check.type === "denied"  -> red orb.
//   - The current check (state.index, when !complete) pulses to signal "decide now".
//   - Past checks shrink/dim; future checks are steady.
//   - policyLeaks > 0 (breach) -> the gate pillar shifts from amber toward red
//     and its emissive pulse quickens; the whole group shakes when overheated.
//   - falseDenies > 0 -> a brief dim "wasted bounce" tint on the pillar.
//   - Concentric TorusGeometry scope rings represent the scope/role hierarchy —
//     the depth payoff flat 2.5D cannot show.
export class PolicyGateScene {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(52, 4 / 3, 0.1, 100)
  private readonly group = new Group()
  private readonly gateGeometry = new BoxGeometry(0.62, 1.6, 0.62)
  private readonly orbGeometry = new SphereGeometry(0.28, 18, 12)
  private readonly ringGeometry = new TorusGeometry(1, 0.04, 10, 64)
  private readonly gateMesh: Mesh
  private readonly ringMeshes: Mesh[] = []
  private readonly orbMeshes: Mesh[] = []
  private state: PolicyGateEncounterState | undefined
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

    this.gateMesh = new Mesh(
      this.gateGeometry,
      new MeshStandardMaterial({
        color: "#f0a04b",
        emissive: "#5b3a10",
        emissiveIntensity: 0.32,
        roughness: 0.4,
        metalness: 0.18,
      }),
    )
    this.gateMesh.position.set(0, 0.8, 0)
    this.group.add(this.gateMesh)

    // Static decorative scope rings — concentric tiers representing the
    // scope/role boundary that 2.5D cannot project. Laid flat around the gate.
    const ringRadii = [1.4, 1.9, 2.4]
    for (const radius of ringRadii) {
      const ring = new Mesh(
        this.ringGeometry,
        new MeshStandardMaterial({
          color: "#3a5a7a",
          emissive: "#15263a",
          emissiveIntensity: 0.4,
          roughness: 0.6,
          metalness: 0.2,
          transparent: true,
          opacity: 0.5,
        }),
      )
      ring.rotation.x = Math.PI / 2
      ring.scale.setScalar(radius)
      ring.position.y = 0.05
      this.ringMeshes.push(ring)
      this.group.add(ring)
    }
  }

  setEncounter(state: PolicyGateEncounterState | undefined): void {
    this.state = state
  }

  render(renderer: WebGLRenderer, _world: WorldState): void {
    const state = this.state
    const time = performance.now() * 0.001
    if (state !== undefined) {
      const nextKey = `${state.definition.id}@${state.definition.checks.length}`
      if (nextKey !== this.builtKey) {
        this.rebuildOrbs(state)
        this.builtKey = nextKey
      }
      this.updateOrbVisuals(state, time)
      this.updateGate(state, time)
    }
    // Slow rotation gives spatial reading of the ring; shake when overheated.
    const overheated =
      state?.evidence?.metrics.kind === "pixelquest-policy-gate"
        ? state.evidence.metrics.overheated
        : state !== undefined && state.policyLeaks > state.definition.maxPolicyLeaks
    this.group.rotation.y = overheated ? time * 4.2 + Math.sin(time * 30) * 0.08 : time * 0.12
    renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.clearOrbs()
    this.gateGeometry.dispose()
    this.orbGeometry.dispose()
    this.ringGeometry.dispose()
    disposeMaterial(this.gateMesh.material)
    for (const ring of this.ringMeshes) {
      disposeMaterial(ring.material)
    }
  }

  private rebuildOrbs(state: PolicyGateEncounterState): void {
    this.clearOrbs()
    const total = Math.max(state.definition.checks.length, 1)
    const radius = 2.6
    for (let index = 0; index < state.definition.checks.length; index += 1) {
      const check = state.definition.checks[index]
      if (check === undefined) {
        continue
      }
      const material = new MeshStandardMaterial({
        color: check.type === "allowed" ? "#7ac46b" : "#c44b3a",
        emissive: check.type === "allowed" ? "#1f4a1f" : "#4a1410",
        emissiveIntensity: 0.3,
        roughness: 0.5,
        metalness: 0.08,
      })
      const mesh = new Mesh(this.orbGeometry, material)
      const angle = (Math.PI * 2 * index) / total
      mesh.position.set(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius)
      mesh.userData["checkIndex"] = index
      this.orbMeshes.push(mesh)
      this.group.add(mesh)
    }
  }

  private updateOrbVisuals(state: PolicyGateEncounterState, time: number): void {
    const handledUpTo = state.index
    for (const mesh of this.orbMeshes) {
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

  private updateGate(state: PolicyGateEncounterState, time: number): void {
    const material = this.gateMesh.material as MeshStandardMaterial
    const total = Math.max(state.definition.checks.length, 1)
    const leakRatio = Math.min(state.policyLeaks / total, 1)
    const heatRatio = Math.min(state.heatPeak / 200, 1)
    // As policy leaks accumulate, the gate pillar shifts from amber toward red
    // and its emissive pulse quickens — the visible "breach" alarm.
    const r = 0.94 + leakRatio * 0.06
    const g = 0.63 - leakRatio * 0.45
    const b = 0.3 - leakRatio * 0.26
    material.color.setRGB(r, g, b)
    material.emissive.setRGB(0.36 * leakRatio, 0.1 * (1 - leakRatio), 0.05)
    const pulseHz = 1.2 + heatRatio * 9
    material.emissiveIntensity = 0.3 + heatRatio * (0.4 + 0.4 * Math.sin(time * pulseHz))
    // falseDenies show as a brief dim "wasted bounce" — a subtle cool tint dip.
    if (state.falseDenies > 0) {
      material.emissiveIntensity *= 0.7
    }
    const scale = 1 + heatRatio * 0.08 * Math.sin(time * pulseHz * 1.4)
    this.gateMesh.scale.setScalar(scale)
  }

  private clearOrbs(): void {
    for (const mesh of this.orbMeshes) {
      this.group.remove(mesh)
      disposeMaterial(mesh.material)
    }
    this.orbMeshes.length = 0
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
