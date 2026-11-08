# AID-3593: Projetar pedido estruturado pg-d02

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Content Designer | **Created:** 2026-10-01T05:46:07.554834+00:00 | **Updated:** 2026-11-01T14:14:31.101+00:00
- **ID:** `4cc76349-4bb9-4118-b1cd-bf9c442298bd`

## Description

PO aprovou a próxima fatia útil: tornar pg-d02/U03 consumível pelo player existente. Esta tarefa entrega só a projeção determinística de fonte, com CPE produtor e Content Designer revisor nativo; o player LEE depende deste aceite. Dedup: busca atual de tasks pg-d02 sem trabalho aberto; conteúdo existente é AID-3553/PR631, não recriar currículo. Aceite CD final verdadeiro41c2b482-ffcd-4a34-a094-3204731eca18 verifica errata no head4cabf984591f0d5cf4046e0264871811dd6bd18a, preservando parecer9bfee683. Addendum63193b8c é proveniência anterior, não substituir o aceite final. Fonte imutável PR631 nesse SHA, basePR620e01d9d42b99434c10d8f155cde0cbbc57b25cf61.



Worktree dedicada, novo Draft isolado, manifest de composição com SHAs exatos; não alterar PRs/fontes congeladas nem shared WIP. Boundary: somente novos arquivos curriculum/sequencia-dev-guiada/tools/pg-d02-source-adapter.mjs, pg-d02-source-adapter.test.mjs e fixtures/pg-d02-source-contract.json (mais README curto local se necessário). Reusar contratos de authoring e abordagem explícita aprovada do pg-c01; não criar segundo compilador universal, runtime, catálogo, binding, lição, backend ou migração.



Extrair fielmente objetivo de reescrever pedido em CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META, template de5campos, casos B1/B2,6passos de tentativa,7critérios/IDs e perCheck learner-facing realmente ratificados, retry só critérios reprovados, prompts takeaway e met/partial justificado/not\_met. Avalia o pedido, NÃO implementa --types. Não transportar política binária/cap2 do pg-c01. CD deve ratificar explicitamente a allowlist de prompts/feedback/verificação e a separação do guia-de-correcao/solução para momento apropriado; não pré-carregar gabarito docente visível. Preservar guardas “consulte após tentativa”. Descrever separação pedagógica, não garantia de segurança/anti-cheat.



Contrato traz pins/hashes por fonte e output estável, identidade/versão sem default inventado. Não truncar IDs anotados nem pipes em comandos da tabela; Âncoras/insumos diferem de pg-d01, não aplicar cegamente regex antiga. Goldens positivos e negativos: hashes/fidelidade, campos/passos/critérios/takeaways exatos, source drift, arquivo/critério ausente ou desconhecido, conteúdo docente no learner projection, determinismoCLI. Produzir um artefato final pronto para consumo posterior, com limitações explícitas. Sem rodar suítes completas inalteradas.



Entrega: PR/head, composição/fonte/hash/bytes, testes focados reais e run/session genuínos; CD revisa na etapa nativa antes de liberar consumidor. Ao receber403/409/422, parar na primeira negação e reportar; sem novo ator/endpoint/child ou mudança de owner como contorno. Para changes requested, handback nativo salva produtor antes do wake. Sem merge/publicação.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3593 — Projetar pedido estruturado pg-d02
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 642011a8-732d-4e78-88cc-8c1002a7b9c9
- Agent: Content Designer (opencode_local)

## Objective

PO aprovou a próxima fatia útil: tornar pg-d02/U03 consumível pelo player existente. Esta tarefa entrega só a projeção determinística de fonte, com CPE produtor e Content Designer revisor nativo; o player LEE depende deste aceite. Dedup: busca atual de tasks pg-d02 sem trabalho aberto; conteúdo existente é AID-3553/PR631, não recriar currículo. Aceite CD final verdadeiro41c2b482-ffcd-4a34-a094-3204731eca18 verifica errata no head4cabf984591f0d5cf4046e0264871811dd6bd18a, preservando parecer9bfee683. Addendum63193b8c é proveniência anterior, não substituir o aceite final. Fonte imutável PR631 nesse SHA, basePR620e01d9d42b99434c10d8f155cde0cbbc57b25cf61.



Worktree dedicada, novo Draft isolado, manifest de composição com SHAs exatos; não alterar PRs/fontes congeladas nem shared WIP. Boundary: somente novos arquivos curriculum/sequencia-dev-guiada/tools/pg-d02-source-adapter.mjs, pg-d02-source-adapter.test.mjs e fixtures/pg-d02-source-contract.json (mais README curto local se necessário). Reusar contratos de authoring e abordagem explícita aprovada do pg-c01; não criar segundo compilador universal, runtime, catálogo, binding, lição, backend ou migração.



Extrair
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `642011a8-732d-4e78-88cc-8c1002a7b9c9` finished with status `succeeded` at 2026-10-01T11:04:19.311Z.
- Wake: child **AID-3617** (interface delta) completed with my native approval at head `497fcf67`. Before closing the parent, I verify the child's completion state and the new head first-hand.

Child approved with my first-hand verification (`e7820c47`), including the PO's F1 correction (`edc8299a`: parity contract from PR628, not catalog `date.ordinal`). Now spot-checking the new head `497fcf67` before closing the parent.

All verified at the new head. Closing the parent with the final disposition.

Closed. One typo in my closing comment (blob `2bcf99f831` → correct is `2bcf99fbd831`) — posting a one-line errata to keep the evidence chain exact:

AID-3593 closed `done`. Final state verified:

**Chain complete:** frozen source `4cabf984` → pedagogical approval `844e4b67` @ `7746310c` → freezes `25e1ae8e` → PO F1 correction `edc8299a` (PR628 parity, not catalog `date.ordinal`) → child AID-3617 approved `e7820c47` @ `497fcf67`.

**Re-verified this heartbeat at `497fcf67`:** boundary intact (only the 3 files), PR #641 still Draft/OPEN, 26/26 tests, `--check ok sha256=e8054bc6…` (18473 bytes), `contentVersion=pg-d02@920e17baafd5`, anchors l16/U02 + M3 blob `2bcf99fbd8
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `642011a8-732d-4e78-88cc-8c1002a7b9c9` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (7)

**Curriculum Platform Engineer** · 2026-10-01T05:59:00.143112+00:00

**Entrega do produtor (CPE) — pedido de revisão nativa ao Content Designer**

**PR/head:** [#641 (Draft)](https://github.com/dandpb/aidevschool/pull/641) — branch `aid3593/pg-d02-source-adapter`, head `7746310c`, stacked no PR631; diff contém somente os 3 arquivos do boundary (`tools/pg-d02-source-adapter.mjs`, `tools/pg-d02-source-adapter.test.mjs`, `tools/fixtures/pg-d02-source-contract.json`). Fonte congelada intacta (PR631 head `4cabf984`, base PR620 `e01d9d42`); aceite final `41c2b482` / parecer `9bfee683` / addendum de provenância `63193b8c` registrados no pin do contrato.

**Composição/fonte/hash/bytes:** manifesto pinia os 8 arquivos do pacote (sha256+bytes — tabela completa no corpo do PR). Projeção canônica: `sha256=4812076c9d47a8b21fff24a7f5f2e755ddf321f446a8af1308645881d8fa33af`, 15453 bytes, determinística in-process e via CLI.

**Run/session genuíno (worktree dedicada `/tmp/opencode/wt3593`, node v24.18.0):** `node --test curriculum/sequencia-dev-guiada/tools/pg-d02-source-adapter.test.mjs` → **17/17 pass** (368ms); `--check ok sha256=4812076c…`. Goldens cobrem: hashes/fidelidade (pipes de comandos da tabela intactos — `stdlib\|silenciosamente\|determin`; IDs anotados c4/c6/c7→(objetivo a/b/c) sem truncar), campos/passos/critérios/takeaways exatos (5 campos, 6 passos, B1/B2, 7 critérios, prompts (a)/(b)), source drift (`E_SOURCE_HASH_MISMATCH`), arquivo/critério ausente/desconhecido (`E_CONTRACT_MISSING_FILE`/`E_CRITERION_MISSING`/`E_CRITERION_UNKNOWN`), conteúdo docente no learner projection (`E_GABARITO_LEAK` + controle negativo; 8 marcadores verificados gabarito-only), determinismo CLI (`--check`/`--out` = in-process byte a byte). Política binária do pg-c01 explicitamente rejeitada por teste negativo (veredito ternário `met/partial/not_met` fiel ao cabeçalho da rubrica v1). Sem suítes completas inalteradas.

**O que o aprendiz perceberá (via consumidor futuro):** nada ainda — sem player/UI/runtime; o artefato expõe objetivo nos 5 campos, B1/B2, template, 6 passos+recibo, 7 perChecks, retry só do critério reprovado, takeaway (a)/(b), com guardas "consulte após a tentativa" e "avalia o pedido, não a implementação", e nada do guia-de-correcao pré-carregado.

**Ratificação pedida ao CD (checklist no PR):** (1) allowlist de prompts/feedback/verificação (`reviewRequired: true`); (2) perChecks = 3ª coluna da rubrica v1, nenhum inventado/suprimido; (3) separação do guia-de-correcao para após a tentativa; (4) retry failed-only; (5) veredito ternário. Limitações explícitas no PR (fonte congelada → revisões exigem contrato repinchado; separação pedagógica ≠ garantia de segurança).

Player LEE (AID-3590/PR625) permanece bloqueado até este aceite. Sem merge/publicação — FPE merga até R1.

**Content Designer** · 2026-10-01T06:04:11.58014+00:00

**APPROVED — revisão nativa CD (Content Designer) — AID-3593, PR #641 head `7746310c`**

Verificação first-hand independente na worktree (head local = `origin/aid3593/pg-d02-source-adapter` = `7746310c`, base `4cabf984` = PR631 congelado, base PR620 `e01d9d42`):

**1. Boundary e integridade da fonte congelada** — diff `4cabf984..7746310c` = exatamente os 3 arquivos do boundary (`tools/pg-d02-source-adapter.mjs` 784L, `tools/pg-d02-source-adapter.test.mjs` 329L, `tools/fixtures/pg-d02-source-contract.json` 382L), +1495/−0; PR #641 (Draft, base `aid3553/pg-d02-pedido-estruturado`) confirma 3 changed files. Manifest pinia os 8 arquivos byte a byte (sha256+bytes conferidos); cadeia de aceite no pin verificada na thread AID-3553: `41c2b482` (aceite final, errata no head `4cabf984`) preserva parecer `9bfee683`; addendum `63193b8c` é proveniência anterior, corretamente não substitui o aceite. Sem tocar fontes congeladas, shared WIP, canônicos ou gates.

**2. Ratificações pedagógicas exigidas (checklist do PR) — todas RATIFICADAS:**
- **(1) Allowlist de prompts/feedback/verificação:** todas as extrações `reviewRequired: true` conferidas contra a fonte — objetivo nos 5 campos, B1/B2, template M3 §3.1, 6 passos + recibo ("Guarde:"), instrução de feedback ("A rúbrica é o contrato, não gosto"), retry, takeaway (a)/(b), guardas, veredito, pedido-original, 7 perChecks. Cada uma com hash pinado (`E_EXTRACTION_HASH_MISMATCH` em drift).
- **(2) perChecks = 3ª coluna da rubrica v1:** c1–c7 verbatim, nenhum inventado/suprimido; pipes do c5 (`grep -n "stdlib\|silenciosamente\|determin"`) chegam inteiros (code-span-aware split verificado); IDs anotados c4→(a)/c6→(b)/c7→(c) sem truncamento, coerentes com os objetivos (a)/(b)/(c) do enunciado.
- **(3) Separação do guia-de-correcao:** 8 marcadores verificados gabarito-only (ex.: "22 atuais" 2 ocorrências no guia, 0 na projeção); scan linha-a-linha do gabarito + controle negativo do detector; guardas "consulte **após** a tentativa" e "avalia o **pedido**, não a implementação" preservadas verbatim; enquadramento correto como separação pedagógica, não garantia de segurança/anti-cheat.
- **(4) Retry failed-only:** instrução fiel ("Refazer **apenas** o campo/critério reprovado") + `retry.failedCriteriaOnly: true`.
- **(5) Veredito ternário:** `met/partial/not_met` do cabeçalho da rubrica v1, `binary: false`, `partialRequiresJustification: true`, sem nota agregada; política binária sufficient/insufficient do pg-c01 explicitamente rejeitada por teste negativo.

**3. Abordagem e precedentes** — reuso fiel do padrão pg-c01 aprovado (AID-3583, `0d38a07c`): contrato-fonte pinado, allowlist por hash, goldens positivos/negativos, gates `E_*` — sem segundo compilador universal, runtime, catálogo, binding, lição, backend ou migração. Âncoras/hazards do pg-d02 (pipes, IDs anotados, ternário) tratados com seletores próprios, não regex antiga do pg-d01.

**4. Execução genuína reproduzida por mim** — `node --test` → **17/17 pass**; `--check ok sha256=4812076c…`; projeção regenerada por CLI = 15453 bytes, byte-ideterminística (in-process = CLI). Coincide com o relato do produtor.

**Não-bloqueante (observação):** `mergeable_state: unstable` no PR #641 é estado de Draft/CI — merge é do FPE (R1), fora deste aceite; sem merge/publicação aqui.

O consumidor LEE (AID-3590/PR625) fica liberado quanto a este aceite.

**founder** · 2026-10-01T10:28:49.7451+00:00

PO para [@Content Designer](agent://f2b1e95d-bf0f-4beb-b117-533728fabb1e?i=sparkles), owner atual: Dani pediu em 2026-10-01T10:22:34Z “continuar distribuindo as tarefas .. desbloquei as travadas”. Preservar o aceite pedagógico 844e4b67 no head PR641 7746310ca77c1d09481b0e91a2cdce4bcd4cc3aa e os 17/17; esta é uma lacuna de interface ainda não ratificada, não repetir o review fechado. Antes de liberar AID-3595, precisamos congelar explicitamente (1) a fórmula canônica de contentVersion, reutilizando semântica aceita do catálogo quando compatível; (2) âncoras estruturadas extraídas fielmente da fonte, incluindo l16/U02 ou equivalente, sem pré-requisito inventado; (3) allowlist ordenada dos seis arquivos learner-facing distinta do manifesto de oito fontes. Hashes dos dois guia-de-correcao servem apenas à proveniência, nunca autorizam seu conteúdo no payload learner. A fonte PR631 4cabf984591f0d5cf4046e0264871811dd6bd18a permanece congelada. Verifique o caminho nativo válido para o delta limitado com CPE produtor e CD independente; se o review concluído impedir handback, reporte o bloqueio exato antes de qualquer ação. Não reassigne review concluído à força, não crie filha/ator/endpoint para contornar negação, não mude gates/permissões e não libere3595 somente por Done pedagógico. Retornar contrato/head/hash ratificados e rota permitida; sem merge/deploy.

**Content Designer** · 2026-10-01T10:33:36.771964+00:00

**CD — bloqueio exato reportado ANTES de qualquer ação, freezes ratificados e rota permitida (resposta ao comentário PO 96ba0e63)**

## 0. Bloqueio exato (handback)

O review nativo desta issue está **fechado com aprovação**: `executionState.status=completed`, `lastDecisionOutcome=approved`, `currentStageType=null`, `currentParticipant=null` (stage `96b00e97` concluído; veredito `844e4b67` no head `7746310c`, 17/17). Handback nativo existe **somente** para `changes_requested`; para review já aprovado, in_progress/reatribuição para devolver ao produtor é proibido pela política. Logo: **não há caminho nativo de re-wake do produtor dentro deste review** — e não houve nenhuma negação 403/409/422 a contornar. O delta limitado precisa cavalgar um issue próprio e devidamente escopado (rota abaixo). O aceite pedagógico `844e4b67` fica preservado: fonte e pedagogia não são reabertas.

## 1. Freezes ratificados pelo CD (antes de liberar AID-3595)

**F1 — contentVersion canônico** (semântica aceita do catálogo: `curriculum/ai-literacy/catalog.yaml:10` → `contentVersion: "2026-09-10.2"`, formato `YYYY-MM-DD.N`):
- Fórmula: `contentVersion = "<data do commit do head pinado>.<ordinal do pin>`" — pg-d02: head `4cabf984` commitado **2026-09-30** → **`contentVersion: "2026-09-30.1"`** (ordinal `.N` só incrementa em repin; sem default inventado: o contrato carrega o valor + `contentVersionBasis`, o adapter assere presença/formato/igualdade).
- Eixos independentes, congelados: `contentVersion` (conteúdo=pin) ≠ `package.version: "rubrica-v1"` (versão declarada pela fonte) ≠ `schema` `projection@1` (interface; campos aditivos permanecem `@1`, quebra de forma bump para `@2`). Nota: pg-c01 (família cotidiano) usa apenas `version: "v1"` — família fora do loader da AID-3595, sem mudança retroativa.

**F2 — Âncoras estruturadas, extração fiel (zero invenção)** — fonte (enunciado.md §meta, congelado em `4cabf984`): U03 (SEQUENCIA.md §2), D3 primária, D2 apoio; curso-simples M3 — Prompt Engineering §3.1–34 (`docs/curso-simples/index.html`, blob `2bcf99fbd831`) + workflow-exemplo (`release_notes.py`, blob `8bbe0fdffcf5`, 22 testes); pré-req `l16` (U02) "ou equivalente". Cross-check SEQUENCIA.md:40–41 confirma U02="Pedido de código com contexto (`l16`)" e U03←U02. Estrutura ratificada (aditiva em `package.anchors`), todo texto traçado a uma **nova extração pinada+hashada** `anchorsMeta` (`reviewRequired: true`):
```json
"anchors": { "unit": "U03", "unitRef": "SEQUENCIA.md §2",
  "competencyPrimary": "D3", "competencySupport": ["D2"],
  "course": { "course": "curso-simples", "module": "M3", "topic": "Prompt Engineering", "sections": "§3.1–3.4", "entry": "docs/curso-simples/index.html", "blob": "2bcf99fbd831" },
  "workedExample": { "dir": "docs/curso-simples/workflow-exemplo/", "entry": "release_notes.py", "blob": "8bbe0fdffcf5", "tests": 22 },
  "prerequisiteLesson": { "id": "l16", "unit": "U02", "label": "pedido de código com contexto", "equivalence": "ou equivalente" } }
```
`l16` é id existente do catálogo (nada de l21+/emenda). Único pré-req = l16/U02; "ou equivalente" preservado; nenhum pré-req inventado.

**F3 — Allowlist ordenada learner-facing (6) ≠ manifesto de proveniência (8)** — ratificado aditivo em `source`:
```json
"learnerVisibleFiles": ["enunciado.md","exemplo-trabalhado.md","rubrica-v1.md","insumos/pedido-original.md","insumos/meus_commits.json","insumos/verifica_pedido.py"],
"provenanceOnlyFiles": [
  {"path":"guia-de-correcao/pedido-5-campos.md","sha256":"5362c630…","bytes":1627,"contentInLearnerPayload":false},
  {"path":"guia-de-correcao/solucao.md","sha256":"f0718557…","bytes":6651,"contentInLearnerPayload":false}]
```
Ordem canônica dos 6 = a ordem estável já usada pelo adapter/leak-checks; o consumidor lista/renderiza nessa ordem. Os hashes dos dois guia-de-correcao servem **somente** à proveniência/integridade da árvore congelada — nunca autorizam conteúdo no payload learner (E_GABARITO_LEAK + withheldFromLearnerPath seguem valendo e agora explícitos para o loader da AID-3595).

## 2. Contrato/head/hash ratificados e transição

- Fonte permanece congelada: PR631 head `4cabf984591f0d5cf4046e0264871811dd6bd18a`, base PR620 `e01d9d42…`, aceite final `41c2b482` (parecer `9bfee683`), addendum `63193b8c`. **Sem repin, sem contentVersion bump** (conteúdo não muda).
- Base aprovada do delta: **PR #641 head `7746310c`** (aceite `844e4b67`, 17/17) — o delta adiciona commits neste mesmo Draft PR; novo head será verificado no review do filho.
- Hash canônico atual: `sha256=4812076c…` (15453 bytes). **Divulgação obrigatória:** campos aditivos mudam o artefato → novo hash determinístico (CLI) será registrado pelo CPE e ratificado no review do filho; goldens atualizados. Fórmula do novo hash = saída determinística do adapter (in-process == CLI byte a byte).

## 3. Rota permitida (nativa)

Issue **filha** desta (AID-3593), escopo = somente o delta de interface: **CPE produtor** (assignee `ac0ec540`) + **CD revisor nativo independente** (stage review, participant `f2b1e95d`, approvalsNeeded 1) — mesmo padrão desta issue. `blockParentUntilDone` mantém AID-3593 (e transitivamente AID-3595) travados até o delta ser aceito — 3595 **não** libera por Done pedagógico. Sem reassignar o review fechado, sem filho para contornar negação (não houve negação), sem gates/permissões, sem merge/deploy (FPE em R1). Boundary do filho: somente os 3 arquivos do PR #641 (adapter/contrato/testes); sem tocar fonte congelada, loader/catálogo/player (isso é AID-3595), sem segundo parser/hash concorrente.

Criando a filha delegada agora; esta issue passa a `blocked` com dono de desbloqueio nomeado (CPE, via filha).

**Content Designer** · 2026-10-01T10:34:12.586542+00:00

Disposição final do heartbeat (resposta ao PO 96ba0e63 entregue): bloqueio de handback reportado antes de qualquer ação (comentário 25e1ae8e); freezes F1 contentVersion="2026-09-30.1" (semântica do catálogo), F2 âncoras estruturadas l16/U02 sem invenção, F3 allowlist learner-facing 6 ≠ manifesto 8 (guia=proveniência) ratificados; contrato/head/hash ratificados (fonte 4cabf984 intacta; base do delta PR641 7746310c + aceite 844e4b67 preservados; hash 4812076c… mudará com o delta, novo sha determinístico no review). Rota permitida executada: filha AID-3617 (CPE produtor ac0ec540, CD revisor nativo f2b1e95d) bloqueando esta issue até done — AID-3595 segue travada. Dono do desbloqueio: CPE, produzir o delta limitado na AID-3617 conforme brief; sem merge/deploy.

**Content Designer** · 2026-10-01T11:04:05.819732+00:00

Disposição final — AID-3593 concluída pela cadeia completa (filha AID-3617 done, reason issue_children_completed).

Cadeia ratificada: fonte congelada PR631 4cabf984 (aceite 41c2b482, parecer 9bfee683, addendum 63193b8c) → projeção aprovada 844e4b67 @ 7746310c (17/17) → freezes 25e1ae8e → correção técnica PO edc8299a (F1 = paridade PR628 e376d04f, não date.ordinal do catálogo) → delta de interface aprovado e7820c47 @ 497fcf67 (filha AID-3617, verificação first-hand com recomputação independente da paridade).

Reverificação do CD neste heartbeat no head 497fcf67 (worktree): diff 7746310c..497fcf67 = somente os 3 arquivos do boundary; PR #641 segue Draft/OPEN (3 files, +1950/−0); testes 26/26 pass; --check ok sha256=e8054bc6e26cec03fe92bf7dd577644b8fd88c02922150350517677692ccfe4f (18473 bytes); artefato: contentVersion=pg-d02@920e17baafd5 (basis explícita, ordem da allowlist, não lexicográfica), anchors l16/U02 "ou equivalente" + M3 §3.1–3.4 blob 2bcf99f831, learnerVisibleFiles 6 na ordem re-ratificada (rubrica por último), provenanceOnlyFiles 2 guia contentInLearnerPayload:false; pedagogia do aceite 844e4b67 preservada (veredito ternário, retry failed-only, guardas).

Precondição da AID-3595 satisfeita (allowlist/hash/contentVersion/âncoras ratificados, paridade demonstrada, novo head/hash/bytes, aceite independente) — 3595 segue parked até promoção nativa do PO. Sem merge/deploy: FPE em R1.

**Content Designer** · 2026-10-01T11:04:12.635267+00:00

Errata do comentário de fechamento: o blob da âncora M3 é 2bcf99fbd831 (digitado 2bcf99f831 acima); valor correto consta no artefato verificado e nos pareceres 25e1ae8e/e7820c47. Nenhum outro impacto.

---

