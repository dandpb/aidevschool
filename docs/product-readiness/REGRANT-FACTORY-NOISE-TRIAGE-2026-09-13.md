# Triagem do ruído da fábrica de re-grant — decisão §5.1 (AID-1738)

**Data:** 2026-09-13 · **Autor:** Engine Systems Engineer (ORDEM AID-1714/r3-B,
AID-1738 §5.1) · **Tipo:** doc/decisão (zero mudança de settings) ·
**Anexo:** §5.3 — elevação de gates a required (análise only)

---

## 1. Sintoma

Na janela auditada (últimas ~60 runs do workflow `CI` até 2026-09-13), as únicas
runs não-sucesso viviam em branches efêmeras `regrant/auto-*` da fábrica de
re-grant (`readiness-regrant.yml`), e a API retorna **lista de jobs vazia** para
essas runs depois que a branch é apagada — vermelho sem causa reconstruível.

## 2. Inventário first-hand (evidência coletada 2026-09-13 via GitHub API)

Fontes: `GET /repos/dandpb/aidevschool/actions/workflows/ci.yml/runs`,
`GET /repos/dandpb/aidevschool/actions/runs/{id}`,
`GET .../actions/runs/{id}/jobs`, `GET .../commits/{sha}/check-runs`,
`GET .../pulls?head=...`, `GET .../issues/{n}/timeline` (read-only).

| Run CI | id | branch | SHA head | event | conclusão | criada | PR (drill) |
|---|---|---|---|---|---|---|---|
| #1070 | 34749428567 | `regrant/auto-20260913-75cbafbc` | `8a4c6c1822` | pull_request | **failure** | 09:23:34Z | #385 |
| #1074 | 34749575654 | `regrant/auto-20260913-75cbafbc` | `7a0627b0c0` | pull_request | **action_required** | 09:28:52Z | #386 |
| #1079 | 34750690040 | `regrant/auto-20260913-50c23dad` | `331553534b` | pull_request | **failure** | 09:59:30Z | #387 |

Lane `main` no mesmo período: **100% verde** (#1077→#1083; head `4bb76005`,
run #1083 = 38 check-runs success/skipped, 0 fail).

Os 3 PRs são **fixture drills do AID-1669** (hardening R6 do gate de readiness,
executados durante o PR #384):

- PR #385: drill da factory run `34749394869` contra a run verde `34746601925` @ `75cbafbc`.
- PR #386: drill da factory run `34749555338` (mesma branch recriada — novo head `7a0627b0`).
- PR #387: drill da factory run `34750663024` contra a run verde `34750392397` @ `50c23dad` (main pós-merge do próprio R6).

Timeline dos PRs (ex. #387): `closed` por `dandpb` 10:00:02Z → comentário-recibo
do drill → `head_ref_deleted` 10:00:03Z. O executor do drill fecha **e apaga a
branch** em segundos — por design do protocolo de drill ("fechado sem merge por
design (§recusa: drill não recebe countersign); branch removida").

## 3. Root cause (cadeia)

1. **Gatilho:** os drills AID-1669 (workflow_dispatch `fixture_drill`) exercitam
   o caminho de produção da fábrica: fixture→DRIFT→dedupe→branch
   `regrant/auto-<data>-<sha8>`→propose exit-3→snapshot→push→PR.
2. **O vermelho é esperado na branch de proposta:** o PR de re-grant carrega
   **apenas o producer snapshot** (`regrant --propose` sai **3** — pendente de
   observação independente; o bot nunca escreve README/assessments). Na branch,
   `product readiness (claims)` falha no stale-window até haver countersign —
   é exatamente o sinal que a fábrica existe para dar. PR de proposta não é
   candidato a merge; drill fecha sem merge.
3. **Run #1074 (`action_required`):** a run do PR #386 ficou aguardando ação de
   mantenedor e foi suplantada pelo cleanup do drill ~45s depois. Diagnóstico
   micro (qual job/step esperava aprovação) é **impossível post-hoc** — ver 4.
4. **O apagão diagnóstico é a política de cleanup, não um bug do GitHub:** com a
   branch deletada, `GET .../actions/runs/{id}/jobs` → `jobs: []` (reproduzido
   para as 3 runs) e `GET .../commits/{sha}/check-runs` → `total_count: 0`
   (reproduzido para `8a4c6c1`, `7a0627b0`, `33155353`). O vermelho permanece
   no run list, mas sua causa evapora.
5. **Valor de sinal:** zero para regressão — main verde 100% no período; o
   vermelho vive só em branches de proposta efêmeras cuja falha é o comportamento
   desenhado. Custo: (a) "CI vermelho" perde significado em dashboards que não
   filtram por `head_branch`; (b) auditorias post-hoc (como esta) não distinguem
   "vermelho esperado de proposta" de "defeito real em branch de fábrica" após o
   delete; (c) ruído acumula por drill.

Nota: as runs da **própria fábrica** (workflow_dispatch na ref `main`) **continuam
acessíveis** (ex.: 34749394869/34749555338/34750663024) — o evidência do caminho
do drill é durável lá; o que se perde é o pós-mortem do CI **da branch**.

## 4. Política — auto-delete vs diagnóstico durável

| Opção | Descrição | Trade-off |
|---|---|---|
| A. Status quo | delete imediato no cleanup do drill/proposta | repo limpo; mantém custos (a)–(c) |
| B. Delete retardado | manter branch N dias | jobs ficam consultáveis por um tempo; poluição + perda eventual anyway |
| C. **Diagnóstico durável no cleanup** | antes de fechar/deletar, capturar o resumo dos jobs da run (nome+conclusão via API) num **comentário no PR** (PR sobrevive ao delete da branch) e/ou no corpo do recibo do drill | custo mínimo (1 chamada API + 1 comentário); zero mudança de semântica de workflow; auto-delete permanece |
| D. CI informativo em `regrant/auto-*` | pular/enfraquecer o gate de readiness na branch de proposta | **rejeitado**: a fase QA observa NA branch (commits `synchronize` disparam CI normal); verde-por-skip esconderia regressão de producer durante a observação |
| E. Convenção de consumo | dashboards/queries tratam vermelho em `head_branch ~ ^regrant/auto-` como proposal-red | zero mudança no repo; precisa estar escrito (este doc) |

**Decisão recomendada: C + E.** O auto-delete permanece (evita galho morto e
confusão com a dedupe de branches antigas); a durabilidade do diagnóstico muda de
lugar: do branch (efêmero por natureza) para o **PR + recibo do drill**
(duráveis por natureza). Implementação: passo de captura no protocolo de
cleanup do executor do drill (lado Paperclip/agent, não workflow) —
"antes de `git push origin --delete`/fechar: `gh api .../runs/{id}/jobs` →
comentário no PR com nome+conclusão de cada job vermelho".

Nenhuma mudança em `ci.yml`/`readiness-regrant.yml`/branch protection é
necessária ou desejada para §5.1 (boundary da ORDEM).

## 5. Anexo §5.3 — elevar gates a required (ANÁLISE ONLY; nada executado)

Boundary: branch protection é propriedade do kit de ativação R1 (AID-1555,
payload D; gate founder `cd35f433`); qualquer elevação deve cavalgar o ratchet
do kit (emenda B1), nunca ad-hoc. Estado atual (verificado first-hand pela
auditoria PCIE AID-1724, recibo 1b153491 de 2026-09-13): 4 contexts required —
`literacyDojo (TS + content)`, `codexdojo-os (TS)`, `Python (learner +
curriculum shared)`, `product readiness (claims)`; `strict=true`;
`enforce_admins=true`; `allow_force_pushes=true` (delta que o kit fecha).

Candidatos e análise custo/benefício por contexto:

| Contexto (hoje não-required) | Benefício | Custo/risco | Leitura |
|---|---|---|---|
| `pixelDojo (TS)` | fecha lacuna learner-facing (jogo carrega o contrato de evidência NDJSON do learning gate) | já roda em todo PR; só muda bloqueio | **elevar no ratchet R1** (prioridade alta) |
| `miniTown (TS)` | idem, superfície Level 0 | idem | elevar no ratchet R1 |
| `dojoToday (TS + substrate)` | idem; roda `test:readiness` (producer report) | idem | elevar no ratchet R1 |
| `voxelDojo` matriz (16 contexts `game-*`) | cobrir regressão por jogo | contexts escalam com `catalog.json` — required por job quebra a cada jogo novo até editar protection | **não** requerer jobs individuais; agregar num meta-check antes |
| `curriculum Node/Go/Rust` | proteger evidência executável compartilhada | jobs numerosos; Go/Rust sem lane? (checar antes) | análise própria antes de elevar |
| `SDLC guardrails (diff)` / `Promotion precheck baseline` | guardrails bloqueantes | **já mapeados no payload D do kit R1** | caminho correto = kit, não ad-hoc |

Recomendação §5.3: (i) pixelDojo/miniTown/dojoToday entram na emenda B1 do kit
R1 como primeira leva do ratchet; (ii) voxeldojo ganha meta-check agregado
(barato, estilo `product-readiness`) antes de qualquer required; (iii) nada é
executado agora — decisão e sequência pertencem ao PRE/founder pelo kit.

> **Atualização (2026-09-13, AID-1757/r7-C):** a análise completa com dados
> quantitativos (82 runs, custo/benefício por contexto, falso-verde do agregador)
> está em
> [`REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md`](REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md).
> Recomendação refinada: onda 1 = os 4 contexts raiz (`pixelDojo (TS)`,
> `miniTown (TS)`, `dojoToday (TS + substrate)`, `voxelDojo (TS)` — nome estável);
> matriz `games/<id>` nunca required crua; meta-check agregado só como onda 2
> opcional.

## 6. Fontes

- API GitHub (read-only, 2026-09-13, sessão ESE/AID-1738): endpoints listados no §2.
- PRs #385/#386/#387 (timelines + comentários-recibo dos drills AID-1669).
- `readiness-regrant.yml` @ main `4bb7600` (factory + drills AID-1669).
- AID-1724 recibo 1b153491 (protection facts first-hand PCIE, 2026-09-13).
- AID-1716 recibo a4c30b89 §4 (descoberta do sintoma na auditoria de onboarding).
