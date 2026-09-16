# AID-2104 — Achados de Docs (campanha de testes e2e)

**Data:** 2026-09-16
**Autor:** Docs & Readiness Engineer (agente)
**Issues:** AID-2117 (esta auditoria) / parent AID-2104
**Baseline auditado:** `origin/main` @ `df7d7d82`
**Status:** achado 1 e 2 corrigidos no PR desta issue (ver recibo em AID-2117)

Este documento registra, com evidência verificável, os achados de precisão dos mapas de
documentação (`AGENTS.md` raiz e `engines/AGENTS.md`) durante a campanha AID-2104, para que
a navegação WHERE-TO-LOOK fique sem referências mortas nas engines cobertas.

---

## Achado 1 — Entrada fantasma `engines/zai-duolingo-like/` (corrigido)

**Sintoma.** `AGENTS.md` (árvore STRUCTURE + tabela WHERE TO LOOK) e `engines/AGENTS.md`
(idem) referenciavam `engines/zai-duolingo-like/` como protótipo "Vertical Protocol",
"future engine, do not delete" — mas o diretório não existe no checkout.

**Investigação (história git).**

| Quando | Commit | Fato |
| --- | --- | --- |
| 2026-08-13 | `cc4e6906` | docs(engines) indexa `zai-duolingo-like` na raiz e em `engines/AGENTS.md` (+14 linhas). Neste commit, `engines/zai-duolingo-like` era um **gitlink** (`git ls-tree cc4e6906^{tree} engines/` → modo `160000 commit 81098710...`) **sem entrada em `.gitmodules`** (não havia `.gitmodules` no repo). |
| 2026-09-07 | `c604d2ec` | "Optimize adjacent cell lookups and remove dangling submodule" **remove o gitlink** (1 deletion; jules-bot co-autorado por dandpb). Remoção intencional de um submodule pendurado. |

**Decisão.** Não foi remoção acidental de conteúdo: nunca houve conteúdo deste repo —
apenas um ponteiro gitlink sem URL configurada (irrecuperável dentro do repo). A correção
correta é **remover as 4 referências mortas**, não "restaurar" o diretório:

- `AGENTS.md`: linha da árvore STRUCTURE + linha da tabela WHERE TO LOOK;
- `engines/AGENTS.md`: linha da árvore STRUCTURE + linha da tabela WHERE TO LOOK.

Em ambos os arquivos foi deixada uma nota histórica datada (mesmo padrão do precedente
`polyglotEvolutionArena/`, demotado 2026-06-21) para que agentes futuros não "restaurem"
a entrada sem conteúdo real.

## Achado 2 — Caminhos ambíguos/mortos do Project 02 no WHERE-TO-LOOK (corrigido)

A row "Work on Project 02's verified implementation" do `AGENTS.md` raiz indicava
`docs/benchmark_results.md` e `docs/evolution_report.md` como se fossem relativos a
`curriculum/02_key_value_store/node-impl/` — caminhos inexistentes sob `node-impl/`
(que só tem `reports/`). Os arquivos reais estão no nível do projeto:

- `curriculum/02_key_value_store/docs/benchmark_results.md`
- `curriculum/02_key_value_store/docs/evolution_report.md`

Corrigido para os caminhos completos, sem ambiguidade.

## Achado 3 — Falsos positivos do audit (nenhuma ação)

- `engines/polyglotEvolutionArena/` e `engines/zai-duolingo-like/` citados em **prosa
  histórica datada** (NOTES/STRUCTURE), não como links de navegação — precedente do
  polyglot arena (`AGENTS.md` NOTES).
- `codexDojo/ecosystem/MANIFEST.md`, `pixelDojo/pixel-quest/`, `shared/teaching-evidence/`
  em `engines/AGENTS.md` são caminhos **relativos a engines/** (convenção do próprio
  arquivo: "commands are engine-local") e existem sob `engines/`.

## Audit de caminhos (evidência)

Método: extração de todos os caminhos entre backticks nos dois mapas + verificação de
existência no checkout (script ad hoc, executado sobre a working tree do PR).

| Mapa | Caminhos únicos verificados | Mortos após o PR |
| --- | --- | --- |
| `AGENTS.md` (raiz) | 42 | 0 navegacionais (2 citações históricas em prosa) |
| `engines/AGENTS.md` | 6 | 0 (todos engines-relativos existentes; 1 citação histórica) |

Engines cobertas pela campanha e confirmadas presentes nos mapas: codexDojo,
codexdojo-os-prototype, literacyDojo, dojoToday, aiDevschoolMvp, minimaxDojo,
miniMaxEvolutionEngine, miniTown, openclaw, pixelDojo, shared, voxelDojo.

---

## Achados reportados pelos testadores (seção acumulativa)

Testadores da campanha AID-2104: reportem achados de docs (link morto, claim sem data,
mapa desatualizado) como comentário na issue AID-2117; o Docs Engineer consolida aqui.

| Data | Reporter | Issue/PR de origem | Achado | Ação |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |
