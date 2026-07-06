# Plano de Execução — recomendações abertas

**Data:** 2026-07-05 · **Fontes:** `docs/ARCHITECTURE_EVALUATION_2026-07-05.md` (sequência recomendada) + `docs/FUNDAMENTOS.md` (protocolo)
**Já fechado (não replanejam):** GAP 1 (integridade do estado), GAP 2 (verificador pixelDojo), GAP 5 (voxelDojo mantido), GAP 6 (CLAUDE.md com 6 engines), MVP (1º loop real, U0).

Cada item abaixo vem com o **pedido pronto no formato 5 campos** — copie e cole na sessão indicada. O plano dogfooda o protocolo do FUNDAMENTOS: um objetivo por pedido, aceite executável, prova junto da entrega.

---

## Fase 0 — Higiene imediata (hoje, qualquer sessão)

### 0.1 Commitar trabalho untracked do voxelDojo

`git status` mostra `game-11-air-traffic/`, `game-12-mission-control/`, `game-16-freight-yard/`, `game-17-lighthouse-network/` untracked. Trabalho não commitado viola F4 (estado auditável).

```
CONTEXTO:  engines/voxelDojo/ tem 4 pastas game-* untracked (git status)
OBJETIVO:  commitar os 4 games em commits separados (1 por game) com mensagem descritiva
RESTRIÇÕES: não alterar conteúdo; não tocar em learner/ nem curriculum/
ACEITE:    git status --porcelain vazio para engines/voxelDojo/
NÃO-META:  revisar/testar os games (fica para a Fase 3)
```

### 0.2 Registrar FUNDAMENTOS no mapa do ecossistema

```
CONTEXTO:  docs/FUNDAMENTOS.md criado 2026-07-05; CLAUDE.md raiz e engines/codexDojo/ecosystem/MANIFEST.md não o referenciam
OBJETIVO:  adicionar link para docs/FUNDAMENTOS.md no CLAUDE.md raiz e entrada no MANIFEST.md
RESTRIÇÕES: mudança mínima (1-2 linhas por arquivo)
ACEITE:    grep FUNDAMENTOS CLAUDE.md engines/codexDojo/ecosystem/MANIFEST.md retorna 2 hits
NÃO-META:  reorganizar o handbook
```

---

## Fase 1 — Fechar o ciclo do 01_rate_limiter (GAP 3)

**Sessão:** Claude Code com raiz em `engines/miniMaxEvolutionEngine/`. Pipeline está em `impl-done` desde 2026-06-04, `awaiting: reviewer`. Três pedidos **sequenciais** (não juntar — regra 1 do protocolo):

### 1.1 Review

```
CONTEXTO:  learner/pipeline_status.md em impl-done; 3 impls prontas (node 91.86%, go 85.9%, rust 20 testes)
OBJETIVO:  rodar /devschool-review no ciclo 2026-06-04-01-rate-limiter
RESTRIÇÕES: reviewer ≠ quem implementou (produtor ≠ verificador); não editar as impls durante o review
ACEITE:    pipeline_status.md avança de impl-done para review-done; notas de review em curriculum/01_rate_limiter/
NÃO-META:  benchmark e optimize
```

### 1.2 Benchmark (N≥3)

```
CONTEXTO:  review-done; benchmark anterior era N=1 e o gate exige N≥3
OBJETIVO:  rodar /devschool-benchmark com N≥3 execuções por implementação
RESTRIÇÕES: mesmas condições entre linguagens; resultados persistidos como artefato, não só no chat
ACEITE:    artefato de benchmark em curriculum/01_rate_limiter/ com N≥3 por impl; pipeline avança
NÃO-META:  otimizar código com base nos números (próximo pedido)
```

### 1.3 Optimize + certificação no catálogo

```
CONTEXTO:  benchmark N≥3 concluído
OBJETIVO:  rodar /devschool-optimize e fechar o ciclo: catálogo confirma 01 como implemented com evidência completa (spec, 3 impls ≥80%, review, benchmark N≥3, evolution report, verifier PASS)
RESTRIÇÕES: /simplify no diff antes de commitar (regra de ouro 5)
ACEITE:    curriculum/BACKLOG_STATUS.md e catalog.md consistentes; pipeline_status.md marca ciclo completo
NÃO-META:  iniciar o projeto 02
```

---

## Fase 2 — Segundo loop pelo processo (prova de repetibilidade)

**Gatilho:** Fase 1 completa. O objetivo é promover `scaffolded → implemented` **via processo**, nunca via edição de estado (a lição do GAP 1).

### 2.1 Ciclo 5 fases no projeto 02

```
CONTEXTO:  projeto 02 está scaffolded em curriculum/; ciclo do 01 completo serve de referência
OBJETIVO:  rodar o ciclo completo (spec → impl → review → benchmark N≥3 → optimize) no 02
RESTRIÇÕES: seguir exatamente o caminho de promoção do BACKLOG_STATUS.md; sem atalhos de estado
ACEITE:    02 aparece implemented no catálogo com os 6 artefatos de evidência
NÃO-META:  projetos 03+
```

### 2.2 Gate de aprendizado da próxima unidade (U1)

```
CONTEXTO:  U0 gateado 2026-07-05 (única entrada legítima no units_log); verificador em engines/pixelDojo/verifier/
OBJETIVO:  fechar o 2º gate real: jogar encounter → evidência persistida → python3 -m engines.pixelDojo.verifier → python3 -m learner.substrate
RESTRIÇÕES: tentativa real do aprendiz antes de qualquer avaliação (regra de ouro 1)
ACEITE:    units_log ganha 1 entrada nova com attempt file correspondente em learner/attempts/; views regeneradas
NÃO-META:  gates em lote — 1 unidade por vez
```

---

## Fase 3 — Expansões condicionais (só quando o gatilho disparar)

### 3.1 Encounters 05–18 do pixelDojo (GAP 4, adiado por decisão)

**Gatilho:** o projeto correspondente virar `implemented` no catálogo. Expandir encounter **antes** do currículo alcançar é inventário parado.

```
CONTEXTO:  curriculumPack.ts tem projetos 05–18 sem encounterKind; projeto NN acabou de virar implemented
OBJETIVO:  adicionar encounter jogável para o projeto NN emitindo evidência no contrato de docs/design/teaching-game-contract.md
RESTRIÇÕES: seguir o contrato existente; pnpm run lint/test/build/smoke verdes
ACEITE:    encounter jogável; evidência validada pelo verifier em dry-run
NÃO-META:  outros projetos sem gatilho
```

### 3.2 Piloto voxelDojo (game-10-hash-ring)

**Gatilho:** U da unidade de consistent hashing entrar em `practicing`. Continuar o piloto até emitir evidência no mesmo contrato cross-engine. Atenção à armadilha conhecida do FNV sem finalizer.

---

## Fase 4 — Automação via openclaw

**Gatilho:** 2 loops manuais completos (Fases 1 + 2). Automatizar antes de provar o manual é automatizar um processo não-validado.

```
CONTEXTO:  openclaw roda em modo simulate; orquestração das 5 fases é 100% manual
OBJETIVO:  openclaw orquestra as transições de fase do pipeline (dispara agente da fase seguinte quando pipeline_status muda)
RESTRIÇÕES: filesystem continua fonte da verdade; eventos Hermes em .mavis/hermes/; começar em modo simulate
ACEITE:    python3 -m pytest engines/openclaw/tests/ verde + 1 transição de fase real disparada pelo runner com trace auditável
NÃO-META:  alertas ativos (F7) — registrar como revisão futura
```

---

## Ordem e dependências

```
0.1, 0.2 (independentes, hoje)
   └─ 1.1 → 1.2 → 1.3 (sequencial, sessão miniMaxEvolutionEngine)
          └─ 2.1 → 2.2
                 └─ 4 (gatilho: 2 loops completos)
3.1 / 3.2 fora da linha crítica — só por gatilho de currículo
```

**Regra de acompanhamento:** ao fechar cada item, o aceite executável roda **antes** de marcar concluído — nada de ✓ sem output (F3/F6). Progresso auditável fica em `learner/pipeline_status.md` e no catálogo, não neste doc.
