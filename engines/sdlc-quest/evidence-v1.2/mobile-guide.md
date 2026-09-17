# SDLC Quest v1.2 — Oficina TLC

Consulta das fontes: 2026-09-16
Progresso didático: 16/16 desafios; 1555 XP TLC.
Não é evidência de execução de skills ou de uma feature real.

## Instalação fora do jogo
```sh
npx @tech-leads-club/agent-skills install --skill tlc-discover tlc-plan tlc-implement the-judge
```

## tlc-discover

Entrada: Ideia, contexto do projeto e decisões ainda abertas.
Saída: Veredito e design; ou uma decisão justificada de não construir.
Integração: Planejar + Projetar
Fonte: https://agent-skills.techleads.club/skills/tlc-discover/

### Prompt sugerido
Use tlc-discover para explorar o retry de webhooks. Leia primeiro o contexto e as convenções disponíveis. Separe fatos de decisões de produto. A decisão de construir ainda está aberta: esclareça problema, alternativas menores e sucesso esperado antes de propor a arquitetura. Registre lacunas sem inventar métricas.

### Desafios e princípios (checkbox = concluído no jogo)
- [x] Primeiro, descubra onde estamos. — Você recuperou o problema antes de escolher a tecnologia. O próximo artefato não nasce de uma premissa inventada.
- [x] Nem toda conversa precisa de outro “sim”. — Você preservou decisões reais e interrompeu apenas o que ainda precisava ser esclarecido.
- [x] Prepare um design que outro agente entenda. — O handoff distingue contrato, escopo e incerteza. tlc-plan pode localizar o que está decidido e o que ainda bloqueia.
- [x] Publicar é saída. Resolver é resultado. — A aposta agora pode ser revisada. A meta de negócio não será usada como um check fictício no merge.

### Exemplo de artefato (didático, não template oficial completo)
```text
# .design/retry-webhook.md

ADAPTAÇÃO DIDÁTICA — exemplo fictício, não resultado de agente real.
Fonte: https://agent-skills.techleads.club/skills/tlc-discover/
Consulta: 2026-09-16

## Situation
Retry para administradores aprovado no cenário.

## Problem
O suporte depende de reenvio manual de entregas falhas.

## Verdict
Construir a menor capacidade que reduza a intervenção manual.

## What counts as worked
Meta fictícia acordada: reduzir 40 para menos de 15 min/dia em duas semanas; Ana revisa. Não é um critério de teste unitário.

## Boundary
Sem reenvio em massa ou novos destinos.

## Shape
Adds: solicitação de retry e consulta de tentativa.
Changes: autorização do novo caminho e mensagens de resultado.
Leaves: restante do serviço e contratos não relacionados.

## Decisions
Somente admin do próprio tenant. Nenhuma promessa de exactly-once arbitrário.

## Roadmap
Esclarecer tratamento de duplicatas; então passar a tlc-plan.
```

## tlc-plan

Entrada: Uma decisão: ticket, design, PRD, RFC ou conversa.
Saída: Tarefa com critérios, fronteira, decisões e questões não resolvidas.
Integração: Projetar + Construir
Fonte: https://agent-skills.techleads.club/skills/tlc-plan/

### Prompt sugerido
Use tlc-plan sobre .design/retry-webhook.md. Leia a fonte por inteiro e confronte-a com o código. Defina fatias verticais e critérios observáveis com valores concretos. Faça o surface walk e registre as nove dimensões em Swept, sem inventar novos requisitos. Diferencie open, blocks build e blocks go-live. Gere .tasks/retry-webhook.md.

### Desafios e princípios (checkbox = concluído no jogo)
- [x] Uma fatia que alguém consegue observar. — A primeira entrega prova uma capacidade. As próximas podem aprofundá-la sem perder um ponto de verificação.
- [x] As nove dimensões não podem virar nove suposições. — As nove dimensões têm um destino rastreável. Um campo vazio não será confundido com um risco resolvido.
- [x] O número certo na camada certa. — Você não usou um teste pequeno para alegar algo sobre uma distribuição inteira.
- [x] Tarefa não é sinônimo de pull request. — Você manteve o compromisso verificável e ajustou o tamanho da revisão sem inventar uma regra de fragmentação.

### Exemplo de artefato (didático, não template oficial completo)
```text
# .tasks/retry-webhook.md

ADAPTAÇÃO DIDÁTICA — exemplo fictício, não resultado de agente real.
Fonte: https://agent-skills.techleads.club/skills/tlc-plan/
Consulta: 2026-09-16

## Intent
Tornar o retry elegível observável do pedido à consulta da tentativa.

## Criteria
C1: ID vazio retorna 400.
C2: entrega ausente retorna 404.
C3: acesso exige admin e o tenant correto.
C4: estados queued → processing → succeeded ou failed.

## Out of scope
Reenvio em massa.

## Observable
API: critérios C1–C3. Tela: definir estados de loading, vazio e erro antes de implementar a interface.

## Swept
validation: C1
failure modes: C2
idempotency and retry: existing — deduplicação inspecionada no cenário
authorization: C3
concurrency and ordering: Unresolved 1
data lifecycle: Unresolved 2
external-dependency failure: existing — timeout do adaptador vira failed
state transitions: C4
observability: existing — eventos de auditoria e redação inspecionados no cenário

## Unresolved
1 | blocks build | decidir resposta concorrente e mecanismo de exclusão
2 | open | confirmar retenção das tentativas com o responsável

Não implementar uma garantia ainda não decidida. Esta ficha é resumida e não substitui o template oficial.
```

## tlc-implement

Entrada: Trabalho decidido, critérios e escopo claro.
Saída: Implementação, checklist e relatório de verificação independente.
Integração: Construir + Verificar
Fonte: https://agent-skills.techleads.club/skills/tlc-implement/

### Prompt sugerido
Use tlc-implement sobre .tasks/retry-webhook.md. Declare o perfil do projeto e gere .checks/retry-webhook.md antes de editar. Ligue cada check a provas executáveis, sem enfraquecer testes. Ao concluir toda a feature, o orquestrador deve acionar um verificador novo sobre o intervalo completo. Sem essa capacidade, registre a verificação independente pendente; não a simule. Não faça push ou deploy sem autorização explícita.

### Desafios e princípios (checkbox = concluído no jogo)
- [x] Escolha o perfil sem esconder seus limites. — O relatório informa o perfil realmente utilizado e o que ele deixa de verificar.
- [x] Quebre a implementação. Não o teste. — A suíte detectou o bug anterior e o mutante, e passou com a correção. Você observou os resultados em vez de confiar na palavra “verde”.
- [x] O verificador não é o último implementador. — Você preservou o escopo da verificação. Um nome de papel não é uma prova de independência.
- [x] Passe o estado, não só a história. — O próximo agente recebe os registros necessários para continuar sem reinventar decisões ou repetir uma tentativa abandonada.

### Exemplo de artefato (didático, não template oficial completo)
```text
# .checks/retry-webhook.md

ADAPTAÇÃO DIDÁTICA — exemplo fictício, não resultado de agente real.
Fonte: https://agent-skills.techleads.club/skills/tlc-implement/
Consulta: 2026-09-16

## Sources
.tasks/retry-webhook.md — critérios aprovados

## Out of scope
Deploy, push e qualquer mudança de produção sem autorização.

## Landing
Consulta local com filtro de ID e tenant; não equivale a autenticação de uma API.

## Checks
C1: acesso permitido A → A tem prova own-a.
C2: acesso permitido B → B tem prova own-b.
C3: acesso A → B negado tem prova cross-a.
C4: acesso B → A negado tem prova cross-b.
C5: ID ausente retorna null tem prova missing.

## Coverage
Cinco casos explícitos. Regressão: contrato detecta o código anterior e o mutante que nega tudo.
Lacunas: HTTP, autenticação, concorrência e infraestrutura não são exercitados neste laboratório.

## Handoff
No projeto real: fatias fechadas, commit, checklist, diff, esclarecimentos e tentativas abandonadas.

## Verification
Esta ficha descreve os checks do laboratório, mas não atesta que o jogador os executou. Use o botão de exportar execução na tela do laboratório para registrar resultados. Nenhum subagente independente é executado pelo jogo.
```

## the-judge

Entrada: Uma PR/diff e as verificações reais do repositório.
Saída: Achados rastreáveis e APPROVE, COMMENT ou REQUEST_CHANGES.
Integração: Verificar + portão de Publicar
Fonte: https://agent-skills.techleads.club/skills/the-judge/

### Prompt sugerido
Use the-judge para revisar esta PR em português. Execute os checks disponíveis, leia o diff e valide cada achado com arquivo:linha ou documentação oficial consultada. Consolide a revisão e use o veredito correspondente às severidades. Nas reavaliações, mantenha IDs, carryover e o contrato de convergência. Sem PR ou autenticação, declare o bloqueio; não diga que publicou uma review.

### Desafios e princípios (checkbox = concluído no jogo)
- [x] Tribunal: o que realmente merece um achado? — Revisão consolidada preparada: F1 é blocker confirmado, então o veredito é REQUEST_CHANGES. Nada foi enviado ao GitHub.
- [x] Três vereditos, não uma nota de perfeição. — O veredito comunica risco e pendências, sem fingir que APPROVE significa ausência de qualquer imperfeição.
- [x] Sem achados novos não significa sem pendências. — A pendência continuou visível. Você verificou a resolução em vez de reiniciar a revisão do zero.
- [x] Saia do loop pelo motivo certo. — Você encerrou a repetição sem aprovar artificialmente. Decisão e risco ficam explícitos; a pessoa responsável assume a divergência.

### Exemplo de artefato (didático, não template oficial completo)
```text
{
  "simulation": true,
  "source": "SDLC Quest — tribunal didático; não é saída do script oficial",
  "round": 1,
  "language": "pt-BR",
  "verdict": "REQUEST_CHANGES",
  "carryover": {
    "blocker": 0,
    "shouldFix": 0
  },
  "summary": "F1 expõe token sintético no novo log. Não autorizar merge enquanto o achado permanecer aberto.",
  "findings": [
    {
      "id": "F1",
      "severity": "blocker",
      "path": "src/retry.ts",
      "line": 4,
      "evidence": [
        {
          "type": "internal",
          "ref": "src/retry.ts:4 (fixture fictícia)"
        },
        {
          "type": "repro",
          "ref": "Cenário fornecido: cabeçalho sintético aparece no log capturado."
        }
      ]
    }
  ],
  "publication": "Nenhuma review publicada. Nenhum acesso ao GitHub."
}
```

## Limites
Não executa npx, agentes, gh ou produção. Laboratório cobre consulta local; não cobre autenticação HTTP nem concorrência real. Verificação independente não foi executada pelo jogo. Pontuação não prova domínio.

## Atribuição
Adaptação didática independente do SDLC Quest, com cenários fictícios. Conteúdo das skills: Tech Leads Club, CC BY 4.0. Consultado em 16/09/2026. Nomes, caminhos e contratos preservados onde indicados; exemplos e mecânicas foram criados para este jogo. Não é produto oficial nem executa agentes, npx, GitHub ou deploy.
https://creativecommons.org/licenses/by/4.0/
https://agent-skills.techleads.club/tlc-ai-dev-flow/
