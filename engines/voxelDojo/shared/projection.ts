import * as THREE from "three"

export interface MissionProjection<TSnapshot> {
  mount(target: HTMLElement): void
  sync(snapshot: TSnapshot): void
  focus(): void
  dispose(): void
}

export interface ProjectionContextHooks {
  onContextLost?: () => void
  onContextRestored?: () => void
  onContextCreationError?: () => void
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      if (material === undefined) continue
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      material.dispose()
    }
  })
}
