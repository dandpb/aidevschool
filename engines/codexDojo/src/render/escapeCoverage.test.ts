import { describe, expect, it, vi } from "vitest"
import type {
  Agent,
  CycleStage,
  DojoProject,
  EcosystemStatus,
  LearnerSnapshot,
  Metric,
  UserFacingAgent,
} from "../domain"
import { renderLinuxLab } from "../linuxLab"
import { buildInitialState } from "../state"
import { renderAgents } from "./agents"
import { renderCycle } from "./cycle"
import { renderLearnerDashboard } from "./learner"
import { renderOverview } from "./overview"
import { renderProject } from "./project"
import { renderRoadmap } from "./roadmap"

// The app assigns render output to `root.innerHTML` (src/app.ts), so every
// dynamic value must flow through escapeHtml. This suite is the regression
// guard for audit item E4: it injects a <script> payload through every data
// seam the render modules read and asserts the markup neutralizes it.
const { XSS, agent, userFacingAgent, stage, project, metric, ecosystemStatus, learnerSnapshot } =
  vi.hoisted(() => {
    const XSS = `<script>alert("codexDojo")</script>`

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
        state: "evaluating",
        retryCount: 1,
        retryLimit: 3,
      },
      gate: {
        implementationBlocked: true,
        unblockCondition: `condition ${XSS}`,
      },
      profile: {
        dreyfus: "competent",
        bloom: "apply",
        activeLanguage: `language ${XSS}`,
        weeklyTimeHours: 5,
      },
      aidi: {
        // biome-ignore lint/suspicious/noExplicitAny: injecting XSS string payload to simulate unvalidated external data
        current: XSS as any,
        // biome-ignore lint/suspicious/noExplicitAny: injecting XSS string payload to simulate unvalidated external data
        thresholdAmber: XSS as any,
        // biome-ignore lint/suspicious/noExplicitAny: injecting XSS string payload to simulate unvalidated external data
        thresholdRed: XSS as any,
        measurementSource: "self_reported",
        trend: [
          {
            date: `2026-01-01 ${XSS}`,
            value: 0.4,
            measurementSource: "event_computed",
          },
        ],
      },
      topPitfalls: [
        {
          id: `pitfall-${XSS}`,
          description: `description ${XSS}`,
          occurrences: 1,
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
      masteredCount: 1,
      scaffoldedCount: 2,
      streak: {
        current: 1,
        longest: 2,
        lastGateDate: `gate date ${XSS}`,
        freezesEquipped: 1,
        freezesMax: 2,
      },
      // biome-ignore lint/suspicious/noExplicitAny: injecting XSS string payload to simulate unvalidated external data
      curr: XSS as any,
      challenges: [],
    }

    return {
      XSS,
      agent,
      userFacingAgent,
      stage,
      project,
      metric,
      ecosystemStatus,
      learnerSnapshot,
    }
  })

vi.mock("../data/agents", () => ({
  agents: [agent],
  userFacingAgents: [userFacingAgent],
}))

vi.mock("../data/cycle", () => ({
  cycleStages: [stage],
  metrics: [metric],
}))

vi.mock("../data/ecosystem", () => ({
  ecosystemStatuses: [ecosystemStatus],
}))

vi.mock("../data/learner", () => ({
  learnerSnapshot,
}))

vi.mock("../data/projects", () => ({
  projects: [project],
}))

vi.mock("../data/osEngine", () => ({
  getCodexDojoOsUrl: () => `https://evil.example/?q=${XSS}`,
}))

const state = buildInitialState(agent.id, stage.id, project.id)

const renderers = [
  ["overview", renderOverview],
  ["agents", renderAgents],
  ["cycle", renderCycle],
  ["roadmap", renderRoadmap],
  ["project", renderProject],
  ["linuxLab", renderLinuxLab],
  ["learner", () => renderLearnerDashboard()],
] as const

describe("escape coverage — render modules neutralize injected markup", () => {
  it.each(renderers)("%s: escapes <script> payloads from every data seam", (_name, render) => {
    const lower = render(state).toLowerCase()

    expect(lower).not.toContain("<script")
    expect(lower).toContain("&lt;script&gt;")
    expect(lower).not.toContain(XSS.toLowerCase())
  })

  it("escapes a malformed Linux Lab run count in every output seam", () => {
    const malformedState = {
      ...state,
      // biome-ignore lint/suspicious/noExplicitAny: simulate corrupted runtime substrate data
      linuxLabRunCount: XSS as any,
    }
    const html = renderLinuxLab(malformedState).toLowerCase()

    expect(html).not.toContain("<script")
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain(XSS.toLowerCase())
  })
})
