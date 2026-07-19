import * as THREE from "three"

/** Dispose every geometry/material under `root` (root included). Shared by
 *  the renderers that rebuild or remove sub-trees. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return
    object.geometry.dispose()
    if (Array.isArray(object.material)) for (const material of object.material) material.dispose()
    else object.material.dispose()
  })
}
