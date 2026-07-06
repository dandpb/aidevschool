# Spec — Plano de Execução (recomendações abertas)

**Data:** 2026-07-05 · **Status:** Draft · **Dono:** Daniel (uso solo)
**Fontes:** `docs/ARCHITECTURE_EVALUATION_2026-07-05.md` (sequência recomendada) + `docs/FUNDAMENTOS.md` (protocolo de pedido em 5 campos)
**Escopo:** o que falta fechar no ecossistema AI DevSchool após GAP 1, GAP 2, GAP 5, GAP 6 e o MVP (U0) já estarem fechados — esses cinco itens não são replanejados aqui.

---

## Problem Statement

A avaliação de arquitetura de 2026-07-05 encontrou o ecossistema violando suas próprias regras de ouro: estado de masterização sem evidência (GAP 1) e verificador ausente (GAP 2) já foram corrigidos na mesma sessão, e o MVP (U0 gateado com evidência real) está cumprido. O que resta é trabalho não commitado (`engines/voxelDojo/` tem 4 pastas `game-*` untracked, violando F4 — estado auditável), documentação de protocolo (`docs/FUNDAMENTOS.md`) ainda não referenciada no mapa raiz, um ciclo de aprendizagem de projeto parado no meio (`01_rate_limiter` em `impl-done` desde 2026-06-04, aguardando reviewer) e nenhuma prova de que o processo de 5 fases e o gate de aprendizado se repetem sem atalhos de edição de estado. Sem fechar isso, o ecossistema tem 1 loop provado (U0) e nenhuma evidência de que o processo escala além do caso único — e cada dia sem commitar o trabalho do voxelDojo é risco de perda ou divergência silenciosa.

## Goals

1. Zero pastas untracked em `engines/voxelDojo/` — `git status --porcelain` limpo (higiene F4).
2. `docs/FUNDAMENTOS.md` descobrível a partir do `CLAUDE.md` raiz e do `MANIFEST.md` do codexDojo (2 hits de grep), eliminando a dependência de conhecimento tribal sobre o protocolo.
3. Ciclo `01_rate_limiter` certificado como `implemented` no catálogo com os 6 artefatos de evidência completos (spec, 3 implementações ≥80%, review, benchmark N≥3, evolution report, verifier PASS).
4. Um segundo ciclo completo de 5 fases (projeto 02) prova que `scaffolded → implemented` acontece via processo documentado, sem edição direta de estado.
5. Um segundo gate de aprendizado real fechado (U1) via verificador + regeneração de views, provando que U0 não foi um caso isolado.

## Non-Goals

- **Encounters 05–18 do pixelDojo** (Fase 3.1) — fora de escopo até o projeto correspondente virar `implemented` no catálogo; construir antes é inventário parado.
- **Piloto voxelDojo game-10-hash-ring** (Fase 3.2) — fora de escopo até a unidade de consistent hashing entrar em `practicing`; gatilho de currículo, não de calendário.
- **Automação via openclaw** (Fase 4) — fora de escopo até 2 loops manuais completos (Fases 1+2) provarem o processo; automatizar um processo não-validado é o erro que este plano evita.
- **Alertas ativos (F7)** — explicitamente adiado; registrado como revisão futura, não como item deste plano.
- **Edição direta de `pipeline_status.md` ou do catálogo** — nunca é uma forma válida de avançar fase; é exatamente o anti-padrão que gerou o GAP 1.

## User Stories

- Como mantenedor do ecossistema, quero commitar os 4 games do voxelDojo em commits separados (1 por game, sem alterar conteúdo) para que o histórico do git continue sendo a fonte auditável de estado (F4).
- Como mantenedor do ecossistema, quero que `docs/FUNDAMENTOS.md` esteja linkado no `CLAUDE.md` raiz e no `MANIFEST.md` para que sessões futuras descubram o protocolo sem precisar perguntar.
- Como aprendiz, quero que um reviewer independente avalie minhas 3 implementações do rate limiter para que produtor e verificador continuem separados (regra de ouro 2).
- Como aprendiz, quero benchmarks com N≥3 execuções por implementação para que alegações de performance não venham de uma única rodada ruidosa.
- Como aprendiz, quero que o passo de optimize e a certificação no catálogo fechem o ciclo com evidência completa para que "implemented" continue significando algo verificável.
- Como aprendiz, quero repetir o ciclo completo de 5 fases no projeto 02 pelo caminho de promoção documentado (`BACKLOG_STATUS.md`) para que `scaffolded → implemented` nunca dependa de editar estado à mão.
- Como aprendiz, quero tentar um encounter real e ter a tentativa verificada antes de `units_log` registrar U1 para que mastery continue exigindo evidência (regra de ouro 1).
- Como mantenedor do ecossistema, quero que os encounters 05–18 do pixelDojo só sejam construídos quando o projeto correspondente virar `implemented`, evitando conteúdo de jogo à frente do currículo.
- Como mantenedor do ecossistema, quero que o piloto voxelDojo do hash-ring só avance quando a unidade de consistent hashing entrar em `practicing`, e quero a armadilha conhecida do FNV sem finalizer documentada antes de reimplementar.
- Como mantenedor do ecossistema, quero que o openclaw só orquestre transições de fase depois de 2 loops manuais provados, para que a automação codifique um processo validado, não uma aposta.

## Requirements

### Must-Have (P0) — Fase 0 (higiene) + Fase 1 (fechar o ciclo do 01_rate_limiter)

**0.1 — Commitar trabalho untracked do voxelDojo**
- Contexto: `engines/voxelDojo/` tem `game-11-air-traffic/`, `game-12-mission-control/`, `game-16-freight-yard/`, `game-17-lighthouse-network/` untracked.
- Comportamento esperado: 1 commit por game, mensagem descritiva, sem alterar conteúdo, sem tocar em `learner/` nem `curriculum/`.
- Aceite: `git status --porcelain` vazio para `engines/voxelDojo/`.
- Não inclui: revisar ou testar os games (fica para a Fase 3, sob gatilho).

**0.2 — Registrar FUNDAMENTOS no mapa do ecossistema**
- Contexto: `docs/FUNDAMENTOS.md` criado 2026-07-05; `CLAUDE.md` raiz e `engines/codexDojo/ecosystem/MANIFEST.md` não o referenciam.
- Comportamento esperado: link para `docs/FUNDAMENTOS.md` em ambos os arquivos, mudança mínima (1-2 linhas cada).
- Aceite: `grep FUNDAMENTOS CLAUDE.md engines/codexDojo/ecosystem/MANIFEST.md` retorna 2 hits.
- Não inclui: reorganizar o handbook.

**1.1 — Review do ciclo 01_rate_limiter**
- Contexto: `learner/pipeline_status.md` em `impl-done`; 3 implementações prontas (node 91.86%, go 85.9%, rust 20 testes).
- Comportamento esperado: rodar `/devschool-review` no ciclo `2026-06-04-01-rate-limiter`; reviewer ≠ quem implementou; sem editar as implementações durante o review.
- Aceite: `pipeline_status.md` avança de `impl-done` para `review-done`; notas de review em `curriculum/01_rate_limiter/`.
- Não inclui: benchmark e optimize (próximos pedidos, não encadear).

**1.2 — Benchmark N≥3**
- Contexto: `review-done`; benchmark anterior era N=1 e o gate exige N≥3.
- Comportamento esperado: rodar `/devschool-benchmark` com N≥3 execuções por implementação, mesmas condições entre linguagens, resultado persistido como artefato (não só no chat).
- Aceite: artefato de benchmark em `curriculum/01_rate_limiter/` com N≥3 por implementação; pipeline avança.
- Não inclui: otimizar código com base nos números (próximo pedido).

**1.3 — Optimize + certificação no catálogo**
- Contexto: benchmark N≥3 concluído.
- Comportamento esperado: rodar `/devschool-optimize`; `/simplify` no diff antes de commitar (regra de ouro 5); catálogo confirma 01 como `implemented` com evidência completa (spec, 3 impls ≥80%, review, benchmark N≥3, evolution report, verifier PASS).
- Aceite: `curriculum/BACKLOG_STATUS.md` e `catalog.md` consistentes; `pipeline_status.md` marca o ciclo completo.
- Não inclui: iniciar o projeto 02 (Fase 2, gatilho separado).

### Should-Have (P1) — Fase 2 (prova de repetibilidade, depende de P0 completo)

**2.1 — Ciclo de 5 fases no projeto 02**
- Contexto: projeto 02 está `scaffolded`; o ciclo do 01 completo serve de referência.
- Comportamento esperado: rodar o ciclo completo (spec → impl → review → benchmark N≥3 → optimize) seguindo exatamente o caminho de promoção do `BACKLOG_STATUS.md`, sem atalhos de estado.
- Aceite: 02 aparece `implemented` no catálogo com os 6 artefatos de evidência.
- Não inclui: projetos 03+.

**2.2 — Gate de aprendizado da próxima unidade (U1)**
- Contexto: U0 gateado 2026-07-05 (única entrada legítima em `units_log`); verificador em `engines/pixelDojo/verifier/`.
- Comportamento esperado: jogar encounter → evidência persistida → `python3 -m engines.pixelDojo.verifier` → `python3 -m learner.substrate`; tentativa real do aprendiz antes de qualquer avaliação (regra de ouro 1).
- Aceite: `units_log` ganha 1 entrada nova com attempt file correspondente em `learner/attempts/`; views regeneradas.
- Não inclui: gates em lote — 1 unidade por vez.

### Future Considerations (P2) — Fases 3 e 4 (gatilho, não calendário)

**3.1 — Encounters 05–18 do pixelDojo**
- Gatilho: o projeto correspondente virar `implemented` no catálogo.
- Comportamento esperado: encounter jogável emitindo evidência no contrato de `docs/design/teaching-game-contract.md`; `pnpm run lint/test/build/smoke` verdes.
- Aceite: encounter jogável; evidência validada pelo verifier em dry-run.
- Não inclui: outros projetos sem gatilho disparado.

**3.2 — Piloto voxelDojo (game-10-hash-ring)**
- Gatilho: a unidade de consistent hashing entrar em `practicing`.
- Comportamento esperado: continuar o piloto até emitir evidência no mesmo contrato cross-engine; atenção à armadilha conhecida do FNV sem finalizer.

**4 — Automação via openclaw**
- Gatilho: 2 loops manuais completos (Fases 1 + 2).
- Comportamento esperado: openclaw orquestra as transições de fase do pipeline (dispara agente da fase seguinte quando `pipeline_status` muda); filesystem continua fonte da verdade; eventos Hermes em `.mavis/hermes/`; começar em modo simulate.
- Aceite: `python3 -m pytest engines/openclaw/tests/` verde + 1 transição de fase real disparada pelo runner com trace auditável.
- Não inclui: alertas ativos (F7) — registrado como revisão futura, não como item deste ciclo.

## Success Metrics

**Leading (mudam rápido, por item):**
- Cada item fecha com o próprio comando de aceite executado e o output conferido antes de marcar concluído — nada de ✓ sem output (F3/F6).
- Fase 0 (0.1, 0.2) fechada no mesmo dia por serem independentes e de baixo esforço.
- Fase 1 (1.1 → 1.2 → 1.3) fechada sequencialmente, sem pular etapa nem encadear pedidos (regra 1 de `FUNDAMENTOS.md`).

**Lagging (o sinal real do roadmap, conforme a própria Fase 2 se define como "prova de repetibilidade"):**
- Repetibilidade binária: o ciclo do projeto 02 chega a `implemented` com a mesma completude de evidência do 01, sem nenhum patch manual de estado — pass/fail, não percentual.
- Segundo gate real binário: U1 fecha pelo mesmo caminho verificador → substrate que fechou U0 — pass/fail.
- Essas duas metas binárias, juntas, são a prova de que o processo escala; não há métrica de "quantos %" porque o objetivo é demonstrar repetição fiel, não velocidade.

Nenhuma métrica adicional de roadmap foi definida além do ACEITE por item (confirmado com o usuário) — os critérios por item já bastam como critério de sucesso.

## Open Questions

- Quando o projeto 02 estará de fato pronto (`scaffolded`) para iniciar a Fase 2.1? — currículo.
- Qual encounter/unidade específica corresponde a U1? — currículo.
- Quando múltiplos projetos do pixelDojo virarem `implemented` ao mesmo tempo, qual é a ordem de prioridade entre os encounters 05–18? — produto/currículo.
- Para a Fase 4, o que conta como "trace auditável" suficiente antes de sair do modo simulate do openclaw? — engenharia.

## Timeline Considerations

- Ritmo livre, sem prazo fixo (confirmado com o usuário) — nenhuma data-alvo de calendário para o roadmap completo.
- Dependências sequenciais dentro de cada fase: 0.1 e 0.2 são independentes entre si; 1.1 → 1.2 → 1.3 é estritamente sequencial (sessão Claude Code em `engines/miniMaxEvolutionEngine/`); 2.1 → 2.2 depende da Fase 1 completa.
- Fase 4 só começa depois de 2 loops manuais completos (Fases 1+2); Fases 3.1/3.2 ficam fora da linha crítica e só avançam por gatilho de currículo, nunca por agenda.
- Progresso auditável do dia a dia continua vivendo em `learner/pipeline_status.md` e no catálogo — este documento é a spec, não o tracker.
