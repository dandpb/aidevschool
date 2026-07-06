import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from "three"
import { BUFFER_CAPACITY, CHUNKS_PER_FILE, FILES_TARGET, type GameState } from "./logic"

// Visual constants — the 3D layout of the Byte Stream Reactor.
const FILE_BLOCK_X = -8
const CANNON_X = -3.2
const BUFFER_X = 0
const PIPELINE_X = 4.5
const STAGE_SPACING = 2.4
const STAGE_Y_CENTER = 1.2

const CHUNK_COLOR = 0x7cd7ff
const FILE_COLOR = 0x4f7aa8
const CANNON_COLOR = 0xffce5c
const STAGE_COLOR = 0x2a3a55
const ACTIVE_COLOR = 0x6ee7b7
const BAD_COLOR = 0xff5c7a

type SceneMeshes = {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly cannon: Group
  readonly cannonPivot: Group
  readonly fileBlock: Mesh
  readonly bufferSlots: readonly Mesh[]
  readonly validator: Mesh
  readonly hasher: Mesh
  readonly storage: Mesh
  readonly validatorLight: PointLight
  readonly hasherLight: PointLight
  readonly storageLight: PointLight
  readonly vaultChunks: Group
  readonly storageBeam: Mesh
  readonly chunkProjectiles: Group
}

export function createScene(container: HTMLElement): SceneMeshes {
  const scene = new Scene()
  scene.background = new Color(0x080b14)

  const camera = new PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(0, 4.5, 13)
  camera.lookAt(0, 1, 0)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const ambient = new AmbientLight(0x9bb8ff, 0.45)
  scene.add(ambient)

  const keyLight = new DirectionalLight(0xffe8b8, 0.9)
  keyLight.position.set(-5, 8, 6)
  scene.add(keyLight)

  const rimLight = new DirectionalLight(0x7cd7ff, 0.4)
  rimLight.position.set(6, 4, -4)
  scene.add(rimLight)

  // --- File block (input dock)
  const fileBlock = new Mesh(
    new BoxGeometry(2.6, 2.6, 2.6),
    new MeshStandardMaterial({
      color: FILE_COLOR,
      emissive: 0x142338,
      roughness: 0.6,
      metalness: 0.2,
    }),
  )
  fileBlock.position.set(FILE_BLOCK_X, 1.4, 0)
  scene.add(fileBlock)

  const dockRing = new Mesh(
    new TorusGeometry(1.8, 0.06, 8, 32),
    new MeshStandardMaterial({ color: 0xffce5c, emissive: 0x4a3a10 }),
  )
  dockRing.rotation.x = Math.PI / 2
  dockRing.position.set(FILE_BLOCK_X, 0.1, 0)
  scene.add(dockRing)

  // --- Chunk cannon
  const cannonPivot = new Group()
  cannonPivot.position.set(CANNON_X, 1.4, 0)

  const cannonBase = new Mesh(
    new BoxGeometry(1.2, 1.2, 1.2),
    new MeshStandardMaterial({ color: CANNON_COLOR, roughness: 0.5, metalness: 0.4 }),
  )
  cannonBase.position.set(-0.4, 0, 0)
  cannonPivot.add(cannonBase)

  const cannonBarrel = new Mesh(
    new BoxGeometry(1.6, 0.5, 0.5),
    new MeshStandardMaterial({ color: CANNON_COLOR, roughness: 0.4, metalness: 0.5 }),
  )
  cannonBarrel.position.set(0.6, 0, 0)
  cannonPivot.add(cannonBarrel)

  const cannonTip = new Mesh(
    new BoxGeometry(0.2, 0.7, 0.7),
    new MeshStandardMaterial({
      color: CANNON_COLOR,
      emissive: 0x7a5800,
      roughness: 0.3,
      metalness: 0.6,
    }),
  )
  cannonTip.position.set(1.5, 0, 0)
  cannonPivot.add(cannonTip)
  scene.add(cannonPivot)

  // --- Memory buffer hopper (4 slots, vertical stack)
  const bufferSlots: Mesh[] = []
  const slotSpacing = 0.95
  for (let i = 0; i < BUFFER_CAPACITY; i += 1) {
    const slot = new Mesh(
      new BoxGeometry(1.4, 0.7, 1.4),
      new MeshStandardMaterial({
        color: 0x101827,
        emissive: 0x0a0f1a,
        transparent: true,
        opacity: 0.55,
        roughness: 0.6,
      }),
    )
    slot.position.set(BUFFER_X, 0.6 + i * slotSpacing, 0)
    scene.add(slot)
    bufferSlots.push(slot)
  }

  const bufferFrame = new Mesh(
    new TorusGeometry(1.1, 0.05, 8, 4),
    new MeshStandardMaterial({ color: 0x2a3a55 }),
  )
  bufferFrame.rotation.x = Math.PI / 2
  bufferFrame.rotation.z = Math.PI / 4
  bufferFrame.scale.set(1.6, 1.6, 3.2)
  bufferFrame.position.set(BUFFER_X, 2.1, 0)
  scene.add(bufferFrame)

  // --- Pipeline lanes (validator, hasher crystal, storage vault)
  const validator = makeLaneBox(0x9b7cff, "validator")
  validator.position.set(PIPELINE_X, STAGE_Y_CENTER + STAGE_SPACING, 0)
  scene.add(validator)

  const hasher = new Mesh(
    new OctahedronGeometry(1.0, 0),
    new MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10402a,
      roughness: 0.2,
      metalness: 0.6,
      flatShading: true,
    }),
  )
  hasher.position.set(PIPELINE_X, STAGE_Y_CENTER, 0)
  scene.add(hasher)

  const storage = makeLaneBox(0x7cd7ff, "storage")
  storage.position.set(PIPELINE_X, STAGE_Y_CENTER - STAGE_SPACING, 0)
  scene.add(storage)

  const validatorLight = new PointLight(0x9b7cff, 0.0, 6)
  validatorLight.position.set(PIPELINE_X, STAGE_Y_CENTER + STAGE_SPACING, 1.2)
  scene.add(validatorLight)
  const hasherLight = new PointLight(0x6ee7b7, 0.0, 6)
  hasherLight.position.set(PIPELINE_X, STAGE_Y_CENTER, 1.2)
  scene.add(hasherLight)
  const storageLight = new PointLight(0x7cd7ff, 0.0, 6)
  storageLight.position.set(PIPELINE_X, STAGE_Y_CENTER - STAGE_SPACING, 1.2)
  scene.add(storageLight)

  // Storage beam — flow indicator from pipeline back into vault area.
  const storageBeam = new Mesh(
    new BoxGeometry(2.6, 0.08, 0.4),
    new MeshStandardMaterial({
      color: ACTIVE_COLOR,
      emissive: ACTIVE_COLOR,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.0,
    }),
  )
  storageBeam.position.set(PIPELINE_X + 2.0, STAGE_Y_CENTER - STAGE_SPACING, 0)
  scene.add(storageBeam)

  // Vault chunks: a growing pile showing stored chunks restacked as a file.
  const vaultChunks = new Group()
  vaultChunks.position.set(PIPELINE_X + 3.6, STAGE_Y_CENTER - STAGE_SPACING - 0.4, 0)
  scene.add(vaultChunks)

  // Chunk projectiles (transient visuals for in-flight chunks).
  const chunkProjectiles = new Group()
  scene.add(chunkProjectiles)

  return {
    scene,
    camera,
    renderer,
    cannon: cannonPivot,
    cannonPivot,
    fileBlock,
    bufferSlots,
    validator,
    hasher,
    storage,
    validatorLight,
    hasherLight,
    storageLight,
    vaultChunks,
    storageBeam,
    chunkProjectiles,
  }
}

function makeLaneBox(color: number, _label: string): Mesh {
  return new Mesh(
    new BoxGeometry(1.6, 1.6, 1.6),
    new MeshStandardMaterial({
      color,
      emissive: 0x0a0f1a,
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8,
    }),
  )
}

export type Projectile = {
  readonly mesh: Mesh
  readonly bornAtMs: number
  readonly fromX: number
  readonly toX: number
  readonly slotY: number
  readonly durationMs: number
}

// Sync the 3D scene to the current game state. Pure visual — never mutates state.
export function syncScene(meshes: SceneMeshes, state: GameState, nowMs: number): void {
  // Cannon angle tracks player aim.
  meshes.cannonPivot.rotation.z = (state.cannonAngleDeg * Math.PI) / 180

  // File block pulses gently while there's a current file; shrinks as it's sliced.
  const file = state.currentFile
  if (file !== null) {
    meshes.fileBlock.visible = true
    const remaining = Math.max(0, file.totalChunks - file.chunksSliced)
    const scale = 0.45 + 0.55 * (remaining / Math.max(1, file.totalChunks))
    meshes.fileBlock.scale.setScalar(scale)
    const pulse = 1 + 0.04 * Math.sin(nowMs / 220)
    meshes.fileBlock.scale.multiplyScalar(pulse)
  } else {
    meshes.fileBlock.visible = false
  }

  // Buffer slots fill from bottom.
  for (let i = 0; i < meshes.bufferSlots.length; i += 1) {
    const slot = meshes.bufferSlots[i]
    if (slot === undefined) continue
    const filledIndex = state.buffer.length - 1 - i
    const isFilled = filledIndex >= 0
    const isPeak = i === state.bufferPeak - 1
    const mat = slot.material as MeshStandardMaterial
    if (isFilled) {
      mat.color.setHex(CHUNK_COLOR)
      mat.emissive.setHex(0x2a4a6a)
      mat.emissiveIntensity = 1.0
      mat.opacity = 0.92
    } else {
      mat.color.setHex(0x101827)
      mat.emissive.setHex(0x0a0f1a)
      mat.emissiveIntensity = 0.5
      mat.opacity = 0.45
    }
    slot.scale.setScalar(isPeak ? 1.08 : 1.0)
  }

  // Processor slot: light up the active lane(s). Single in-flight chunk flows
  // through validator → hasher → storage visually via remainingMs.
  const processor = state.processor
  const progress = processor === null ? 0 : 1 - processor.remainingMs / 500 // PIPELINE_DURATION_MS — keep in sync
  setLaneActivity(meshes.validator, meshes.validatorLight, processor !== null && progress < 0.34)
  setLaneActivity(
    meshes.hasher,
    meshes.hasherLight,
    processor !== null && progress >= 0.34 && progress < 0.67,
  )
  setLaneActivity(meshes.storage, meshes.storageLight, processor !== null && progress >= 0.67)

  // Hasher crystal spins faster as more chunks get processed.
  const spin = 0.4 + state.hasherChunksConsumed * 0.05
  meshes.hasher.rotation.y += 0.005 + spin * 0.005
  meshes.hasher.rotation.x += 0.003

  // Storage beam flashes when a chunk is in the storage stage.
  const beamMat = meshes.storageBeam.material as MeshStandardMaterial
  beamMat.opacity = processor !== null && progress >= 0.67 ? 0.6 : 0.0

  // Vault chunks: a growing pile representing stored bytes. Cap visual count
  // so we don't add unbounded meshes over a long wave.
  syncVaultPile(meshes.vaultChunks, state.hasherChunksConsumed)
}

function setLaneActivity(lane: Mesh, light: PointLight, active: boolean): void {
  const mat = lane.material as MeshStandardMaterial
  if (active) {
    mat.color.setHex(ACTIVE_COLOR)
    mat.emissive.setHex(0x2a6e4a)
    mat.emissiveIntensity = 1.2
    light.intensity = 1.4
  } else {
    mat.color.setHex(STAGE_COLOR)
    mat.emissive.setHex(0x0a0f1a)
    mat.emissiveIntensity = 0.6
    light.intensity = 0.0
  }
}

function syncVaultPile(group: Group, chunksStored: number): void {
  const desired = Math.min(chunksStored, FILES_TARGET * CHUNKS_PER_FILE)
  while (group.children.length < desired) {
    const i = group.children.length
    const block = new Mesh(
      new BoxGeometry(0.35, 0.35, 0.35),
      new MeshStandardMaterial({
        color: 0x7cd7ff,
        emissive: 0x10304a,
        roughness: 0.4,
        metalness: 0.3,
      }),
    )
    const col = i % 5
    const row = Math.floor(i / 5)
    block.position.set(col * 0.4 - 0.8, 0.2 + row * 0.4, 0)
    group.add(block)
  }
}

// Colored overlay on the file block / cannon when status is won/lost.
export function setStatusColor(meshes: SceneMeshes, status: GameState["status"]): void {
  const color = status === "won" ? ACTIVE_COLOR : status === "lost" ? BAD_COLOR : FILE_COLOR
  const emissive = status === "won" ? 0x2a6e4a : status === "lost" ? 0x5a1024 : 0x142338
  const mat = meshes.fileBlock.material as MeshStandardMaterial
  if (meshes.fileBlock.visible) {
    mat.color.setHex(color)
    mat.emissive.setHex(emissive)
  }
}

export function resizeRenderer(meshes: SceneMeshes, container: HTMLElement): void {
  const w = container.clientWidth
  const h = container.clientHeight
  meshes.renderer.setSize(w, h)
  meshes.camera.aspect = w / h
  meshes.camera.updateProjectionMatrix()
}
