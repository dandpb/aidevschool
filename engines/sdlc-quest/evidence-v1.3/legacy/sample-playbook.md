# SDLC Quest — Meu playbook de aprendizagem

Gerado em: 2026-09-18T17:40:16.835Z

## Limite desta evidência
Este é um registro local de uma simulação didática. Não comprova a execução de uma API, pipeline ou infraestrutura real. Não é certificado profissional nem autorização de release. O save é local e editável.

## Progresso
6/6 missões, 18/18 desafios, 5/5 chefes. Pontuação: 1690/1800 XP.

## Decisões e aprendizado

### PLAN — Planejar
Intenção define o problema e o resultado; não é uma ordem vaga para escrever código. O rigor do processo deve acompanhar o risco, não a quantidade de arquivos.

- CONCLUÍDO: Monte a intenção. Erros: 1. Ajuda: sim. XP: 65.
  Antes de pedir código, escreva: problema, resultado, não objetivos, restrições e perguntas em aberto.
- CONCLUÍDO: Risco não se conta em linhas. Erros: 0. Ajuda: não. XP: 100.
  Defina exemplos de risco com seu time. Um ajuste simples não precisa de uma esteira de documentos.
- CONCLUÍDO: Quem autoriza a próxima etapa?. Erros: 0. Ajuda: não. XP: 100.
  Registre quem decide ambiguidades materiais. Não transforme uma suposição do modelo em requisito.

### DESIGN — Projetar
Uma especificação descreve comportamentos observáveis, inclusive falhas. Instrução, evidência e autoridade têm funções diferentes.

- CONCLUÍDO: Especifique o que pode dar errado. Erros: 0. Ajuda: não. XP: 100.
  Cada critério precisa de uma prova, especialmente autorização, concorrência e efeitos externos.
- CONCLUÍDO: Três coisas que não são a mesma. Erros: 0. Ajuda: não. XP: 100.
  Para cada risco, identifique a instrução, a prova esperada e o controle efetivo.
- CONCLUÍDO: Equipe-se contra o Vazador de Segredos. Erros: 0. Ajuda: não. XP: 100.
  Inspecione credenciais, rede, filesystem e sockets. Nenhuma seleção deste jogo configura uma sandbox real.

### BUILD — Construir
Plan Mode ajuda a delimitar o trabalho. Worktrees evitam misturar checkouts; bancos, portas e permissões precisam de separação própria.

- CONCLUÍDO: Derrote o Monstro do Diff. Erros: 1. Ajuda: não. XP: 85.
  Adie melhorias alheias à tarefa. Uma PR pequena ainda precisa de testes e pode ser crítica.
- CONCLUÍDO: Monte o ciclo de implementação. Erros: 0. Ajuda: não. XP: 100.
  Ao iterar, registre a hipótese e imponha um limite de tentativas. Loop infinito não é autonomia.
- CONCLUÍDO: Delegue tarefas, não autoridade ilimitada. Erros: 0. Ajuda: não. XP: 100.
  Defina entradas, saídas, ferramentas e orçamento de cada agente. Preserve controles fora do alcance do candidato.

### TEST — Verificar
Testes da aplicação avaliam o software; evals avaliam o comportamento do agente. O candidato não deve redefinir sua própria política de aprovação.

- CONCLUÍDO: Enfrente o Enfraquecedor de Testes. Erros: 1. Ajuda: não. XP: 85.
  Permita novos testes. Revise remoções, exclusões, snapshots, fixtures e mudanças que enfraqueçam expectativas.
- CONCLUÍDO: Escolha a prova da revisão certa. Erros: 0. Ajuda: não. XP: 100.
  Registre commit, artefato, política, CI, checks executados e limitações. Mudou o código? Reavalie as provas.
- CONCLUÍDO: Teste do produto ou eval do agente?. Erros: 0. Ajuda: não. XP: 100.
  Use casos negativos, execuções repetidas e critérios verificáveis; não avalie só a simpatia da resposta.

### DEPLOY — Publicar
Hooks ajudam, mas a produção precisa de limites externos. Uma variável “approved” dentro do workspace não autentica uma aprovação.

- CONCLUÍDO: Revise em três perspectivas. Erros: 0. Ajuda: não. XP: 100.
  REVIEW.md descreve a política; review.md registra os achados de uma revisão específica.
- CONCLUÍDO: Conecte um gate de produção. Erros: 1. Ajuda: não. XP: 85.
  Uma permissão textual não é credencial. Se o hook falhar, a infraestrutura ainda deve negar acesso não autorizado.
- CONCLUÍDO: O Editor de Guardrails apareceu. Erros: 0. Ajuda: não. XP: 100.
  Proteja verificadores, CI, regras de release e ownership. Uma proposta de política não deve aprovar a própria feature.

### MAINTAIN — Manter
Detectar uma anomalia não autoriza uma ação. Autocura útil é remediação limitada por precondições, orçamento, verificação e escalonamento.

- CONCLUÍDO: O gráfico não é uma autorização. Erros: 0. Ajuda: não. XP: 100.
  As regras clássicas de Western Electric incluem sequências, não apenas 1σ/2σ/3σ. Para SLOs, avalie múltiplas janelas.
- CONCLUÍDO: Contenha o Incidente das 3h. Erros: 2. Ajuda: não. XP: 70.
  Uma mitigação malsucedida não autoriza loops de tentativas. Preserve rastreabilidade e escale para quem tem autoridade.
- CONCLUÍDO: Feche o ciclo sem apagar o passado. Erros: 0. Ajuda: não. XP: 100.
  Meça sucesso técnico, esforço humano e utilidade. Velocidade de geração de código não é o único resultado.

## Minha aplicação a uma feature real
Este rascunho é do jogador e não foi validado por IA, teste ou revisor. Não concede aprovação.

### 1. Intenção e resultado observável
[Não preenchido]

### 2. Prova de aceitação e revisão verificada
[Não preenchido]

### 3. Limite de autoridade e responsável
[Não preenchido]

### 4. Sinal para abortar, mitigar ou escalar
[Não preenchido]

## Modelos desbloqueados (não são evidência operacional)

### intent.md

```markdown
# Intenção — WEBHOOK-042

MODELO DIDÁTICO. Não é uma autorização real.

## Problema
O suporte depende da engenharia para reenviar webhooks falhos.

## Resultado
Administrador solicita um retry de uma entrega do seu tenant e acompanha o resultado.

## Não objetivos
Sem novos destinos, envio em massa ou refatoração global.

## Restrições
Isolamento de tenant; logs redigidos; uma tentativa ativa por entrega.

## Perguntas
Como o destino trata duplicidade após timeout? Confirmar antes de prometer garantias.

## Responsável
[Definir responsável real e registrar aceitação.]
```

### spec.md

```markdown
# Especificação — WEBHOOK-042

MODELO DIDÁTICO. Decisões ilustrativas, não implementação validada.

- Administrador só acessa entregas do seu tenant.
- Uma tentativa ativa por entrega sob concorrência.
- Rejeitar entradas e acessos inválidos.
- Identificador estável para deduplicação no destino.
- Não prometer exatamente uma vez a qualquer destino.
- Logs não contêm credenciais ou payload sensível.
- Timeouts geram estado explícito; resposta perdida pode significar processamento concluído.

## Prova planejada
Integração, teste negativo entre tenants, concorrência, timeout e inspeção de logs.

## Decisões pendentes
Contrato HTTP, armazenamento, política de retries e retenção devem ser definidos no projeto real.
```

### plan.md

```markdown
# Plano — WEBHOOK-042

MODELO DIDÁTICO.

1. Inspecionar padrões existentes e critérios aceitos.
2. Demonstrar a falha de acesso por tenant.
3. Implementar controlador e serviço no escopo.
4. Executar regressão e testes vizinhos.
5. Simplificar e reexecutar checks.
6. Registrar diferenças do plano e limitações.

Não incluir redesign, renomeação global ou refatoração não necessária.
O orçamento de 180 linhas pertence ao jogo, não é uma regra universal.
Separar banco, portas e identidade quando executar agentes paralelos.
Limitar tentativas e relatar bloqueio quando o orçamento acabar.
```

### evidence.json

```json
{
  "origin": "educational-simulation",
  "productionVerified": false,
  "changeId": "WEBHOOK-042",
  "candidate": "illustrative-8d0fa42",
  "policyRevision": "illustrative-p4",
  "realCiRun": null,
  "realChecks": [],
  "limitations": [
    "O jogo não executa a API, infraestrutura ou pipeline de um projeto real.",
    "Os microtestes de busca por tenant rodam localmente no navegador.",
    "Uma resposta correta no jogo não é evidência de prontidão para produção."
  ]
}
```

### review-release.md

```markdown
# Revisão e release — WEBHOOK-042

MODELO DIDÁTICO. Não concede autoridade de deploy.

## Bugs
Concorrência e duplicidade examinadas? [Evidência real]

## Segurança
Tenant e logs seguros? [Evidência real]

## Conformidade
Política aplicável de retenção atendida? [Evidência real]

## Gate
- Candidata e artefato identificados.
- Evidência vinculada à revisão.
- Política protegida e independente da candidata.
- Aprovação externa proporcional ao risco.
- Identidade de deploy temporária e restrita.
- Rollback avaliado quanto à compatibilidade de dados.

## Autorização real
Pendente. Deve ser validada pela infraestrutura, não por este Markdown.
```

### incident-intent.md

```markdown
# Incidente e nova intenção — WEBHOOK-042

CENÁRIO FICTÍCIO DO JOGO.

03:07 — degradação detectada.
03:08 — sinais validados; destino lento; migração incompatível com rollback.
03:09 — nova fila de retries pausada por runbook preautorizado.
03:10 — verificação mostra degradação persistente.
03:11 — orçamento automático esgotado; incidente escalado.

Status: ESCALADO. Recuperação não demonstrada.

## Próxima intenção
Investigar timeouts, limites do destino e política de retries. Preservar hipóteses como hipóteses.

## Aceitação da correção
Definir prova de regressão, resposta sob falha do destino, limites e observação de resultado.
```

## Referências primárias
Material consultado em 8 de setembro de 2026. As políticas e cenários do jogo são propostas didáticas, não padrões universais.

- Anthropic · The AI-Native SDLC playbook: https://claude.com/blog/the-ai-native-sdlc-playbook

- Claude Code · Hooks reference: https://code.claude.com/docs/en/hooks

- Claude Code · Sandboxing: https://code.claude.com/docs/en/sandboxing

- Git · git-worktree: https://git-scm.com/docs/git-worktree

- Google SRE · Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

- NIST · Control charts: https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm


# SDLC Quest v1.2 — Oficina TLC

Consulta das fontes: 2026-09-16
Progresso didático: 0/16 desafios; 0 XP TLC.
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
- [ ] Primeiro, descubra onde estamos. — Você recuperou o problema antes de escolher a tecnologia. O próximo artefato não nasce de uma premissa inventada.
- [ ] Nem toda conversa precisa de outro “sim”. — Você preservou decisões reais e interrompeu apenas o que ainda precisava ser esclarecido.
- [ ] Prepare um design que outro agente entenda. — O handoff distingue contrato, escopo e incerteza. tlc-plan pode localizar o que está decidido e o que ainda bloqueia.
- [ ] Publicar é saída. Resolver é resultado. — A aposta agora pode ser revisada. A meta de negócio não será usada como um check fictício no merge.

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
- [ ] Uma fatia que alguém consegue observar. — A primeira entrega prova uma capacidade. As próximas podem aprofundá-la sem perder um ponto de verificação.
- [ ] As nove dimensões não podem virar nove suposições. — As nove dimensões têm um destino rastreável. Um campo vazio não será confundido com um risco resolvido.
- [ ] O número certo na camada certa. — Você não usou um teste pequeno para alegar algo sobre uma distribuição inteira.
- [ ] Tarefa não é sinônimo de pull request. — Você manteve o compromisso verificável e ajustou o tamanho da revisão sem inventar uma regra de fragmentação.

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
- [ ] Escolha o perfil sem esconder seus limites. — O relatório informa o perfil realmente utilizado e o que ele deixa de verificar.
- [ ] Quebre a implementação. Não o teste. — A suíte detectou o bug anterior e o mutante, e passou com a correção. Você observou os resultados em vez de confiar na palavra “verde”.
- [ ] O verificador não é o último implementador. — Você preservou o escopo da verificação. Um nome de papel não é uma prova de independência.
- [ ] Passe o estado, não só a história. — O próximo agente recebe os registros necessários para continuar sem reinventar decisões ou repetir uma tentativa abandonada.

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
- [ ] Tribunal: o que realmente merece um achado? — Revisão consolidada preparada: F1 é blocker confirmado, então o veredito é REQUEST_CHANGES. Nada foi enviado ao GitHub.
- [ ] Três vereditos, não uma nota de perfeição. — O veredito comunica risco e pendências, sem fingir que APPROVE significa ausência de qualquer imperfeição.
- [ ] Sem achados novos não significa sem pendências. — A pendência continuou visível. Você verificou a resolução em vez de reiniciar a revisão do zero.
- [ ] Saia do loop pelo motivo certo. — Você encerrou a repetição sem aprovar artificialmente. Decisão e risco ficam explícitos; a pessoa responsável assume a divergência.

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
