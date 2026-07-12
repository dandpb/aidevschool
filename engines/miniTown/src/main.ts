import { installE2EContract } from "./evidence/e2e.contract"
import { TownController } from "./game/controller"

/**
 * Entry point. Wires the DOM host, the TownController (which builds its own
 * canvas, scene, lights, and ground), and the test hook. HUD rendering is
 * stubbed for now — later tasks will replace `mountHud` with a real panel.
 */
function bootstrap(host: HTMLElement): TownController {
  const controller = new TownController(host, { initialSimTime: 8 })
  installE2EContract(controller)

  // Smoke log so the e2e contract and dev server presence are easy to confirm
  // from the devtools console while the HUD hasn't been built yet.
  mountHudStub(host, controller)

  controller.start()
  return controller
}

function mountHudStub(host: HTMLElement, controller: TownController): void {
  const hud = document.createElement("div")
  hud.id = "hud-stub"
  hud.style.position = "absolute"
  hud.style.top = "12px"
  hud.style.left = "12px"
  hud.style.padding = "8px 12px"
  hud.style.background = "rgba(11, 14, 20, 0.7)"
  hud.style.color = "#e6e9f2"
  hud.style.font = "12px/1.4 ui-monospace, Menlo, monospace"
  hud.style.border = "1px solid #3d4663"
  hud.style.borderRadius = "6px"
  hud.style.pointerEvents = "none"
  hud.textContent = "MiniTown — engine skeleton (HUD placeholder)"
  host.appendChild(hud)

  controller.onChange((snapshot) => {
    hud.textContent = `MiniTown — ${snapshot.phase}  simTime=${snapshot.simTime.toFixed(2)}h`
  })
  // Single console signal so devs can confirm the bootstrap completed.
  // eslint-disable-next-line no-console
  console.log("[miniTown] mounted", controller.snapshot)
}

const host = document.getElementById("app")
if (!host) {
  throw new Error("MiniTown bootstrap: missing #app element")
}
bootstrap(host)
