import type { MissionProjection } from "./projection"

export type AccessibleProjectionSummary = {
  readonly title: string
  readonly status: string
  readonly description: string
  readonly details?: readonly string[]
}

export type AccessibleProjectionAction = {
  readonly id: string
  readonly label: string
  readonly run: () => void
  readonly pressed?: boolean
}

export type AccessibleProjectionOptions<TSnapshot> = {
  readonly label: string
  readonly summarize: (snapshot: TSnapshot) => AccessibleProjectionSummary
  readonly actions?: (snapshot: TSnapshot) => readonly AccessibleProjectionAction[]
  readonly controlsTarget?: HTMLElement
}

export type AccessibleProjectionModel = {
  readonly summary: AccessibleProjectionSummary
  readonly actions: readonly AccessibleProjectionAction[]
}

export function createAccessibleProjectionModel<TSnapshot>(
  options: AccessibleProjectionOptions<TSnapshot>,
  snapshot: TSnapshot,
): AccessibleProjectionModel {
  return {
    summary: options.summarize(snapshot),
    actions: options.actions?.(snapshot) ?? [],
  }
}

export class AccessibleProjection<TSnapshot> implements MissionProjection<TSnapshot> {
  private root: HTMLElement | null = null
  private latestSnapshot: TSnapshot | undefined
  private disposed = false

  constructor(private readonly options: AccessibleProjectionOptions<TSnapshot>) {}

  mount(target: HTMLElement): void {
    if (this.disposed) return
    target.replaceChildren()
    const root = document.createElement("section")
    root.className = "accessible-projection"
    root.dataset.testid = "accessible-projection"
    root.setAttribute("role", "region")
    root.setAttribute("aria-label", this.options.label)
    root.tabIndex = -1
    target.append(root)
    this.root = root
    if (this.latestSnapshot !== undefined) this.render(this.latestSnapshot)
  }

  sync(snapshot: TSnapshot): void {
    if (this.disposed) return
    this.latestSnapshot = snapshot
    this.render(snapshot)
  }

  focus(): void {
    this.root?.focus()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.root?.remove()
    this.root = null
  }

  private render(snapshot: TSnapshot): void {
    const root = this.root
    if (root === null) return
    const model = createAccessibleProjectionModel(this.options, snapshot)
    const summary = model.summary
    root.replaceChildren()

    const eyebrow = document.createElement("p")
    eyebrow.className = "accessible-projection__eyebrow"
    eyebrow.textContent = "Visualização sem WebGL"
    const heading = document.createElement("h2")
    heading.textContent = summary.title
    const status = document.createElement("p")
    status.dataset.testid = "accessible-status"
    status.setAttribute("role", "status")
    status.setAttribute("aria-live", "polite")
    status.textContent = summary.status
    const description = document.createElement("p")
    description.textContent = summary.description
    root.append(eyebrow, heading, status, description)

    if (summary.details !== undefined && summary.details.length > 0) {
      const list = document.createElement("ul")
      list.setAttribute("aria-label", "Estado atual da simulação")
      for (const detail of summary.details) {
        const item = document.createElement("li")
        item.textContent = detail
        list.append(item)
      }
      root.append(list)
    }

    const actions = model.actions
    if (actions.length > 0) {
      const controls = document.createElement("div")
      controls.className = "accessible-projection__controls"
      controls.setAttribute("role", "group")
      controls.setAttribute("aria-label", "Decisões da missão")
      for (const action of actions) {
        const button = document.createElement("button")
        button.type = "button"
        button.dataset.testid = `accessible-${action.id}`
        button.textContent = action.label
        if (action.pressed !== undefined) button.setAttribute("aria-pressed", String(action.pressed))
        button.addEventListener("click", action.run)
        controls.append(button)
      }
      root.append(controls)
    }

    if (this.options.controlsTarget !== undefined) {
      const focusControls = document.createElement("button")
      focusControls.type = "button"
      focusControls.dataset.testid = "accessible-focus-controls"
      focusControls.textContent = "Ir para os controles detalhados"
      focusControls.addEventListener("click", () => {
        const control = this.options.controlsTarget?.querySelector<HTMLElement>("button, input")
        control?.focus()
      })
      root.append(focusControls)
    }
  }
}
