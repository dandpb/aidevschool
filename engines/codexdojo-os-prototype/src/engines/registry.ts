import type { EngineDefinition, EngineUrlState } from './protocol'

export const engineRegistry = [
  {
    id: 'codexDojo',
    name: 'codexDojo Dashboard',
    role: 'Painel operacional',
    capability: 'Navegue pelos agentes, projetos, ciclo e prompts do painel real.',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_CODEXDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5175/',
    },
  },
  {
    id: 'minimaxDojo',
    name: 'minimaxDojo Tutor Core',
    role: 'Núcleo de tutoria de referência',
    capability: 'Execute o contrato determinístico do núcleo Python sem alterar o aprendiz.',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'local-bridge',
      action: 'run-reference-contract',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'miniMaxEvolutionEngine',
    name: 'MiniMax Evolution Engine',
    role: 'Motor de orquestração Claude Code',
    capability: 'Valide o protocolo PhaseRunner antes de iniciar uma sessão Claude Code.',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'local-bridge',
      action: 'validate-phase-runner',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    role: 'Runner de checklist',
    capability: 'Pré-visualize o checklist real sem avançar o pipeline YAML.',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'local-bridge',
      action: 'preview-checklist',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'pixelDojo',
    name: 'PixelDojo Quest',
    role: 'Jogo didático 2D',
    capability: 'Jogue encontros reais e produza evidência bruta para um verificador separado.',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_PIXELDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5176/',
    },
  },
  {
    id: 'voxelDojo',
    name: 'voxelDojo',
    role: 'Simulações didáticas 3D',
    capability: 'Opere o HASH RING real como entrada para o catálogo voxelDojo.',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_VOXELDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5177/',
    },
  },
] as const satisfies readonly EngineDefinition[]

export function resolveEngineUrl(
  configuredUrl: string | undefined,
  developmentUrl: string,
  development: boolean,
  hostOrigin = typeof window === 'undefined' ? undefined : window.location.origin,
): EngineUrlState {
  const candidate = configuredUrl?.trim() || (development ? developmentUrl : '')
  if (candidate === '') {
    return { kind: 'unavailable', reason: 'Engine runtime is not configured.' }
  }

  try {
    const url = new URL(candidate)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (hostOrigin !== undefined && url.origin === hostOrigin) {
        return {
          kind: 'unavailable',
          reason: 'Engine runtime must use a separate origin from the OS.',
        }
      }
      return { kind: 'ready', url: candidate }
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
  }

  return { kind: 'unavailable', reason: 'Engine runtime URL is unsafe or malformed.' }
}
