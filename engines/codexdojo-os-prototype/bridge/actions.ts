import type { EngineId } from '../src/engines/protocol'

export type AllowedAction = {
  readonly engineId: EngineId
  readonly action: string
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly timeoutMs: number
}

export type ProcessReceipt = {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

export type ActionExecutor = (spec: AllowedAction) => Promise<ProcessReceipt>

export const allowedActions = [
  {
    engineId: 'minimaxDojo',
    action: 'run-reference-contract',
    executable: 'python3',
    args: ['-m', 'unittest', 'engines.minimaxDojo.tests.test_learning_unit_e2e_contract', '-q'],
    cwd: '../..',
    timeoutMs: 30_000,
  },
  {
    engineId: 'miniMaxEvolutionEngine',
    action: 'validate-phase-runner',
    executable: 'python3',
    args: ['engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests/test_phaserunner.py'],
    cwd: '../..',
    timeoutMs: 30_000,
  },
  {
    engineId: 'openclaw',
    action: 'preview-checklist',
    executable: 'python3',
    args: ['-m', 'engines.openclaw', '--preview'],
    cwd: '../..',
    timeoutMs: 10_000,
  },
] as const satisfies readonly AllowedAction[]

export function resolveAllowedAction(engineId: string, action: string): AllowedAction | undefined {
  return allowedActions.find(
    (candidate) => candidate.engineId === engineId && candidate.action === action,
  )
}

export async function executeAllowedAction(
  engineId: string,
  action: string,
  executor: ActionExecutor,
): Promise<ProcessReceipt | undefined> {
  const spec = resolveAllowedAction(engineId, action)
  return spec === undefined ? undefined : executor(spec)
}
