import type { EngineDefinition, EngineUrlState } from './protocol'

export const engineRegistry = [
  {
    id: 'codexDojo',
    name: 'codexDojo Dashboard',
    role: 'Painel operacional',
    capability: 'Navegue pelos agentes, projetos, ciclo e prompts do painel real.',
    objective: 'Dar a contribuidores uma visão operacional do ecossistema e de seus artefatos.',
    startCommand: 'cd engines/codexDojo && pnpm run dev',
    evaluationFocus: 'Clareza operacional, fidelidade das projeções e ausência de uma segunda entrada learner-facing.',
    journeyClass: 'operations',
    portfolioStatus: 'internal',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_CODEXDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5175/',
      evidenceSource: null,
      missionProtocol: null,
    },
  },
  {
    id: 'minimaxDojo',
    name: 'minimaxDojo Tutor Core',
    role: 'Núcleo de tutoria de referência',
    capability: 'Prepare a sessão socrática real a partir do aprendiz e da configuração atuais.',
    objective: 'Testar contratos de tutoria socrática e feedback sem antecipar a solução.',
    startCommand: 'make test-core',
    evaluationFocus: 'Qualidade do feedback, respeito aos thresholds e tentativa antes de ajuda completa.',
    journeyClass: 'operations',
    portfolioStatus: 'internal',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'static-evaluation',
      action: 'prepare-tutor-session',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'miniMaxEvolutionEngine',
    name: 'MiniMax Evolution Engine',
    role: 'Motor de orquestração Claude Code',
    capability: 'Prepare o próximo comando Claude Code a partir do pipeline e do learning gate.',
    objective: 'Orquestrar produção supervisionada de currículo e engenharia em fases verificáveis.',
    startCommand: 'python3 -m engines.miniMaxEvolutionEngine.supervisor status',
    evaluationFocus: 'Separação produtor/verificador, autoridade das fases e qualidade dos artefatos.',
    journeyClass: 'operations',
    portfolioStatus: 'internal',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'static-evaluation',
      action: 'prepare-workflow',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    role: 'Runner de checklist',
    capability: 'Pré-visualize o checklist real sem avançar o pipeline YAML.',
    objective: 'Executar o ciclo de checklist de forma simples, auditável e reproduzível.',
    startCommand: 'python3 -m engines.openclaw --preview',
    evaluationFocus: 'Confiabilidade do checklist, preview sem mutação e recuperação de falhas.',
    journeyClass: 'operations',
    portfolioStatus: 'internal',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'static-evaluation',
      action: 'preview-checklist',
      sideEffect: 'read-only',
    },
  },
  {
    id: 'pixelDojo',
    name: 'PixelDojo Quest',
    role: 'Jogo didático 2D',
    capability: 'Jogue encontros reais e produza evidência bruta para um verificador separado.',
    objective: 'Ensinar conceitos de programação como mecânicas 2D operáveis.',
    startCommand: 'cd engines/pixelDojo && pnpm --filter pixel-quest dev -- --port 5176',
    evaluationFocus: 'Compreensão e transferência do conceito, acessibilidade e qualidade da evidência bruta.',
    journeyClass: 'teaching-game',
    portfolioStatus: 'supporting',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_PIXELDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5176/',
      evidenceSource: 'pixelquest',
      missionProtocol: null,
    },
  },
  {
    id: 'literacyDojo',
    name: 'LiteracyDojo',
    role: 'Microlições de IA para não programadores',
    capability: 'Teste tentativa, feedback, dica, retry e evidência estruturada da trilha IA na Prática.',
    objective: 'Ensinar pessoas não técnicas a usar e conferir IA por microlições práticas.',
    startCommand: 'cd engines/literacyDojo && npm run dev -- --port 5178',
    evaluationFocus: 'Ativação, retry, transferência no-code, privacidade e recibo independente.',
    journeyClass: 'micro-lesson',
    portfolioStatus: 'learner-facing',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_LITERACYDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5178/',
      evidenceSource: null,
      missionProtocol: '1.0',
    },
  },
  {
    id: 'miniTown',
    name: 'miniTown',
    role: 'Exploração Level 0',
    capability: 'Avalie a hipótese de orientação acolhedora sem confundir exploração com atividade avaliada.',
    objective: 'Testar se uma vila explorável melhora orientação e confiança antes da primeira missão.',
    startCommand: 'cd engines/miniTown && pnpm exec vite --host 127.0.0.1 --port 5179 --strictPort',
    evaluationFocus: 'Compreensão da proposta, tempo até a missão e custo de exploração; aprendizagem avaliada é NA.',
    journeyClass: 'explore-only',
    portfolioStatus: 'incubating',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_MINITOWN_URL',
      developmentUrl: 'http://127.0.0.1:5179/',
      evidenceSource: null,
      missionProtocol: null,
    },
  },
  {
    id: 'dojoToday',
    name: 'dojoToday',
    role: 'Projeção diária do programador',
    capability: 'Inspecione a lição diária derivada do substrato sem permitir escrita canônica.',
    objective: 'Apresentar ao programador a próxima prática diária derivada do estado canônico.',
    startCommand: 'cd engines/dojoToday && npm run dev -- --port 5180',
    evaluationFocus: 'Utilidade da recomendação, fidelidade ao substrate e clareza de estado read-only.',
    journeyClass: 'operations',
    portfolioStatus: 'internal',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_DOJOTODAY_URL',
      developmentUrl: 'http://127.0.0.1:5180/',
      evidenceSource: null,
      missionProtocol: null,
    },
  },
  {
    id: 'voxelDojo',
    name: 'voxelDojo',
    role: 'Simulações didáticas 3D',
    capability: 'Escolha e opere qualquer uma das 16 simulações didáticas do catálogo real.',
    objective: 'Ensinar estruturas e dinâmicas de sistemas por simulações espaciais 3D.',
    startCommand: 'cd engines/voxelDojo && pnpm run dev:catalog',
    evaluationFocus: 'Compreensão e transferência, fallback gráfico, custo WebGL e evidência por conceito.',
    journeyClass: 'teaching-game',
    portfolioStatus: 'supporting',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_VOXELDOJO_URL',
      developmentUrl: 'http://127.0.0.1:5177/',
      evidenceSource: null,
      missionProtocol: '1.0',
    },
  },
  {
    id: 'aiDevschoolMvp',
    name: 'AiDevSchool MVP',
    role: 'Runtime curricular local-first',
    capability: 'Percorra o contrato de atividade, tentativa, evidência e gate independente.',
    objective: 'Validar uma jornada curricular auditável e instalável sem criar uma segunda fonte de learner state.',
    startCommand: 'python3 -m pytest engines/aiDevschoolMvp/tests/acceptance',
    evaluationFocus: 'Próximo passo, ledger auditável, privacidade e separação entre tentativa e gate aceito.',
    journeyClass: 'operations',
    portfolioStatus: 'incubating',
    learnerAccess: 'read-only',
    masteryAuthority: 'never',
    runtime: {
      kind: 'static-evaluation',
      action: null,
      sideEffect: 'read-only',
    },
  },
  {
    id: 'zaiDuolingoLike',
    name: 'Z.ai Duolingo-like',
    role: 'Experimento de prática gamificada',
    capability: 'Avalie o runtime somente quando sua origem web separada estiver publicada e configurada.',
    objective: 'Testar uma hipótese de prática curta e progressiva inspirada em produtos de repetição diária.',
    startCommand: 'Runtime local indisponível: engines/zai-duolingo-like está vazio',
    evaluationFocus: 'Retenção, clareza da progressão e evidência; o diretório vazio não sustenta alegações funcionais.',
    journeyClass: 'micro-lesson',
    portfolioStatus: 'incubating',
    learnerAccess: 'evidence-producer',
    masteryAuthority: 'never',
    runtime: {
      kind: 'embedded-web',
      environmentKey: 'VITE_ZAI_DUOLINGO_URL',
      developmentUrl: '',
      evidenceSource: null,
      missionProtocol: null,
    },
  },
] as const satisfies readonly EngineDefinition[]

function isStagedAppsPath(pathname: string): boolean {
  return pathname === '/apps' || pathname.startsWith('/apps/')
}

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
    const url = candidate.startsWith('/')
      ? new URL(candidate, hostOrigin ?? 'https://os.invalid')
      : new URL(candidate)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const stagedApps = isStagedAppsPath(url.pathname)
      if (candidate.startsWith('/apps/') && stagedApps) {
        return { kind: 'ready', url: candidate }
      }
      if (hostOrigin !== undefined && url.origin === hostOrigin) {
        if (stagedApps) return { kind: 'ready', url: candidate }
        return {
          kind: 'unavailable',
          reason: 'Engine runtime must use a separate origin from the OS.',
        }
      }
      if (candidate.startsWith('/')) {
        return { kind: 'unavailable', reason: 'Engine runtime URL is unsafe or malformed.' }
      }
      return { kind: 'ready', url: candidate }
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
  }

  return { kind: 'unavailable', reason: 'Engine runtime URL is unsafe or malformed.' }
}
