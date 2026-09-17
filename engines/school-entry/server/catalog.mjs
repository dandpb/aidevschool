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
