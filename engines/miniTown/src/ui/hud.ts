import type { MiniTownRuntime } from "../game/runtime"
import type { ZoneType } from "../game/townLife"

const NAMES = ["Nora", "Milo", "Aya", "Jules", "Pip", "Sana"] as const
const LABELS = { residential: "Residential", shop: "Shop", workspace: "Workspace" } as const
type Tool = ZoneType | "explore"

export function mountHud(host: HTMLElement, controller: MiniTownRuntime): void {
  const hud = document.createElement("section")
  hud.className = "hud"
  hud.innerHTML = `<header class="hud-top"><div class="wordmark"><b>M</b><span>MiniTown</span></div><div class="time-card"><i id="time-icon">☀</i><strong id="clock">08:00</strong><span id="phase">Morning</span><em><span id="progress"></span></em></div></header><aside class="tool-palette"><p>PLACE A LITTLE LIFE</p><button data-tool="explore" class="active">◌ <span>Explore</span></button><button data-tool="residential">⌂ <span>Residential</span></button><button data-tool="shop">▰ <span>Shop</span></button><button data-tool="workspace">▥ <span>Workspace</span></button><small id="mode-copy">Drag the camera and watch the town.</small></aside><aside class="hover-card" id="hover-card"><span>THE MEADOW IS QUIET</span><h2>Start wherever feels right.</h2><p>Choose a zone, then drag across up to three nearby plots. Roads wrap only the block exterior.</p></aside><div class="hud-tip">Drag 1–3 connected plots · Scroll to zoom</div>`
  host.appendChild(hud)
  const palette = hud.querySelector<HTMLElement>(".tool-palette"),
    modeCopy = hud.querySelector<HTMLElement>("#mode-copy"),
    hover = hud.querySelector<HTMLElement>("#hover-card"),
    clock = hud.querySelector<HTMLElement>("#clock"),
    phase = hud.querySelector<HTMLElement>("#phase"),
    icon = hud.querySelector<HTMLElement>("#time-icon"),
    progress = hud.querySelector<HTMLElement>("#progress")
  if (!palette || !modeCopy || !hover || !clock || !phase || !icon || !progress) return
  const setTool = (tool: Tool): void => {
    controller.setTool(tool === "explore" ? null : tool)
    for (const button of palette.querySelectorAll("button"))
      button.classList.toggle("active", button.dataset.tool === tool)
    modeCopy.textContent =
      tool === "explore"
        ? "Drag the camera and watch the town."
        : `Drag 1–3 plots to create one ${LABELS[tool]} block.`
  }
  for (const tool of ["explore", "residential", "shop", "workspace"] as const) {
    const button = palette.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`)
    if (button) button.addEventListener("click", () => setTool(tool))
  }
  controller.onChange((snapshot) => {
    const hour = Math.floor(snapshot.simTime),
      minute = Math.floor((snapshot.simTime % 1) * 60)
    clock.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    phase.textContent = snapshot.phase
    icon.textContent = snapshot.phase === "night" || snapshot.phase === "dusk" ? "☾" : "☀"
    progress.style.width = `${(snapshot.simTime / 24) * 100}%`
  })
  controller.onHover((blockId) => {
    const block = controller.life.blocks.find((entry) => entry.id === blockId)
    if (!block) return
    const people = controller.life.people.filter((person) => person.homeId === block.id),
      names =
        people.map((_, index) => NAMES[index % NAMES.length] ?? "Neighbor").join(", ") ||
        "No one yet",
      activity = people[0]?.activity ?? "under construction"
    hover.innerHTML = `<span>${LABELS[block.type].toUpperCase()} · ${block.buildings.length} BUILDING${block.buildings.length === 1 ? "" : "S"}</span><h2>${names}</h2><p>${activity}. ${block.buildings[0]?.stage === "inhabited" ? "Warm lights welcome them home after dark." : "The builders are still at work."}</p>`
  })
}
