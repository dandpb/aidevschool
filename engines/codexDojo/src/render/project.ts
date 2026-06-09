import { getCurrentProject } from "../progress"

export function renderProject(): string {
  const project = getCurrentProject()

  return `
    <section class="workbench project-view" aria-label="Primeiro projeto prático">
      <div class="section-heading">
        <p class="eyebrow">Projeto 01</p>
        <h2>${project.title}</h2>
      </div>

      <div class="briefing-grid">
        <article class="briefing-main">
          <h3>Objetivo de aprendizado</h3>
          <p>${project.learningGoal}</p>
          <h3>Requisitos funcionais</h3>
          <ul>
            <li>Criar tarefas com título e prioridade.</li>
            <li>Listar tarefas pendentes e concluídas.</li>
            <li>Marcar uma tarefa como concluída por identificador.</li>
            <li>Persistir o estado localmente em arquivo JSON.</li>
          </ul>
          <h3>Requisitos não funcionais</h3>
          <ul>
            <li>Comandos previsíveis, mensagens de erro claras e testes rápidos.</li>
            <li>Domínio separado da interface de linha de comando.</li>
            <li>Sem IA escrevendo a solução antes da tentativa inicial.</li>
          </ul>
        </article>

        <aside class="quality-card">
          <h3>Definition of Done</h3>
          <ul>
            ${project.evidence.map((item) => `<li>${item}</li>`).join("")}
            <li>Relatório de revisão com uma melhoria aplicada.</li>
            <li>Comparação curta com uma API HTTP futura.</li>
          </ul>
        </aside>
      </div>
    </section>
  `
}
