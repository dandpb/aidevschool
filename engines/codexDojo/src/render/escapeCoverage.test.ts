import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type {
  Agent,
  CycleStage,
  DojoProject,
  EcosystemStatus,
  LearnerSnapshot,
  Metric,
  UserFacingAgent,
} from "../domain"
import { type LinuxApp, linuxAppCategoryLabels, linuxApps, renderLinuxLab } from "../linuxLab"
import { buildInitialState } from "../state"
import { renderAgents } from "./agents"
import { renderCycle } from "./cycle"
import { renderOverview } from "./overview"
import { renderProject } from "./project"
import { renderRoadmap } from "./roadmap"

// The app assigns render output to `root.innerHTML` (src/app.ts), so every
// dynamic value must flow through escapeHtml. This suite is the regression
// guard for audit item E4: it injects a <script> payload through every data
// seam the render modules read and asserts the markup neutralizes it.
const { XSS } = vi.hoisted(() => ({
  XSS: `<script>alert("codexDojo")</script>`,
}))

vi.mock("../progress", () => {
  const agent: Agent = {
    id: `agent-${XSS}`,
    name: `Sonda ${XSS}`,
    group: "leader",
    role: `role ${XSS}`,
    mission: `mission ${XSS}`,
    inputs: [`input ${XSS}`],
    outputs: [`output ${XSS}`],
    gate: `gate ${XSS}`,
    prompt: `prompt ${XSS}`,
  }

  const userFacingAgent: UserFacingAgent = {
    id: `mentor-${XSS}`,
    name: `Mentor ${XSS}`,
    responsibility: `responsibility ${XSS}`,
    expandsTo: [`expands ${XSS}`],
  }

  const stage: CycleStage = {
    id: `stage-${XSS}`,
    label: `label ${XSS}`,
    owner: `owner ${XSS}`,
    evidence: `evidence ${XSS}`,
    output: `output ${XSS}`,
  }

  const project: DojoProject = {
    id: `p99-${XSS}`,
    title: `title ${XSS}`,
    phase: "fundamentos",
    level: 7,
    language: `language ${XSS}`,
    architecture: `architecture ${XSS}`,
    learningGoal: `goal ${XSS}`,
    evidence: [`evidence ${XSS}`],
    functionalRequirements: [`functional ${XSS}`],
    nonFunctionalRequirements: [`non-functional ${XSS}`],
    extraDoneCriteria: [`done ${XSS}`],
  }

  const metric: Metric = {
    id: `metric-${XSS}`,
    label: `metric label ${XSS}`,
    target: `target ${XSS}`,
    signal: `signal ${XSS}`,
    measurement: `measurement ${XSS}`,
    evidencePath: `path ${XSS}`,
  }

  const ecosystemStatus: EcosystemStatus = {
    id: `status-${XSS}`,
    label: `status label ${XSS}`,
    state: `state ${XSS}`,
    evidence: `status evidence ${XSS}`,
    nextStep: `next step ${XSS}`,
  }

  const learnerSnapshot: LearnerSnapshot = {
    activeUnit: {
      id: `unit-${XSS}`,
      title: `unit title ${XSS}`,
      project: `unit project ${XSS}`,
      state: "presenting",
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      retryCount: `retryCount ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      retryLimit: `retryLimit ${XSS}` as any,
    },
    gate: {
      implementationBlocked: true,
      unblockCondition: `condition ${XSS}`,
    },
    profile: {
      dreyfus: "novice",
      bloom: "remember",
      activeLanguage: `language ${XSS}`,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      weeklyTimeHours: `weeklyTimeHours ${XSS}` as any,
    },
    aidi: {
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      current: `current ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      thresholdAmber: `thresholdAmber ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      thresholdRed: `thresholdRed ${XSS}` as any,
      measurementSource: "self_reported",
      trend: [{ date: `2026-01-01 ${XSS}`, value: 0.3, measurementSource: "self_reported" }],
    },
    topPitfalls: [
      {
        id: `pitfall-${XSS}`,
        description: `description ${XSS}`,
        // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
        occurrences: `occurrences ${XSS}` as any,
        lastSeen: `last seen ${XSS}`,
      },
    ],
    nextReviews: [
      {
        unitId: `review-unit-${XSS}`,
        title: `review title ${XSS}`,
        dueIn: `due ${XSS}`,
        reason: "due",
      },
    ],
    // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
    masteredCount: `masteredCount ${XSS}` as any,
    // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
    scaffoldedCount: `scaffoldedCount ${XSS}` as any,
    streak: {
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      current: `current ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      longest: `longest ${XSS}` as any,
      lastGateDate: `gate date ${XSS}`,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      freezesEquipped: `freezesEquipped ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      freezesMax: `freezesMax ${XSS}` as any,
    },
    // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
    curr: `curr ${XSS}` as any,
    challenges: [],
  }

  return {
    getAgents: (): readonly Agent[] => [agent],
    getSelectedAgent: (): Agent => agent,
    getUserFacingAgents: (): readonly UserFacingAgent[] => [userFacingAgent],
    getStages: (): readonly CycleStage[] => [stage],
    getCurrentStage: (): CycleStage => stage,
    isStageCompleted: (): boolean => false,
    getProjects: (): readonly DojoProject[] => [project],
    getCurrentProject: (): DojoProject => project,
    getSelectedProject: (): DojoProject => project,
    getMetrics: (): readonly Metric[] => [metric],
    getEcosystemStatuses: (): readonly EcosystemStatus[] => [ecosystemStatus],
    getLearnerSnapshot: (): LearnerSnapshot => learnerSnapshot,
    getDashboardStats: () => ({
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      agents: `agents ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      stages: `stages ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      projects: `projects ${XSS}` as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing XSS in numeric field
      completionPercent: `completionPercent ${XSS}` as any,
    }),
  }
})

const maliciousLinuxApp: LinuxApp = {
  id: `evil-${XSS}`,
  name: `Evil App ${XSS}`,
  category: "system",
  principle: `principle ${XSS}`,
  concept: `concept ${XSS}`,
  process: `process ${XSS}`,
  command: `command ${XSS}`,
  output: `terminal output ${XSS}`,
  exercise: `exercise ${XSS}`,
}

const originalLinuxApp = linuxApps[0]
const originalAllLabel = linuxAppCategoryLabels.all
const originalSystemLabel = linuxAppCategoryLabels.system

beforeAll(() => {
  Object.defineProperty(linuxApps, 0, {
    ...Object.getOwnPropertyDescriptor(linuxApps, 0),
    value: maliciousLinuxApp,
  })
  Object.defineProperty(linuxAppCategoryLabels, "all", {
    ...Object.getOwnPropertyDescriptor(linuxAppCategoryLabels, "all"),
    value: `All apps ${XSS}`,
  })
  Object.defineProperty(linuxAppCategoryLabels, "system", {
    ...Object.getOwnPropertyDescriptor(linuxAppCategoryLabels, "system"),
    value: `System ${XSS}`,
  })
})

afterAll(() => {
  Object.defineProperty(linuxApps, 0, {
    ...Object.getOwnPropertyDescriptor(linuxApps, 0),
    value: originalLinuxApp,
  })
  Object.defineProperty(linuxAppCategoryLabels, "all", {
    ...Object.getOwnPropertyDescriptor(linuxAppCategoryLabels, "all"),
    value: originalAllLabel,
  })
  Object.defineProperty(linuxAppCategoryLabels, "system", {
    ...Object.getOwnPropertyDescriptor(linuxAppCategoryLabels, "system"),
    value: originalSystemLabel,
  })
})

const state = buildInitialState("agent-x", "stage-x", "p99")

const renderers = [
  ["overview", renderOverview],
  ["agents", renderAgents],
  ["cycle", renderCycle],
  ["roadmap", renderRoadmap],
  ["project", renderProject],
  ["linuxLab", renderLinuxLab],
] as const

describe("escape coverage — render modules neutralize injected markup", () => {
  it.each(renderers)("%s: escapes <script> payloads from every data seam", (_name, render) => {
    const lower = render(state).toLowerCase()

    expect(lower).not.toContain("<script")
    expect(lower).toContain("&lt;script&gt;")
    expect(lower).not.toContain(XSS.toLowerCase())
  })

  // Structural backstop: every render module that interpolates loaded data
  // must import the shared escape util. Catches new modules that assemble
  // HTML without ever reaching for escapeHtml, even before a payload test
  // covers them.
  const modulesRequiringEscape = [
    "agents.ts",
    "cycle.ts",
    "learner.ts",
    "../linuxLab/render.ts",
    "nav.ts",
    "overview.ts",
    "project.ts",
    "roadmap.ts",
  ]

  it.each(modulesRequiringEscape)("%s imports escapeHtml from ./escape", (moduleFile) => {
    const source = readFileSync(fileURLToPath(new URL(moduleFile, import.meta.url)), "utf8")

    expect(source).toMatch(/import \{ escapeHtml \} from "(?:\.\/|\.\.\/render\/)escape"/)
  })
})
