const reasons = {
  aiDevschoolMvp: "Você pratica conceitos de IA em uma conversa guiada.",
  codexDojo: "Você encontra uma visão organizada das unidades e evidências.",
  "codexdojo-os-prototype":
    "Você explora missões e ferramentas em um ambiente de aprendizagem.",
  dojoToday: "Você encontra orientação sobre a próxima prática de programação.",
  literacyDojo:
    "Você pratica o uso de IA em pequenas lições, sem precisar programar.",
  miniMaxEvolutionEngine:
    "Você acompanha um ciclo de desenvolvimento supervisionado por agentes.",
  miniTown:
    "Você pode explorar uma entrada acolhedora, sem atividade avaliada.",
  minimaxDojo:
    "Você encontra protocolos de tutoria e acompanhamento por agentes.",
  openclaw: "Você acompanha as etapas de um checklist de desenvolvimento.",
  pixelDojo: "Você explora conceitos de programação por mecânicas de jogos 2D.",
  "sdlc-quest":
    "Você pratica decisões de intenção, planejamento e verificação.",
  voxelDojo:
    "Você explora estruturas e dinâmicas de sistemas em simulações 3D.",
  "zai-duolingo-like":
    "As capacidades desta experiência ainda precisam ser verificadas.",
};

// One identity per existing engine root; source links are reviewed with catalog changes.
export const CATALOG = [
  [
    "aiDevschoolMvp",
    "AI DevSchool MVP",
    "Tutor por conversa com trilha de conceitos e verificação por scripts.",
  ],
  [
    "codexDojo",
    "CodexDojo",
    "Dashboard de aprendizagem para acompanhar unidades e evidências.",
  ],
  [
    "codexdojo-os-prototype",
    "CodexDojo OS",
    "Ambiente de aprendizagem com missões, terminal e mentor.",
  ],
  [
    "dojoToday",
    "Dojo Today",
    "Orientação diária para programadores, com revisões e unidade ativa.",
  ],
  [
    "literacyDojo",
    "Literacy Dojo",
    "Microlições de inteligência artificial para pessoas não técnicas.",
  ],
  [
    "miniMaxEvolutionEngine",
    "MiniMax Evolution Engine",
    "Orquestração do ciclo de desenvolvimento com agentes no Claude Code.",
  ],
  [
    "miniTown",
    "Mini Town",
    "Exploração acolhedora de uma cidade, como orientação inicial sem atividade avaliada.",
  ],
  [
    "minimaxDojo",
    "Minimax Dojo",
    "Núcleo de tutoria com agentes e quadro de aprendizagem.",
  ],
  [
    "openclaw",
    "OpenClaw",
    "Execução de checklists de um ciclo de desenvolvimento simulado.",
  ],
  [
    "pixelDojo",
    "Pixel Dojo",
    "Aprendizagem por jogos bidimensionais com desafios e evidências.",
  ],
  [
    "sdlc-quest",
    "SDLC Quest",
    "Jogo para explorar etapas do ciclo de desenvolvimento de software.",
  ],
  [
    "voxelDojo",
    "Voxel Dojo",
    "Simulações tridimensionais de conceitos de programação e sistemas.",
  ],
  [
    "zai-duolingo-like",
    "Zai Duolingo Like",
    "Aplicação experimental; capacidades pedagógicas ainda não verificadas.",
  ],
].map(([id, name, description]) =>
  Object.freeze({
    id,
    name,
    description,
    reason: reasons[id],
    source: `engines/${id}/`,
  }),
);

// School entry surface (AID-3484, child of AID-3453; CEO-approved single slice).
// Verified first-hand destinations — do NOT inherit legacy recommendedEntryMissionId:
// - Fundamentals app: literacyDojo binding l01, entrypoint
//   http://127.0.0.1:5178/?hosted=1 (engines/codexdojo-os-prototype/config/mission-bindings.yaml:21).
//   That loopback URL is LOCAL SERVER CONFIG ONLY (FSE review 2026-09-30 14:38Z):
//   published navigation must use per-environment public/proxy URLs from
//   ENGINE_TARGETS_FILE; production refuses local targets (runtime guard + tests R4/R5).
//   The app itself sequences l01→l14 (ai-pratica track, chapterOrder 1–14, contentVersion 2026-09-10.2).
//   There is no per-lesson deep link (React state routing) — the CTA enters the journey,
//   never promising an exact lesson or resumption (FSE review: copy says "entrar na
//   jornada", tests E3 pin the honesty).
// - Dev bridge preview: dev-track literacyDojo bindings l15 (order 4), l16–l17 (5–6),
//   l21–l23 (11–13), l27–l29 (14–16); titles from curriculum/ai-literacy/catalog.yaml (mod-05).
// - game-02-warehouse is NOT an entry door (optional laboratory; CEO directive).
// Honest limits: school-entry never reads or writes learner progress (no cross-engine
// sync, no "continue where you left off"); the operator release + Chromium entry
// check gate every launch through /api/launch/{engineId} — an unreleased or
// unreachable runtime is reported as unavailable, never a bare href (test E5).
export const SCHOOL_ENTRY = Object.freeze({
  schemaVersion: 1,
  fundamentals: Object.freeze({
    engineId: "literacyDojo",
    sequence: "l01–l14",
    lessonsCount: 14,
    number: "L01–L14",
    kicker: "COMECE AQUI · FUNDAMENTOS",
    title: "Fundamentos de IA",
    description:
      "Entender IA, uso seguro, prompt e contexto e verificação — 14 lições curtas (l01 a l14) no app de lições. Você entra na jornada; o app cuida da sequência, uma lição por vez.",
    tags: Object.freeze(["14 lições · l01–l14", "Tentativa com feedback", "Sem código"]),
    tasks: Object.freeze([
      "Entrar no app de lições",
      "Seguir a jornada — uma lição por vez",
      "Seu progresso fica no app de lições",
    ]),
    cta: "Começar pelos fundamentos",
    note: "Jogos são prática opcional — nenhum pré-requisito depende deles.",
  }),
  journeys: Object.freeze([
    Object.freeze({
      id: "cotidiano",
      audience: "JORNADA 1 · PARA QUEM NÃO PROGRAMA",
      title: "IA no cotidiano",
      description:
        "Use IA com segurança no dia a dia: e-mails, pesquisa, decisões. Parte dos mesmos fundamentos compartilhados.",
      engineId: "literacyDojo",
      preview: false,
      cta: "Começar pelos fundamentos",
    }),
    Object.freeze({
      id: "dev",
      audience: "JORNADA 2 · PARA QUEM DESENVOLVE · PRÉVIA",
      title: "IA para Dev",
      description:
        "Construa software robusto com IA: intenção, plano, construção, teste e review. Comece pelos mesmos fundamentos; a ponte Dev é uma prévia.",
      engineId: "literacyDojo",
      preview: true,
      cta: "Começar pelos fundamentos",
      bridge: Object.freeze({
        label: "Depois dos fundamentos — ponte Dev (prévia)",
        trackId: "dev",
        moduleId: "mod-05",
        lessons: Object.freeze(
          [
            ["l15", "Quando usar IA e quando não usar"],
            ["l16", "Seu primeiro código com um assistente de IA"],
            ["l17", "Integre uma API de IA em um projeto real"],
            ["l21", "Peça testes que valem a pena"],
            ["l22", "Revise o código sugerido como engenheiro"],
            ["l23", "O que aceitar: limites do assistente"],
            ["l27", "Debug com assistente: reproduza antes de perguntar"],
            ["l28", "Refatore com assistente sem quebrar comportamento"],
            ["l29", "Avalie as dependências sugeridas"],
          ].map(([id, title]) => Object.freeze([id, title]),
          ),
        ),
        note: "Lições da trilha dev no mesmo app de lições, na sequência curada. Laboratórios 3D são prática opcional, não porta de entrada. Prévia: o restante do percurso dev ainda está em construção.",
      }),
    }),
  ]),
});
