import { describe, expect, it } from "vitest"
import { projects } from "./projects"

describe("projects data module", () => {
  it("exposes p01 functional, non-functional, and extra DoD requirements", () => {
    const p01 = projects[0]
    if (p01 === undefined) {
      throw new Error("projects must not be empty")
    }

    expect(p01.id).toBe("p01")
    expect(p01.functionalRequirements).toEqual([
      "Criar tarefas com título e prioridade.",
      "Listar tarefas pendentes e concluídas.",
      "Marcar uma tarefa como concluída por identificador.",
      "Persistir o estado localmente em arquivo JSON.",
    ])
    expect(p01.nonFunctionalRequirements).toEqual([
      "Comandos previsíveis, mensagens de erro claras e testes rápidos.",
      "Domínio separado da interface de linha de comando.",
      "Sem IA escrevendo a solução antes da tentativa inicial.",
    ])
    expect(p01.extraDoneCriteria).toEqual([
      "Relatório de revisão com uma melhoria aplicada.",
      "Comparação curta com uma API HTTP futura.",
    ])
  })
})
