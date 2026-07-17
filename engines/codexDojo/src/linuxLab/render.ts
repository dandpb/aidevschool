import { getCodexDojoOsUrl } from "../data/osEngine"
import { pressedAttrs } from "../render/activeAttrs"
import { escapeHtml } from "../render/escape"
import type { AppState } from "../state"
import {
  getLinuxApp,
  getLinuxAppsForCategory,
  type LinuxApp,
  type LinuxAppCategoryFilter,
  linuxAppCategories,
  linuxAppCategoryLabels,
  linuxApps,
} from "./catalog"

const categoryFilters: readonly LinuxAppCategoryFilter[] = ["all", ...linuxAppCategories]

export function renderLinuxLab(state: AppState): string {
  const activeApp = getLinuxApp(state.selectedLinuxAppId)
  const visibleApps = getLinuxAppsForCategory(state.linuxAppCategoryFilter)

  return `
    <section class="linux-lab" aria-labelledby="linux-lab-title">
      <div class="section-heading linux-lab-heading">
        <p class="eyebrow">Linux desktop simulator</p>
        <h1 id="linux-lab-title">Linux Lab</h1>
        <p class="lead">
          Launch ${escapeHtml(linuxApps.length)} learning apps, run a small simulation, then connect the app to a programming principle.
        </p>
      </div>
      ${renderOsEngineBridge()}
      <div class="linux-desktop" aria-label="Linux Lab desktop">
        ${renderTopBar(activeApp, state.linuxLabRunCount)}
        <aside class="linux-launcher" aria-label="Linux applications">
          ${renderCategoryFilters(state.linuxAppCategoryFilter)}
          ${renderAppGrid(visibleApps, activeApp)}
        </aside>
        ${renderActiveWindow(activeApp, state.linuxLabRunCount)}
        ${renderLearningPanel(activeApp)}
      </div>
    </section>
  `
}

function renderOsEngineBridge(): string {
  const osUrl = getCodexDojoOsUrl()
  const action = osUrl
    ? `<a class="action-button" data-codexdojo-os-launch="true" href="${escapeHtml(osUrl)}" target="_blank" rel="noreferrer">Abrir codexDojo OS</a>`
    : `<p role="status">Configure <code>VITE_CODEXDOJO_OS_URL</code> para habilitar o workspace completo.</p>`

  return `
    <aside class="os-engine-bridge" aria-label="codexDojo OS workspace">
      <div>
        <strong>Workspace completo</strong>
        <p>Continue no engine de desktop com o mesmo snapshot canônico do learner.</p>
      </div>
      ${action}
    </aside>
  `
}

function renderTopBar(activeApp: LinuxApp, runCount: number): string {
  return `
    <div class="linux-topbar">
      <strong>Linux Lab</strong>
      <span>${escapeHtml(linuxApps.length)} apps installed</span>
      <span>Active: ${escapeHtml(activeApp.name)}</span>
      <span>${escapeHtml(runCount)} lab runs</span>
    </div>
  `
}

function renderCategoryFilters(activeFilter: LinuxAppCategoryFilter): string {
  return `
    <div class="linux-category-row" aria-label="Filter Linux apps">
      ${categoryFilters
        .map((filter) => {
          const { className, aria } = pressedAttrs(activeFilter === filter)
          return `
            <button class="linux-category ${className}" type="button" data-linux-category="${escapeHtml(filter)}"${aria}>
              ${escapeHtml(linuxAppCategoryLabels[filter])}
            </button>
          `
        })
        .join("")}
    </div>
  `
}

function renderAppGrid(apps: readonly LinuxApp[], activeApp: LinuxApp): string {
  return `
    <div class="linux-app-grid">
      ${apps
        .map((app) => {
          const { className, aria } = pressedAttrs(app.id === activeApp.id)
          return `
            <button class="linux-app-tile ${className}" type="button" data-linux-app="${escapeHtml(app.id)}"${aria}>
              <span class="linux-app-icon linux-category-${escapeHtml(app.category)}">${escapeHtml(appInitials(app.name))}</span>
              <span class="linux-app-name">${escapeHtml(app.name)}</span>
              <small>${escapeHtml(linuxAppCategoryLabels[app.category])}</small>
            </button>
          `
        })
        .join("")}
    </div>
  `
}

function renderActiveWindow(app: LinuxApp, runCount: number): string {
  const receipt =
    runCount === 0
      ? "Run the lab to create your first execution receipt."
      : `Execution receipt #${runCount}`

  return `
    <article class="linux-window" aria-labelledby="linux-window-title">
      <div class="linux-window-bar">
        <span></span>
        <span></span>
        <span></span>
        <strong id="linux-window-title">${escapeHtml(app.name)}</strong>
      </div>
      <div class="linux-window-body">
        <div class="linux-terminal">
          <span class="terminal-prompt">learner@linux-lab:~$</span>
          <code>${escapeHtml(app.command)}</code>
          <pre>${escapeHtml(app.output)}</pre>
        </div>
        <div class="linux-runner">
          <div>
            <span>Current principle</span>
            <strong>${escapeHtml(app.principle)}</strong>
          </div>
          <button class="action-button" type="button" data-action="run-linux-lab">Run Lab</button>
        </div>
        <p class="linux-receipt">${escapeHtml(receipt)}</p>
      </div>
    </article>
  `
}

function renderLearningPanel(app: LinuxApp): string {
  return `
    <aside class="linux-lesson" aria-label="${escapeHtml(app.name)} learning process">
      <div class="lesson-block">
        <span>Principle</span>
        <h2>${escapeHtml(app.principle)}</h2>
        <p>${escapeHtml(app.concept)}</p>
      </div>
      <div class="lesson-block">
        <span>Process</span>
        <p>${escapeHtml(app.process)}</p>
      </div>
      <div class="lesson-block">
        <span>Exercise</span>
        <p>${escapeHtml(app.exercise)}</p>
      </div>
      <ol class="learning-loop">
        <li><strong>Observe</strong><span>Read the app output before changing anything.</span></li>
        <li><strong>Run</strong><span>Execute the simulated command and note the state change.</span></li>
        <li><strong>Explain</strong><span>Connect the behavior to the CS concept in your own words.</span></li>
      </ol>
    </aside>
  `
}

function appInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
