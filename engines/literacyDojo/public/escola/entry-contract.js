/* AID-3453 static entry — SCHOOL_ENTRY contract ported VERBATIM from
   engines/school-entry/server/catalog.mjs @ 80c7addc (PR #615 candidate).
   Pure data module (no DOM) so the honesty test can import and diff it.
   Drift rule: any change here requires re-porting from school-entry and
   updating the pinned hashes in tests/static-entry/escola-honesty.test.ts. */
export const SCHOOL_ENTRY = Object.freeze({
  schemaVersion: 1,
  fundamentals: Object.freeze({
    engineId: "literacyDojo",
    sequence: "avaliação inicial + trilha adaptativa",
    number: "TRILHA ADAPTATIVA",
    kicker: "COMECE AQUI · FUNDAMENTOS",
    title: "Fundamentos de IA",
    description:
      "Entender IA, uso seguro, prompt e contexto e verificação — lições curtas no app de lições. Você entra na jornada: uma avaliação curta no início define o ponto de partida, o app conduz a trilha e a ordem se adapta a você.",
    tags: Object.freeze([
      "Avaliação inicial · ordem adaptativa",
      "Tentativa com feedback",
      "Sem código",
    ]),
    tasks: Object.freeze([
      "Entrar no app de lições",
      "Responder a avaliação inicial curta",
      "Seguir a trilha — uma lição por vez",
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
        "Construa software robusto com IA: intenção, plano, construção, teste e review. Comece pelos mesmos fundamentos; a ponte Dev é uma prévia planejada — o destino, não um percurso pronto no app.",
      engineId: "literacyDojo",
      preview: true,
      cta: "Começar pelos fundamentos",
      bridge: Object.freeze({
        label: "Depois dos fundamentos — ponte Dev (prévia planejada)",
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
          ].map(([id, title]) => Object.freeze([id, title])),
        ),
        note: "Prévia planejada: hoje o app de lições abre a trilha de fundamentos; esta ponte Dev (módulo 05 do currículo) ainda não faz parte do percurso do app — as lições acima mostram o destino planejado. Laboratórios 3D são prática opcional, não porta de entrada.",
      }),
    }),
  ]),
});
