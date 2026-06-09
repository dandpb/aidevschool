import type { CycleStage, Metric } from "../domain"

export const cycleStages: readonly CycleStage[] = [
  {
    id: "diagnosticar",
    label: "Diagnosticar nível",
    owner: "Mentor",
    evidence: "tentativa curta avaliada",
    output: "perfil Dreyfus x Bloom",
  },
  {
    id: "escolher",
    label: "Escolher conceito",
    owner: "Currículo",
    evidence: "lacuna priorizada",
    output: "unidade desbloqueada",
  },
  {
    id: "projetar",
    label: "Criar mini-projeto",
    owner: "Arquiteto",
    evidence: "spec com trade-offs",
    output: "requisitos claros",
  },
  {
    id: "implementar",
    label: "Implementar versão 1",
    owner: "Implementador",
    evidence: "código executável",
    output: "primeira entrega",
  },
  {
    id: "testar",
    label: "Criar testes",
    owner: "Testes",
    evidence: "suite verde e falha esperada",
    output: "provas automatizadas",
  },
  {
    id: "medir",
    label: "Rodar métricas",
    owner: "Métricas",
    evidence: "benchmark reprodutível",
    output: "scorecard técnico",
  },
  {
    id: "revisar",
    label: "Revisar código",
    owner: "Revisor",
    evidence: "findings com severidade",
    output: "relatório de revisão",
  },
  {
    id: "refatorar",
    label: "Refatorar",
    owner: "Implementador",
    evidence: "mesmos testes, design melhor",
    output: "patch validado",
  },
  {
    id: "comparar",
    label: "Comparar alternativa",
    owner: "Pesquisador",
    evidence: "implementação ou pesquisa primária",
    output: "matriz de trade-offs",
  },
  {
    id: "registrar",
    label: "Registrar aprendizado",
    owner: "Memória",
    evidence: "lição reutilizável",
    output: "journal e próxima revisão",
  },
] as const

export const metrics: readonly Metric[] = [
  {
    id: "runtime",
    label: "Tempo de execução",
    target: "mediana + p95",
    signal: "Mostra se o design ou runtime virou gargalo.",
  },
  {
    id: "coverage",
    label: "Cobertura do núcleo",
    target: ">=80%",
    signal: "Protege a regra de negócio antes de ampliar escopo.",
  },
  {
    id: "mutation",
    label: "Mutation score",
    target: "60-70%",
    signal: "Evita teste que passa sem pegar bug real.",
  },
  {
    id: "complexity",
    label: "Complexidade ciclomática",
    target: "mediana <10",
    signal: "Aponta onde refatoração ensina mais que nova feature.",
  },
  {
    id: "ai-dependency",
    label: "Dependência de IA",
    target: "queda por ciclo",
    signal: "Mede autonomia, não volume de código gerado.",
  },
] as const
