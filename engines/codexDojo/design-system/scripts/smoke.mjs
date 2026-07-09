// Renders every component to static markup and asserts the real class
// vocabulary shows up. Fails loud if a wrapper drifts from the stylesheet.
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement as h } from "react"
import * as DS from "../dist/index.js"

const cases = [
  [h(DS.AppShell, null, "x"), ["app-shell"]],
  [h(DS.Sidebar, { brandMark: "CD", brandName: "codexDojo", tagline: "lab" }), ["sidebar", "brand-block", "brand-mark"]],
  [h(DS.NavStack, null, "x"), ["nav-stack"]],
  [h(DS.NavButton, { active: true }, "Overview"), ["nav-button", "is-active", 'aria-current="page"']],
  [h(DS.ContentShell, null, "x"), ["content-shell"]],
  [h(DS.Eyebrow, null, "x"), ["eyebrow"]],
  [h(DS.Lead, null, "x"), ["lead"]],
  [h(DS.SectionHeading, null, "x"), ["section-heading"]],
  [h(DS.Panel, null, "x"), ["panel"]],
  [h(DS.Panel, { hero: true }, "x"), ["command-panel"]],
  [h(DS.ActionButton, null, "Go"), ["action-button"]],
  [h(DS.ActionButton, { variant: "secondary" }, "Go"), ["action-button", "secondary"]],
  [h(DS.IconButton, null, "+"), ["icon-button"]],
  [h(DS.FilterButton, { active: true }, "All"), ["filter-button", "is-active"]],
  [h(DS.InlineLink, null, "more"), ["inline-link"]],
  [h(DS.Meter, { value: 120, label: "p" }), ["meter", 'aria-valuenow="100"', "width:100%"]],
  [h(DS.StatGrid, { items: [{ label: "Agentes", value: 14 }] }), ["stat-grid", "<dt>Agentes</dt>", "<dd>14</dd>"]],
  [h(DS.Topology, null, "x"), ["topology"]],
  [h(DS.AgentNode, null, "professor"), ["agent-node"]],
  [h(DS.StageChip, { owner: "verifier" }, "Gate"), ["stage-chip", "verifier"]],
  [h(DS.Pill, { variant: "state", tone: "mastered" }, "mastered"), ["state-pill", "state-mastered"]],
  [h(DS.Pill, { variant: "gate", tone: "blocked" }, "blocked"), ["gate-pill", "gate-blocked"]],
  [h(DS.Pill, { variant: "retry" }, "2x"), ["retry-pill"]],
  [h(DS.Sparkline, { points: [0.2, 0.8, 0.5], label: "AIDI" }), ["aidi-spark", "aidi-bg", "aidi-line"]],
  [h(DS.Sparkline, { points: [] }), ["aidi-spark", "aidi-bg"]],
]

for (const [element, expected] of cases) {
  const html = renderToStaticMarkup(element)
  for (const needle of expected) {
    assert.ok(html.includes(needle), `expected ${JSON.stringify(needle)} in: ${html}`)
  }
}

console.log(`smoke ok — ${cases.length} renders`)
