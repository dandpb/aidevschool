# Fundamentos — construir sistema robusto + comunicar com IA

**Data:** 2026-07-05 · **Status:** Accepted · **Decisor:** Daniel
**Base:** `docs/PROMPTS/-01_GOAL.md`, regras de ouro (`CLAUDE.md`), lições da avaliação `docs/ARCHITECTURE_EVALUATION_2026-07-05.md`.

Este doc responde duas perguntas: (1) que fundamentos tornam um sistema robusto, e (2) como pedir trabalho à IA de forma concisa e receber entregas de qualidade. Os dois lados são o mesmo problema: **qualidade nasce de contrato explícito + verificação independente**.

---

## Parte 1 — Fundamentos de robustez

Cada fundamento abaixo já tem prova (positiva ou negativa) neste repo.

### F1. Contrato antes de código

Defina a interface entre duas partes (schema, formato de arquivo, evento) antes de implementar qualquer lado. Sem contrato, cada peça "funciona" isolada e o sistema não funciona.
**Prova aqui:** pixelDojo emitia evidência perfeita que ninguém lia (GAP 2) — o contrato existia só de um lado. `docs/design/teaching-game-contract.md` é o antídoto: qualquer engine novo implementa o contrato, não inventa um.

### F2. Uma fonte da verdade, muitas views derivadas

Estado canônico em um lugar (`learner/`); todo o resto é regenerado (`python3 -m learner.substrate`). Nunca edite a view; edite a fonte e re-sincronize.
**Por quê:** elimina a classe inteira de bugs "dashboards divergentes". Custo: disciplina de rodar o sync.

### F3. Produtor ≠ verificador, e afirmação exige evidência

Quem produz não atesta a própria qualidade. Todo estado importante ("mastered", "benchmark ok", "paridade") precisa de um artefato executável que qualquer um pode rodar.
**Prova aqui:** as 18 masterizações falsas de 2026-07-01 — um commit escreveu `mastered: true` sem tentativa alguma no filesystem. O sistema violou a própria regra e todos os consumidores exibiram dados falsos até a reversão de 2026-07-05.

### F4. Estado auditável: texto plano + git

Markdown/YAML/NDJSON versionados. Se você não consegue fazer `git log` do estado, não consegue descobrir quando ele mentiu.
**Prova aqui:** o GAP 1 só foi detectável porque `learning_state.yaml` e `attempts/` são arquivos comparáveis. Foi o `git log` que apontou o commit `04a3463` como origem.

### F5. Fatia vertical antes de escala horizontal

Feche **um** loop de ponta a ponta antes de replicar para 18. Um tracer bullet fino atravessando todas as camadas vale mais que 6 engines 80% prontos.
**Prova aqui:** o MVP só fechou quando o foco virou "U0 gated com evidência real", não "todos os engines avançando em paralelo".

### F6. Gates empíricos, não opinião

Critérios de aceite numéricos e pré-declarados (thresholds em `config/learner.yaml`, benchmark N≥3). "Parece bom" não é gate; "p95 < 50ms em 3 execuções" é.

### F7. Falha visível por padrão

Todo processo longo escreve onde parou (`pipeline_status.md`), e invariantes rodam como código (`learner.substrate.validate`). Sistema robusto não é o que não falha — é o que **mostra** onde falhou.
**Prova aqui:** o loop do miniMaxEvolutionEngine ficou parado em `impl-done` por um mês, mas o arquivo de status tornou isso um fato verificável, não uma surpresa.

### F8. Simplicidade como passo obrigatório

Complexidade é o custo que você paga para sempre. Daí a regra: `/simplify` no diff **antes** de commitar, sempre. Menos peças móveis = menos superfície para os fundamentos F1–F7 falharem.

---

## Parte 2 — Protocolo de comunicação com IA

Comunicar bem com IA = aplicar F1 (contrato) e F6 (gate) ao pedido. Pedido vago produz entrega vaga com confiança alta.

### Anatomia de um pedido de qualidade (5 campos, ~5 linhas)

```
CONTEXTO:  onde mexer (caminhos de arquivo, não descrições) + 1 linha de situação
OBJETIVO:  resultado observável, um só ("verificador lê evidência X e escreve units_log")
RESTRIÇÕES: o que NÃO pode mudar; limites (sem lib nova, não tocar em learner/)
ACEITE:    comando que prova que ficou pronto ("make test-substrate passa; attempt aparece em learner/attempts/")
NÃO-META:  o que fica de fora desta entrega
```

Campos que você omite viram decisões que a IA toma por você — e ela decide pelo caminho estatisticamente comum, não pelo seu.

### Regras de conduta

1. **Uma entrega por pedido.** "Implementa X e aproveita e refatora Y" = duas entregas medíocres. Encadeie pedidos, não escopos.
2. **Peça a prova junto com a entrega.** Termine pedidos com "mostre o comando/teste que verifica". Isso força a IA a fechar o loop F3 em vez de afirmar sucesso.
3. **Decisão grande → opções antes de código.** "Me dê 2–3 opções com trade-offs (ADR curto), não implemente ainda." Código é a forma mais cara de explorar uma decisão.
4. **Corrija com diff, não com 'refaz'.** Feedback específico ("o campo X deveria vir de Y") converge em 1 iteração; "não gostei" converge nunca.
5. **Referencie por caminho.** `learner/learning_state.yaml`, não "o arquivo de estado". Ambiguidade de referência é a fonte nº 1 de retrabalho.
6. **Desconfie de afirmações sem artefato.** "Testes passando" sem output de teste = não aconteceu. A mesma regra de ouro 3 do ecossistema vale para a conversa.
7. **Contexto persistente vive em arquivo, não no chat.** O que a IA precisa saber sempre → `CLAUDE.md`/`AGENTS.md`. Chat é volátil; repo é a memória (F4 aplicado à comunicação).

### Template ADR-lite (para decisões de arquitetura)

```
# ADR-NNN: <título>
Status / Data / Contexto (3 linhas)
Opções: A vs B — complexidade, custo, familiaridade (tabela curta)
Decisão + por quê
Consequências: o que fica mais fácil / mais difícil / revisitar quando
```

Guarde em `docs/design/`. Uma decisão sem registro será rediscutida do zero em 3 meses.

### Anti-padrões de pedido

| Anti-padrão | Sintoma | Correção |
| --- | --- | --- |
| Pedido-romance | 20 linhas de história, 0 critério de aceite | Corte para os 5 campos |
| Escopo-polvo | "e também... e já que está aí..." | 1 objetivo por pedido |
| Aceite implícito | "melhora a performance" | "p95 < Xms medido por Y" |
| Confiança emprestada | aceitar "pronto ✓" sem rodar nada | exigir comando de prova |
| Contexto reenviado | colar o mesmo contexto todo chat | mover para CLAUDE.md |

---

## Consequências

- Fica mais fácil: detectar entrega falsa cedo, retomar trabalho parado, plugar engines novos (contrato), delegar para IA com previsibilidade.
- Fica mais caro: cada pedido exige 2 min de estruturação; todo estado novo exige pensar "quem verifica isso?".
- Revisitar quando: o openclaw automatizar o loop (F7 precisará de alerta ativo, não só arquivo de status).
