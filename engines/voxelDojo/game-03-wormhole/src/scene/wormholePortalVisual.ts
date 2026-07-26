import * as THREE from "three"
import { PALETTE } from "../../../shared/palette"
import { disposeObject3D } from "../../../shared/projection"

/** Portal anchors on the x axis; the scene's traveller streaks follow this span. */
export const ORIGIN_X = -7
export const DESTINATION_X = 7

const PLANET_RADIUS = 1.6
const GATE_RADIUS = 2.0

export function colorForUrl(url: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < url.length; index++) {
    hash ^= url.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return PALETTE[(hash >>> 0) % PALETTE.length] ?? "#aed581"
}

function makeTextSprite(text: string, color = "#80cbc4"): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext("2d")
  if (!context) throw new Error("2d canvas context unavailable")
  context.fillStyle = "rgba(8,10,18,0.78)"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = color
  context.lineWidth = 4
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
  context.font = "bold 64px ui-monospace, Menlo, monospace"
  context.fillStyle = color
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(4, 2, 1)
  return sprite
}

export class WormholePortalVisual {
  readonly group = new THREE.Group()
  private readonly originMesh: THREE.Mesh
  private readonly destinationMesh: THREE.Mesh
  private readonly destinationMaterial: THREE.MeshStandardMaterial
  private readonly gate: THREE.Mesh
  private readonly gateMaterial: THREE.MeshStandardMaterial
  private readonly gateLight: THREE.PointLight
  private gateLabel: THREE.Sprite | null = null

  constructor(destinationColor: string) {
    this.originMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PLANET_RADIUS, 1),
      new THREE.MeshStandardMaterial({ color: "#4fc3f7", flatShading: true, emissive: "#1a3a4a" }),
    )
    this.originMesh.position.set(ORIGIN_X, 0, 0)
    this.originMesh.userData = { kind: "origin" }
    this.group.add(this.originMesh)

    this.destinationMaterial = new THREE.MeshStandardMaterial({
      color: destinationColor,
      flatShading: true,
      emissive: "#2a3a1a",
    })
    this.destinationMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PLANET_RADIUS, 1),
      this.destinationMaterial,
    )
    this.destinationMesh.position.set(DESTINATION_X, 0, 0)
    this.destinationMesh.userData = { kind: "destination" }
    this.group.add(this.destinationMesh)

    this.gateMaterial = new THREE.MeshStandardMaterial({
      color: "#80cbc4",
      emissive: "#80cbc4",
      emissiveIntensity: 0.8,
    })
    this.gate = new THREE.Mesh(
      new THREE.TorusGeometry(GATE_RADIUS, 0.12, 12, 48),
      this.gateMaterial,
    )
    this.gate.rotation.y = Math.PI / 2
    this.gate.userData = { kind: "gate" }
    this.group.add(this.gate)

    this.gateLight = new THREE.PointLight("#80cbc4", 2, 18)
    this.group.add(this.gateLight)
  }

  get pickTargets(): readonly THREE.Object3D[] {
    return [this.gate, this.originMesh, this.destinationMesh]
  }

  setGateLabel(code: string): void {
    this.disposeGateLabel()
    if (code && code !== "----") {
      const label = makeTextSprite(code)
      label.position.set(0, GATE_RADIUS + 1.0, 0)
      this.group.add(label)
      this.gateLabel = label
    }
  }

  setDestinationColor(color: string): void {
    this.destinationMaterial.color.set(color)
  }

  animateFeedback(colliding: boolean, flashTimer: number): void {
    if (colliding || flashTimer > 0) {
      this.gateMaterial.color.set("#ef5350")
      this.gateMaterial.emissive.set("#ef5350")
      this.gateMaterial.emissiveIntensity = 1.2
      this.gateLight.color.set("#ef5350")
      this.destinationMaterial.emissive.set("#5a1010")
      return
    }
    this.gateMaterial.color.set("#80cbc4")
    this.gateMaterial.emissive.set("#80cbc4")
    this.gateMaterial.emissiveIntensity = 0.8
    this.gateLight.color.set("#80cbc4")
    this.destinationMaterial.emissive.set("#2a3a1a")
  }

  dispose(): void {
    this.disposeGateLabel()
    disposeObject3D(this.group)
  }

  private disposeGateLabel(): void {
    if (!this.gateLabel) return
    this.group.remove(this.gateLabel)
    this.gateLabel.material.map?.dispose()
    this.gateLabel.material.dispose()
    this.gateLabel = null
  }
}
