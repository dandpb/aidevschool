import "./styles.css"
import * as THREE from "three"
import { buildEvidence, emitEvidence } from "./game/evidence"
import {
  appendKind,
  evaluateLevel,
  LEVEL_1,
  nextValidKind,
  ORDER_EVENT_KINDS,
  type OrderEvent,
  type OrderEventKind,
  type OrderTower,
  performReplay,
  pickInvalidKind,
  queryProjection,
  startOrder,
  togglePublisher,
} from "./game/logic"

const TOWER_KIND_COLORS: Record<OrderEventKind, THREE.ColorRepresentation> = {
  OrderCreated: 0x5ad7ff, // cyan — birth
  PaymentAuthorized: 0xffd166, // gold — money
  InventoryReserved: 0xff9f5a, // orange — stock
  OrderConfirmed: 0x66ff99, // green — committed
  OrderShipped: 0xb084ff, // purple — in transit
  OrderDelivered: 0xffffff, // white — done
}

type FloorMesh = {
  readonly kind: OrderEventKind
  readonly seq: number
  readonly mesh: THREE.Mesh
}

class TimelineTowerGame {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly towerGroup: THREE.Group
  private readonly sphereGroup: THREE.Group
  private readonly outboxGroup: THREE.Group
  private readonly beaconGroup: THREE.Group
  private readonly crankGroup: THREE.Group
  private readonly floors: FloorMesh[] = []
  private readonly outboxTokens: THREE.Mesh[] = []
  private sphereMesh!: THREE.Mesh
  private beamLine!: THREE.Line
  private clock = new THREE.Clock()
  private cameraAngle = 0
  private flashEl: HTMLDivElement | null = null
  private nextEventEl: HTMLDivElement | null = null
  private statusEl: HTMLTableElement | null = null
  private evidenceEmitted = false

  private tower: OrderTower = this.freshTower()

  // Bound handlers (kept as instance fields so removeEventListener works).
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKey(e.code)

  constructor(private readonly root: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x0a0e1a, 1)
    root.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x0a0e1a, 16, 38)

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(8, 6, 8)
    this.camera.lookAt(0, 3, 0)

    this.towerGroup = new THREE.Group()
    this.sphereGroup = new THREE.Group()
    this.outboxGroup = new THREE.Group()
    this.beaconGroup = new THREE.Group()
    this.crankGroup = new THREE.Group()
    this.scene.add(
      this.towerGroup,
      this.sphereGroup,
      this.outboxGroup,
      this.beaconGroup,
      this.crankGroup,
    )

    this.setupLights()
    this.setupGround()
    this.setupTowerBase()
    this.setupSphere()
    this.setupOutboxRail()
    this.setupBeacon()
    this.setupCrank()
    this.setupBeam()

    this.buildHud()
    this.refreshHud()
  }

  private freshTower(): OrderTower {
    return startOrder({
      level: LEVEL_1,
      orders: [],
      current: { events: [], state: { status: "empty", lastSeq: 0 } },
      metrics: {
        orders_completed: 0,
        events_appended: 0,
        invalid_transitions_rejected: 0,
        invalid_transitions_accepted: 0,
        outbox_backlog_peak: 0,
        projection_lag_peak_events: 0,
        saga_compensations: 0,
        replay_performed: false,
        projection_desync_after_replay: false,
      },
      outbox_backlog: 0,
      publisher_on: true,
      projection: { orderIndex: 1, state: { status: "empty", lastSeq: 0 } },
      failed: false,
      failure_reason: null,
    })
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x6c7daa, 0.6)
    const dir = new THREE.DirectionalLight(0xffffff, 0.7)
    dir.position.set(6, 12, 4)
    const point = new THREE.PointLight(0x5ad7ff, 1.4, 30)
    point.position.set(0, 6, 0)
    this.scene.add(ambient, dir, point)
  }

  private setupGround(): void {
    const grid = new THREE.GridHelper(40, 40, 0x2a3556, 0x1a2240)
    grid.position.y = -0.01
    this.scene.add(grid)
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshBasicMaterial({ color: 0x121830, transparent: true, opacity: 0.6 }),
    )
    disc.rotation.x = -Math.PI / 2
    this.scene.add(disc)
  }

  private setupTowerBase(): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a3556, roughness: 0.7, metalness: 0.4 }),
    )
    base.position.y = 0.15
    this.towerGroup.add(base)
    // Ring marker for "tower top" — the player's append target.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x5ad7ff }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.32
    ring.name = "towerTopRing"
    this.towerGroup.add(ring)
  }

  private setupSphere(): void {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x5ad7ff,
        emissive: 0x2a4d66,
        emissiveIntensity: 0.5,
        roughness: 0.4,
        metalness: 0.2,
      }),
    )
    sphere.position.set(4.2, 1, 0)
    this.sphereMesh = sphere
    this.sphereGroup.add(sphere)

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a3556, roughness: 0.6, metalness: 0.4 }),
    )
    pedestal.position.set(4.2, 0.1, 0)
    this.sphereGroup.add(pedestal)
  }

  private setupOutboxRail(): void {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.06, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x404a6e,
        emissive: 0x1a1f33,
        emissiveIntensity: 0.4,
      }),
    )
    rail.position.set(-3.6, 0.5, 0)
    this.outboxGroup.add(rail)
    // Outbox label post
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.6, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0x664d1f,
        emissiveIntensity: 0.5,
      }),
    )
    post.position.set(-3.6, 0.85, 0)
    this.outboxGroup.add(post)
  }

  private setupBeacon(): void {
    // Pub/Sub Beacon sits between outbox and sphere. Publisher-on: it pulses
    // green (tokens ferry through). Publisher-off: it pulses amber (tokens
    // stuck on the rail).
    const beacon = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.2, 4),
      new THREE.MeshStandardMaterial({
        color: 0x66ff99,
        emissive: 0x2a6633,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.3,
      }),
    )
    beacon.position.set(-0.5, 0.7, 0)
    beacon.rotation.y = Math.PI / 4
    beacon.name = "beacon"
    this.beaconGroup.add(beacon)
  }

  private setupCrank(): void {
    // Replay crank orbits the tower — visual hint that the log is replayable.
    const crank = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.05, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xff9f5a, transparent: true, opacity: 0.6 }),
    )
    crank.rotation.x = Math.PI / 2
    crank.position.y = 0.5
    crank.name = "crank"
    this.crankGroup.add(crank)
  }

  private setupBeam(): void {
    // Beam from beacon (sits between outbox and sphere) up to the sphere.
    // A static line whose endpoints we update each frame.
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0.7, 0),
      new THREE.Vector3(4.2, 1, 0),
    ])
    const mat = new THREE.LineBasicMaterial({ color: 0x5ad7ff, transparent: true, opacity: 0.5 })
    this.beamLine = new THREE.Line(geo, mat)
    this.scene.add(this.beamLine)
  }

  private buildHud(): void {
    const chip = document.createElement("div")
    chip.className = "hud hud-chip objective-chip"
    chip.innerHTML = `
      <div class="title">TIMELINE TOWER</div>
      <div class="sub">Event-sourced order lifecycle &middot; L1</div>
      <div class="sub" data-role="scenario">scenario_id: timeline-tower-L1</div>
    `
    this.root.appendChild(chip)

    const status = document.createElement("div")
    status.className = "hud hud-chip status-strip"
    status.innerHTML = `<h2>Level 1 &middot; Projection Lag</h2>
      <table data-role="status-table"></table>`
    this.root.appendChild(status)
    this.statusEl = status.querySelector("table")

    const prompts = document.createElement("div")
    prompts.className = "hud prompt-strip"
    prompts.innerHTML = `
      <span class="prompt-chip"><span class="key">SPC</span>Append next event</span>
      <span class="prompt-chip danger"><span class="key">X</span>Negative test (rejected)</span>
      <span class="prompt-chip"><span class="key">V</span>Query projection</span>
      <span class="prompt-chip"><span class="key">E</span>Toggle publisher</span>
      <span class="prompt-chip"><span class="key">Q</span>Replay log</span>
      <span class="prompt-chip"><span class="key">&larr; &rarr;</span>Orbit camera</span>
    `
    this.root.appendChild(prompts)

    const next = document.createElement("div")
    next.className = "next-event"
    next.innerHTML = `<span class="label">NEXT FLOOR:</span><span class="kind">OrderCreated</span>`
    this.root.appendChild(next)
    this.nextEventEl = next

    const flash = document.createElement("div")
    flash.className = "flash"
    flash.style.display = "none"
    this.root.appendChild(flash)
    this.flashEl = flash
  }

  private refreshHud(): void {
    const t = this.tower
    const q = queryProjection(t)
    const kind = nextValidKind(t.current.state) ?? "—"
    if (this.nextEventEl) {
      const kindEl = this.nextEventEl.querySelector(".kind")
      if (kindEl) {
        kindEl.textContent = kind
        kindEl.setAttribute(
          "style",
          `color: #${kind === "—" ? "8995ad" : (TOWER_KIND_COLORS[kind as OrderEventKind] ?? 0x5ad7ff).toString(16).padStart(6, "0")}`,
        )
      }
    }
    if (this.statusEl) {
      const eval_ = evaluateLevel(t, q.matches)
      const rows: Array<[string, string, boolean]> = [
        [
          "orders_completed",
          `${t.metrics.orders_completed}/${t.level.orders_target}`,
          t.metrics.orders_completed >= t.level.orders_target,
        ],
        ["events_appended", `${t.metrics.events_appended}`, t.metrics.events_appended > 0],
        [
          "invalid_rejected",
          `${t.metrics.invalid_transitions_rejected}`,
          t.metrics.invalid_transitions_rejected >= 1,
        ],
        [
          "invalid_accepted",
          `${t.metrics.invalid_transitions_accepted}`,
          t.metrics.invalid_transitions_accepted === 0,
        ],
        [
          "outbox_backlog",
          `${t.outbox_backlog} (peak ${t.metrics.outbox_backlog_peak}/${t.level.outbox_overflow_threshold})`,
          t.outbox_backlog <= t.level.outbox_overflow_threshold,
        ],
        ["projection_lag", `${q.lag}`, q.lag === 0],
        ["publisher", t.publisher_on ? "ON" : "OFF", t.publisher_on],
      ]
      this.statusEl.innerHTML = rows
        .map(
          ([label, value, passed]) =>
            `<tr class="${passed ? "passed" : ""}"><td>${label}</td><td>${value}</td></tr>`,
        )
        .join("")
      void eval_
    }
  }

  private flash(kind: "reject" | "win" | "append", text: string): void {
    if (!this.flashEl) return
    this.flashEl.className = `flash ${kind}`
    this.flashEl.innerHTML = `<div class="badge">${text}</div>`
    this.flashEl.style.display = "flex"
    window.setTimeout(() => {
      if (this.flashEl) this.flashEl.style.display = "none"
    }, 1100)
  }

  // ---- Input ----

  private handleKey(code: string): void {
    if (this.tower.failed && code !== "KeyR") {
      return
    }
    switch (code) {
      case "Space":
        this.tryAppendNext()
        break
      case "KeyX":
        this.tryInvalid()
        break
      case "KeyV":
        this.tryQuery()
        break
      case "KeyE":
        this.tower = togglePublisher(this.tower)
        this.refreshHud()
        break
      case "KeyQ":
        this.tower = performReplay(this.tower)
        this.refreshHud()
        if (!this.tower.metrics.projection_desync_after_replay) {
          this.flash("append", "Replay OK")
        } else {
          this.flash("reject", "Replay desync")
        }
        break
      case "ArrowLeft":
        this.cameraAngle -= 0.18
        break
      case "ArrowRight":
        this.cameraAngle += 0.18
        break
      default:
        break
    }
  }

  private tryAppendNext(): void {
    // Auto-advance to a fresh order if the current one is terminal, so a
    // single SPACE press moves seamlessly from OrderDelivered to OrderCreated
    // of the next order. appendKind also auto-advances internally, but we
    // pre-compute the post-advance state to find the next-valid kind here.
    let working = this.tower
    if (nextValidKind(working.current.state) === null && working.current.events.length > 0) {
      working = startOrder(working)
    }
    const kind = nextValidKind(working.current.state)
    if (kind === null) {
      this.refreshHud()
      return
    }
    const r = appendKind(working, kind, Date.now())
    if (r.ok) {
      this.tower = r.tower
      const ev = this.tower.current.events.at(-1)
      if (ev) {
        this.appendFloor(ev)
      }
      if (this.tower.outbox_backlog > 0) {
        this.refreshOutboxTokens()
      } else {
        this.clearOutboxTokens()
      }
      this.flash("append", `+ ${kind}`)
    } else {
      this.tower = r.tower
    }
    this.refreshHud()
    this.maybeWin()
  }

  private tryInvalid(): void {
    const kind = pickInvalidKind(this.tower.current.state)
    const before = this.tower.metrics.invalid_transitions_rejected
    const r = appendKind(this.tower, kind, Date.now())
    this.tower = r.tower
    const after = this.tower.metrics.invalid_transitions_rejected
    if (after > before) {
      this.flash("reject", "REJECTED")
    } else {
      // Should never happen — but if it does, fail loudly.
      this.flash("reject", "ACCEPTED (BUG)")
    }
    this.refreshHud()
  }

  private tryQuery(): void {
    const q = queryProjection(this.tower)
    if (q.matches) {
      this.flash("append", "Projection caught up")
    } else {
      this.flash("reject", `Lag ${q.lag}`)
    }
    this.refreshHud()
    this.maybeWin()
  }

  private maybeWin(): void {
    if (this.evidenceEmitted) return
    const q = queryProjection(this.tower)
    const eval_ = evaluateLevel(this.tower, q.matches)
    if (eval_.passed && !this.tower.failed) {
      this.evidenceEmitted = true
      const record = buildEvidence(this.tower, eval_, "timeline-tower-L1", new Date())
      emitEvidence(record)
      this.flash("win", "Level Cleared")
    }
  }

  // ---- 3D ----

  private appendFloor(event: OrderEvent): void {
    const floorHeight = 0.5
    const y = 0.32 + (event.seq - 0.5) * floorHeight
    const color = TOWER_KIND_COLORS[event.kind]
    const geo = new THREE.BoxGeometry(2.0, floorHeight * 0.85, 2.0)
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.3,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, y, 0)
    mesh.scale.setScalar(0.01)
    this.towerGroup.add(mesh)
    this.floors.push({ kind: event.kind, seq: event.seq, mesh })

    // Lift the tower-top ring to sit just above the new floor.
    const ring = this.towerGroup.getObjectByName("towerTopRing")
    if (ring) {
      ring.position.y = 0.32 + event.seq * floorHeight
    }

    // Re-position the projection sphere to track the projection's lastSeq.
    // The sphere hovers at the height matching the *projected* sequence
    // (lagged when publisher off; matches the tower top when caught up).
    const sphereY = 0.7 + this.tower.projection.state.lastSeq * floorHeight
    this.sphereMesh.position.y = sphereY
    this.updateBeam()
  }

  private updateBeam(): void {
    // Update the beam endpoints so it always spans beacon -> sphere center.
    const positions = this.beamLine.geometry.attributes["position"]
    if (!positions) return
    const array = positions.array
    if (array instanceof Float32Array && array.length >= 6) {
      const beaconY = 0.7
      array[3] = this.sphereMesh.position.x
      array[4] = this.sphereMesh.position.y
      array[5] = this.sphereMesh.position.z
      array[0] = -0.5
      array[1] = beaconY
      array[2] = 0
    }
    positions.needsUpdate = true
  }

  private refreshOutboxTokens(): void {
    this.clearOutboxTokens()
    const count = Math.min(this.tower.outbox_backlog, 6)
    for (let i = 0; i < count; i += 1) {
      const token = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 0.25),
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0x665016,
          emissiveIntensity: 0.6,
        }),
      )
      token.position.set(-3.6 + (i - count / 2) * 0.35, 0.7, 0)
      this.outboxGroup.add(token)
      this.outboxTokens.push(token)
    }
  }

  private clearOutboxTokens(): void {
    for (const token of this.outboxTokens) {
      this.outboxGroup.remove(token)
      token.geometry.dispose()
      ;(token.material as THREE.Material).dispose()
    }
    this.outboxTokens.length = 0
  }

  private updateBeacon(): void {
    const beacon = this.beaconGroup.getObjectByName("beacon")
    if (!beacon) return
    const mat = (beacon as THREE.Mesh).material as THREE.MeshStandardMaterial
    if (this.tower.publisher_on) {
      mat.color.setHex(0x66ff99)
      mat.emissive.setHex(0x2a6633)
    } else {
      mat.color.setHex(0xffd166)
      mat.emissive.setHex(0x665016)
    }
  }

  start(): void {
    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("resize", this.onResize)
    this.exposeDebug()
    this.renderer.setAnimationLoop(this.animate)
  }

  private readonly onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private readonly animate = () => {
    const dt = this.clock.getDelta()
    const elapsed = this.clock.elapsedTime
    // Floor spawn scale-in.
    for (const floor of this.floors) {
      const target = 1
      const s = floor.mesh.scale.x
      const next = s + (target - s) * Math.min(1, dt * 8)
      floor.mesh.scale.setScalar(next)
      // Gentle bob.
      floor.mesh.position.y += Math.sin(elapsed * 1.5 + floor.seq) * 0.0005
    }
    // Sphere gentle bob.
    this.sphereMesh.position.y += Math.sin(elapsed * 1.2) * 0.001
    // Crank slow orbit.
    this.crankGroup.rotation.y += dt * 0.6
    // Camera orbit.
    const radius = 11
    this.camera.position.x = Math.cos(this.cameraAngle) * radius
    this.camera.position.z = Math.sin(this.cameraAngle) * radius
    this.camera.position.y = 5 + Math.sin(this.cameraAngle * 0.5) * 1.2
    this.camera.lookAt(0, this.floors.length * 0.25 + 1, 0)

    // Pulse beacon emissive intensity.
    const beacon = this.beaconGroup.getObjectByName("beacon")
    if (beacon) {
      const mat = (beacon as THREE.Mesh).material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.5 + Math.sin(elapsed * 4) * 0.25
    }
    // Beam opacity pulse.
    const beamMat = this.beamLine.material as THREE.LineBasicMaterial
    beamMat.opacity = 0.4 + Math.sin(elapsed * 3) * 0.2

    this.updateBeacon()
    this.renderer.render(this.scene, this.camera)
  }

  private exposeDebug(): void {
    window.__timelineTowerDebug = {
      getState: () => this.tower.current.state.status,
      getMetrics: () => ({ ...this.tower.metrics }),
      press: (key: string) => this.handleKey(key),
      replay: () => {
        this.tower = performReplay(this.tower)
        this.refreshHud()
      },
    }
  }
}

const root = document.querySelector<HTMLDivElement>("#app")
if (root === null) {
  throw new Error("Missing #app root")
}
new TimelineTowerGame(root).start()

// Side-effect import guard: ORDER_EVENT_KINDS is used to keep the renderer's
// kind enumeration in sync with the logic module's authoritative list.
void ORDER_EVENT_KINDS
