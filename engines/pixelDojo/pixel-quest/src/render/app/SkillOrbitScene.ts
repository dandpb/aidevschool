import {
  AmbientLight,
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
import {
  type SkillOrbitStation,
  selectedSkillOrbitStation,
  skillOrbitStations,
} from "../../game/simulation/skillOrbit"
import type { WorldState } from "../../game/simulation/types"

const orbitRadius = 3.1
const stationLift = 0.18

export class SkillOrbitScene {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(52, 4 / 3, 0.1, 100)
  private readonly group = new Group()
  private readonly stationGeometry = new SphereGeometry(0.22, 18, 12)
  private readonly ringGeometry = new TorusGeometry(orbitRadius, 0.018, 8, 96)
  private readonly markerGeometry = new TorusGeometry(0.34, 0.028, 8, 32)
  private readonly markerMaterial = new MeshStandardMaterial({
    color: "#f6dd88",
    emissive: "#7a5b15",
    emissiveIntensity: 0.7,
    roughness: 0.42,
    metalness: 0.12,
  })
  private readonly marker = new Mesh(this.markerGeometry, this.markerMaterial)
  private readonly stationMeshes = new Map<string, Mesh<SphereGeometry, MeshStandardMaterial>>()
  private stationKey = ""

  constructor() {
    this.scene.background = new Color("#080b12")
    this.camera.position.set(0, 4.2, 6.2)
    this.camera.lookAt(0, 0, 0)

    const ambient = new AmbientLight("#9ee0ff", 0.7)
    const keyLight = new DirectionalLight("#f6dd88", 2.8)
    keyLight.position.set(2.4, 4.8, 3.2)
    const fillLight = new DirectionalLight("#67c2ff", 1.6)
    fillLight.position.set(-4, 2.2, -2.8)

    const ring = new Mesh(
      this.ringGeometry,
      new MeshStandardMaterial({
        color: "#263a4e",
        emissive: "#112f45",
        emissiveIntensity: 0.36,
        roughness: 0.6,
      }),
    )
    ring.rotation.x = Math.PI / 2

    this.marker.rotation.x = Math.PI / 2
    this.group.add(ring, this.marker)
    this.scene.add(ambient, keyLight, fillLight, this.group)
  }

  render(renderer: WebGLRenderer, world: WorldState): void {
    const stations = skillOrbitStations(world)
    const selected = selectedSkillOrbitStation(world)
    const nextKey = stations.map((station) => station.unitId).join("|")
    if (nextKey !== this.stationKey) {
      this.rebuildStations(stations)
      this.stationKey = nextKey
    }

    this.updateStationMaterials(stations, world.skillOrbit.selectedUnitId)
    const time = performance.now() * 0.001
    this.group.rotation.y = time * 0.08
    this.marker.rotation.z = time * 1.35

    const selectedMesh = this.stationMeshes.get(selected.unitId)
    if (selectedMesh !== undefined) {
      this.marker.position.copy(selectedMesh.position)
      this.marker.position.y += 0.03
    }

    renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.clearStations()
    this.stationGeometry.dispose()
    this.ringGeometry.dispose()
    this.markerGeometry.dispose()
    for (const child of this.group.children) {
      if (child instanceof Mesh) {
        disposeMaterial(child.material)
      }
    }
  }

  private rebuildStations(stations: readonly SkillOrbitStation[]): void {
    this.clearStations()
    for (const station of stations) {
      const material = new MeshStandardMaterial({
        color: "#67c2ff",
        emissive: "#112f45",
        emissiveIntensity: 0.28,
        roughness: 0.5,
        metalness: 0.08,
      })
      const mesh = new Mesh(this.stationGeometry, material)
      const angle = (Math.PI * 2 * station.index) / station.total
      mesh.position.set(
        Math.cos(angle) * orbitRadius,
        ((station.index % 3) - 1) * stationLift,
        Math.sin(angle) * orbitRadius,
      )
      this.stationMeshes.set(station.unitId, mesh)
      this.group.add(mesh)
    }
  }

  private updateStationMaterials(
    stations: readonly SkillOrbitStation[],
    selectedUnitId: string,
  ): void {
    for (const station of stations) {
      const mesh = this.stationMeshes.get(station.unitId)
      if (mesh === undefined) {
        continue
      }
      if (station.unitId === selectedUnitId) {
        mesh.material.color.set("#f6dd88")
        mesh.material.emissive.set("#7a5b15")
        mesh.material.emissiveIntensity = 0.68
        mesh.scale.setScalar(1.35)
      } else if (station.completed) {
        mesh.material.color.set("#7ac46b")
        mesh.material.emissive.set("#244c24")
        mesh.material.emissiveIntensity = 0.34
        mesh.scale.setScalar(1.08)
      } else if (station.locked) {
        mesh.material.color.set("#314860")
        mesh.material.emissive.set("#080b12")
        mesh.material.emissiveIntensity = 0.12
        mesh.scale.setScalar(0.82)
      } else {
        mesh.material.color.set("#67c2ff")
        mesh.material.emissive.set("#112f45")
        mesh.material.emissiveIntensity = 0.28
        mesh.scale.setScalar(1)
      }
    }
  }

  private clearStations(): void {
    for (const mesh of this.stationMeshes.values()) {
      this.group.remove(mesh)
      disposeMaterial(mesh.material)
    }
    this.stationMeshes.clear()
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
