# AID-3510: Montar sequência Dev guiada

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Content Designer | **Created:** 2026-09-30T20:51:34.886126+00:00 | **Updated:** 2026-11-01T14:14:39.033+00:00
- **ID:** `281d6504-33a8-418a-8a18-3478ad63f4c5`

## Description

Próxima entrega útil da escola: produzir sequência didática executável para IA para Dev após fundamentos, com reuso prioritário dos nove YAMLs Dev, docs/curso-simples M1–M9, workflow\_lab e dev-workflow-claude. Não refazer inventário3456, matriz3497/metadados3505 ou tarefas inéditas3506. Definir ordem por objetivo/pré-requisito, exemplos trabalhados, tentativa, feedback, retry e takeaway; separar conteúdo pronto, adaptação necessária e lacuna real. Selecionar uma primeira unidade pequena de workflow de IA que use fixture local seguro e possa virar fatia no app existente; apontar arquivos/IDs reais e critérios de aceite, sem inventar rota já disponível.



Entregar documento versionado e conteúdo da primeira prática guiada em draft PR/branch isolada, com fontes e SHA, rubrica e solução separada. Content Designer revisa nível, dependências e fidelidade pedagógica. Não alterar os PRs610–619 congelados, novo engine, runtime/progresso, piloto1222/641/909, merge ou deploy. Não alegar transferência comprovada nem resultados de alunos. Antes de editar deduplicar; se existir equivalente, completar só a lacuna. Ao terminar registrar um próximo trabalho específico pronto e seu dono, ou dependência concreta; não criar tarefa genérica para consumo de cota. Conteúdo textual não precisa de imagem artificial; qualquer visual entregue deve ter captura real/proveniência.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3510 — Montar sequência Dev guiada
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 279880a0-cd05-453d-9b10-492a86f94ce9
- Agent: Content Designer (opencode_local)

## Objective

Próxima entrega útil da escola: produzir sequência didática executável para IA para Dev após fundamentos, com reuso prioritário dos nove YAMLs Dev, docs/curso-simples M1–M9, workflow\_lab e dev-workflow-claude. Não refazer inventário3456, matriz3497/metadados3505 ou tarefas inéditas3506. Definir ordem por objetivo/pré-requisito, exemplos trabalhados, tentativa, feedback, retry e takeaway; separar conteúdo pronto, adaptação necessária e lacuna real. Selecionar uma primeira unidade pequena de workflow de IA que use fixture local seguro e possa virar fatia no app existente; apontar arquivos/IDs reais e critérios de aceite, sem inventar rota já disponível.



Entregar documento versionado e conteúdo da primeira prática guiada em draft PR/branch isolada, com fontes e SHA, rubrica e solução separada. Content Designer revisa nível, dependências e fidelidade pedagógica. Não alterar os PRs610–619 congelados, novo engine, runtime/progresso, piloto1222/641/909, merge ou deploy. Não alegar transferência comprovada nem resultados de alunos. Antes de editar deduplicar; se existir equivalente, completar só a lacuna. Ao terminar registrar um próximo trabalho específico pronto e
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `279880a0-cd05-453d-9b10-492a86f94ce9` finished with status `succeeded` at 2026-09-30T23:38:32.279Z.
- Waking on the PO's reopen comment `ee335f70`. It changes my next action in three concrete ways: (1) register a genuine countersign of my already-made review (approval `38345871`) with real run/session ids — not a new content approval; (2) route the PR #620 Provenance fix (`session=a-acrescentar`) to CCE via the existing flow; (3) select one U03/U07/U09/U10 adaptation and route a concrete activity package spec to CCE as a single successor issue with CD reviewer. Starting with the red countersign gate.

The gate needs a PR comment citation `Countersign: AID-<n> <verdict> <ref> head=<40hex>` + canonical Provenance trailer, from an agent distinct from the producer. First: get my review run's real session id.

Run records don't carry session ids. Checking how previously accepted countersign comments formatted the trailer (precedent on PR #616/#619).

Precedent format captured. Checking my review run's executionWorkspaceId (the real session) and the exact citation grammar.

Grammar and real ids confirmed (review run `c02aa6db`, session/workspace `48fce77b`). Re-verifying head stability and PR body provenance, then running the gate for a red baseline.

Key finding: the
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `279880a0-cd05-453d-9b10-492a86f94ce9` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**Curriculum Content Engineer** · 2026-09-30T21:02:23.434811+00:00

# AID-3510 — Entrega r1: sequência Dev guiada (documento versionado) + primeira prática guiada pg-d01 · draft PR #620 @ `e01d9d42`

**Disposição: `in_review`** — reviewer nomeado: **Content Designer** (agente `f2b1e95d`), escopo pedido pela própria issue: nível, dependências e fidelidade pedagógica. Draft PR #620 (base `main` @ `d9dbdd5c`, head `e01d9d42`, 12 arquivos, +700/−0, draft). Merge/deploy fora do escopo; countersign distinto pela porta canônica se um dia sair de draft.

## O que foi entregue (verificável)

1. **Documento versionado** `curriculum/sequencia-dev-guiada/SEQUENCIA.md` (r1):
   - ordem U01–U12 por objetivo/pré-requisito, respeitando os pré-reqs declarados dos YAMLs (l16←l15, l21/l22←l16, l27/l28←l21, l29←l22) e a progressão D1→D7 do glossário ratificado (AID-3453 spec R1/R2);
   - classificação **pronto (7)** / **adaptação necessária (4: U03/U07/U09/U10 — reengenharia de formato, dono CCE)** / **lacuna real (2: U13 evals D5, U14 capstone D7)**;
   - fontes com blob SHA na base: 9 YAMLs Dev (`a839a433…`–`006ca4e6…`), catalog (`eafcbc19`), curso-simples M1–M9 (`2bcf99f`/`5dc6f72`), workflow-exemplo (`8bbe0fd`), workflow_lab SPEC/README (`82c2b93`/`f6d878f`), wf 02-corrigir-bug (`bdfab8f`), mission-bindings (`bf1d587`), CTA Trilha Dev (`3b794e81`);
   - **primeira unidade selecionada (pg-d01/U06)** com critérios de aceite AC1–AC7 verificados nesta árvore e ponto de integração real (trilha `dev` do OS via mission-bindings; sem rota inventada — CTA existente citado arquivo:linha).
2. **Primeira prática guiada** `pg-d01-debug-reproduza/` (âncora l27, P:D4 da matriz r3): ciclo exemplo trabalhado → tentativa → feedback → retry → takeaway; exemplo trabalhado real citado (wf `02-corrigir-bug`, blob `bdfab8f`); **fixture local segura e determinística** (`notas.py`, Python puro, zero rede/conta/segredo) com bug latente de fronteira (`>` vs `>=`, problema de natureza distinta do exemplo ensinado); rubrica v1 com 6 critérios objetivos e perCheck executável por critério; **solução separada** em `guia-de-correcao/` com teste de regressão vermelho-pelo-motivo-certo e todas as saídas reais executadas (registro em `guia-de-correcao/solucao.md`, passos 1–6).

**Comandos de verificação** (rodados agora, exit codes conferidos): reprodução do bug (3× `REPROVADO`), suíte 5/5 verde com bug presente, regressão vermelha (`AssertionError … obtido 'REPROVADO'`, exit 1), regressão+suíte verdes contra a solução (5+2), cenário do report corrigido (3× `APROVADO`), diff de 1 caractere na causa raiz.

## Deduplicação (exigida pela issue)

Não refaz: inventário/matriz AID-3456, competências l01–l32 r3 AID-3497 (doc `matriz-competencias-32` rev `1fee56a2`), metadados P/S AID-3505, tarefas inéditas AID-3506 (tp-d01 é consumida como U12, não duplicada — pg-d01 ensina o ciclo guiado de debug; tp-d01 avalia transferência em sugestão de implementação). Nenhuma decisão ratificada reaberta.

## Anti-escopo respeitado

PRs #610–#619 intocados (branch nova sobre `main`); nenhum engine novo; runtime/progresso/`learner/` intocados; pilotos AID-1222/641/909 intocados; sem merge/deploy; sem alegação de transferência comprovada ou resultado de alunos; nenhum visual artificial (conteúdo textual).

## Próximo trabalho específico (registrado, com dono)

- **P1 — Fatia de app:** missão pg-d01 no OS (binding + atividade consumindo `curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/`), dono **Learning Engine Engineer** (`98ed5775`, CODEOWNERS `/engines/`), bloqueada por: revisão CD desta entrega + merge do PR #620. Criada como issue filha AID-3511 com blockers explícitos.
- P2 (adaptação U03/U07/U09/U10) é minha, fila via CEO; P3 (lacuna U13 evals) e P4 (capstone U14) dependem de decisão de escopo da CEO — registradas no SEQUENCIA.md §6, sem issue genérica para consumir cota.

## Provenance

agent=curriculum-content-engineer(`93e26ea9-8f2a-4f6f-9b82-3591ebc4255c`) task=AID-3510 run=`161699f4-bd87-4b50-b4d5-15fb48be900f` session=a-acrescentar — `sessionIdAfter` do run é publicado ao fechar o run; atualização do body do PR #620 fica registrada como pendência de evidência aqui (mesmo fluxo aceito no ciclo do PR #619/AID-3506, resolvido na rodada seguinte).

**Content Designer** · 2026-09-30T21:12:07.327299+00:00

**DECISÃO: `approved` — entrega r1 da AID-3510 (SEQUENCIA.md r1 + prática guiada pg-d01, draft PR #620 @ `e01d9d42`, base `main` `d9dbdd5c504ef76`, 12 arquivos +700/−0) aprovada na revisão do Content Designer, no escopo pedido pela issue: nível, dependências e fidelidade pedagógica.** Verificação first-hand completa abaixo; 3 erratas documentais não bloqueantes registradas (nenhuma toca o entregável versionado).

## 1. Verificação first-hand (tudo @ head `e01d9d42`, base `d9dbdd5c504ef76`)

1. **PR #620 conferido via API**: draft, base `main` @ `d9dbdd5c`, head `e01d9d42`, 12 arquivos, +700/−0; diff contra a base = exatamente `curriculum/sequencia-dev-guiada/` — nenhum engine, nenhum runtime/`learner/`, PRs #610–#619 intocados. Anti-escopo ✔ (nota: meu `main` local estava defasado em `1975e2c7`; o diff correto é contra `origin/main` = base declarada).
2. **Dependências**: os 9 YAMLs Dev relidos @ base — l16←l15; l21/l22/l17←l16; l27/l28←l21; l29←l22; l23←l15 — **todos** satisfeitos pela ordem U01–U12; classificação da tabela confere com a contagem declarada (pronto 7: U01/U02/U04/U05/U06/U08/U11; adaptação 4: U03/U07/U09/U10; lacuna 2: U13/U14 — lacunas corretamente **não** produzidas). Enunciado pg-d01 declara pré-reqs l16+l21, consistente com a cadeia do YAML l27. A reordenação D1→D3→D4→D2→D5→D6 (U09–U10 após D4) é transparente e legítima: o glossário define famílias, não ordem temporal; a sequência é dirigida pelos pré-reqs declarados e pela trilha bound.
3. **Fontes/rastreabilidade**: os 10 blobs citados conferem byte-a-byte @ base (catalog `eafcbc196b35`, l27 `6c9cc6b015d2`, wf 02 `bdfab8fb6160`, mission-bindings `bf1d58756dc4`, OnboardingScreen `3b794e816bc5`, workflow_lab SPEC/README, workflow-exemplo, curso-simples index/ROADMAP). mission-bindings: 16 bindings dev = 9 lições + 7 jogos, exatamente como §3 afirma. CTA "Trilha Dev → Abrir no OS" confirmado em `OnboardingScreen.tsx:170–183` — rota real, nenhuma inventada.
4. **Loop pg-d01 re-executado por mim** (árvore extraída do head, sem rede): reprodução 3× `REPROVADO` (exit 0); suíte 5/5 verde com o bug presente; regressão vermelha **pelo motivo certo** (`AssertionError: situacao(6.0) deveria ser APROVADO, obtido 'REPROVADO'`, exit 1); suíte+regressão 5+2 verdes contra a solução; cenário do report 3× `APROVADO`; diff de 1 caractere na causa raiz (`>` → `>=`); scan sem rede/segredo/token. Todas as saídas documentadas em `guia-de-correcao/solucao.md` reproduzem exatamente. AC1–AC7 ✔.
5. **Fidelidade pedagógica**: o objetivo do enunciado espelha o objetivo do YAML l27 (reprodução determinística → caso mínimo → esperado-vs-observado → correção → testes incluindo o caso mínimo); exemplo trabalhado fiel à fonte real (`RESULTADO.md` do wf 02: diff da regex, nomes/contagens de teste `4→6, pass 4 fail 2`, saídas citadas conferem); problema da tentativa é de **natureza distinta** (fronteira de comparação vs regex) = transferência, não cópia; mapeamento P:D4/S:D3 bate com a linha l27 [D] da matriz r3 (`matriz-competencias-32`); ciclo completo exemplo→tentativa→feedback→retry→takeaway com retry **por critério**; rúbrica v1 objetiva (6 critérios, perChecks executáveis, met/partial/not_met, sem nota agregada — mesma forma das tp-c01/tp-d01); solução separada e não referenciada pelo enunciado; nenhum id de lição criado (regra 7 do contrato respeitada — pg-d01 é prática, não lição de catálogo); nenhuma alegação de eficácia/transferência comprovada (disclaimers explícitos em enunciado §Limites e SEQUENCIA §5).
6. **Dedup real**: tp-d01 (PR #619) relida — papel de revisor julgando sugestão de IA contra spec (evidência T3, fixture tarifa) ≠ pg-d01 aprendiz executando o ciclo guiado de debug. Distinção declarada procede.

## 2. Erratas não bloqueantes (dobra do CCE na próxima rodada; nenhuma exige retrabalho do entregável)

1. **Ponte errado no comentário de entrega**: diz "Criada como issue filha **AID-3511**" — o id correto é **AID-3527** ("Fatia de app: missão pg-d01 no OS — AID-3510 P1", assignee `98ed5775`, in_progress, blockers explícitos: revisão CD desta entrega + merge do PR #620; vinculada a AID-3510 por relatedWork, embora parentId=None). **AID-3511 é issue alheia** ("Documentar componentes visuais compartilhados", outro dono) — quem seguir o comentário cai na issue errada. O entregável versionado (SEQUENCIA.md §6, body do PR) **não** contém id errado. Correção: comentário de errata do produtor nesta thread apontando AID-3527.
2. **Trailer de provenância do body do PR #620** pendente (`sessionIdAfter`) — pendência já declarada pelo produtor, mesmo fluxo aceito no ciclo PR #619/AID-3506; resolver na próxima rodada.
3. **Cosmético**: id de critério `c-suicao-revisao` na rubrica v1 (intente "suíte+revisão"); v1 congelada pela própria regra de versionamento — dobrar na v2, se algum dia revisada.

## 3. Desdobramento

Com esta aprovação, o blocker "revisão CD" de **AID-3527** fica resolvido; resta o merge do PR #620 pela porta canônica ( countersign distinto, fora desta revisão — aprovar não autoriza merge). P2 (fatiar U03/U07/U09/U10) segue fila CCE via CEO, dependente desta aprovação — agora destravado.

*Revisor: Content Designer (agente `f2b1e95d`), estágio review `814dfd25`, participante atual designado; lastDecisionOutcome anterior: none; head exato revisado: `e01d9d42b99434c10d8f155cde0cbbc57b25cf61` (PR #620) sobre base `d9dbdd5c504ef76a42d3f7944392dccee3eb6351`.*

**Content Designer** · 2026-09-30T21:12:15.164845+00:00

Approved — parecer formal completo do Content Designer no comentário 38345871: entrega r1 (SEQUENCIA.md + pg-d01, draft PR #620 @ e01d9d42, base d9dbdd5c) verificada first-hand — 9 pré-reqs dos YAMLs satisfeitos pela ordem U01–U12; 10 blobs citados conferidos byte-a-byte; 16 bindings dev (9 lições + 7 jogos) confirmados; CTA real OnboardingScreen.tsx:170–183; loop pg-d01 re-executado (3x REPROVADO, suíte 5/5 verde com bug, regressão vermelha pelo motivo certo, 5+2 verdes na solução, 3x APROVADO, diff 1 caractere na causa raiz, sem rede/segredo); fidelidade l27 P:D4/S:D3 conforme matriz r3; dedup vs tp-d01 procede; ciclo guiado e rúbrica v1 no padrão tp-*. 3 erratas documentais não bloqueantes (ponto errado AID-3511→AID-3527 no comentário de entrega; trailer de provenância do body do PR pendente; id cosmético c-suicao-revisao) — nenhuma toca o entregável versionado. Blocker 'revisão CD' da AID-3527 resolvido; merge do PR #620 segue porta canônica própria (aprovar não autoriza merge).

**founder** · 2026-09-30T23:30:32.094747+00:00

PO: preservar o aceite38345871 e o pacote pg-d01, sem repetir execução/revisão já concluída. O PR620 @ e01d9d42 ainda tem countersign-gate110096340851 vermelho e Provenance com session\=a-acrescentar. CD deve registrar countersign genuíno do review exato já feito, com run/session reais; encaminhar a correção de Provenance ao CCE pelo fluxo existente, sem inventar identificadores. Não é nova aprovação de conteúdo nem autorização de merge. Próxima entrega útil priorizada: selecionar UMA adaptação pronta entre U03/U07/U09/U10 e encaminhar ao CCE um pacote de atividade real no padrão exemplo→tentativa→feedback→retry→takeaway, baseado em material já curado; excluir l33–l35/data gate e evitar duplicar pg-d01 ou tp-d01. Deduplicar primeiro, usar único successor concreto com CD reviewer, fixture segura executável e critérios negativos, sem nova engine/runtime. Registrar qual atividade e objetivo observável escolhidos; o PO pode decidir prioridade rotineira sem pedir fundador.3527 já está trabalhando o app pg-d01, não duplicar essa integração.

**Content Designer** · 2026-09-30T23:37:40.693347+00:00

# AID-3510 — Diretiva PO `ee335f70` executada (countersign genuíno + roteamentos) — fechamento

O aceite `38345871` e o pacote pg-d01 permanecem preservados; nada foi re-executado nem re-aprovado. Nenhuma autorização de merge emitida.

## 1. Countersign genuíno registrado (review exato já feito, run/session reais)

- **Comentário GitHub no PR #620:** id `5921625513` (23:35:07Z), citation canônica:
  `Countersign: AID-3510 verdict approved head=e01d9d42b99434c10d8f155cde0cbbc57b25cf61`
  `Provenance: agent=content-designer task=AID-3510 run=c02aa6db-f47e-4e00-a735-140fca48f043 session=ses_f0bdea627ffe2H6I8GxMvpfCRy`
- **Ids reais verificados first-hand:** run `c02aa6db` = o run da revisão (finished 21:12:24Z); session `ses_f0bdea627ffe…` = a sessão opencode dessa revisão (título "AID-3510 guided Dev sequence review", 21:03:41Z, 34 partes citando o head/`38345871`). Escopo declarado no próprio comentário: só a revisão já registrada; não é nova aprovação nem autoriza merge.

## 2. Causa raiz do gate vermelho + validação seca (gatilho para o roteamento)

- Gate ao vivo ANTES do meu comentário: `producer unattributed` — o trailer de Provenance do **body** do PR #620 não parseia (`agent=slug(uuid)` e `session=a-acrescentar` com prosa).
- Após meu comentário, sem a correção do body: `countersign agent IS the producer agent` (meu trailer virava o mais antigo parseável) — confirmação mecânica de que a pendência é do lado do produtor.
- **Dry-run hermético com o body corrigido para a linha canônica** (`agent=curriculum-content-engineer task=AID-3510 run=161699f4-… session=ses_f0be9a0c7ffeaZQUwY0FufoRLV`) + meu countersign: **PASS** ("producer 'curriculum-content-engineer' != countersign 'content-designer', head e01d9d42 pinned"). A linha-alvo exata e a evidência do session id estão na issue roteada.

## 3. Roteamentos criados (donos nomeados)

| Issue | Dono | Ação |
| --- | --- | --- |
| **AID-3552** | CCE (`93e26ea9`) | Corrigir trailer Provenance do body do PR #620 para a linha canônica (validada em dry-run); sem push (head `e01d9d42` pinado); rodar o gate e registrar receipt |
| **AID-3553** | CCE produz · **CD revisa** (política de review criada) | Successor único priorizado: **U03 selecionado** — prática guiada pg-d02 "pedido estruturado de 5 campos" (curso-simples M3 + workflow-exemplo), com objetivo observável registrado (5 campos com ACEITE verificável por comando, NÃO-META excluindo escopo adjacente, bordas julgáveis por revisor), fixture local determinística, rúbrica v1 com perChecks executáveis, critérios negativos, sem ids de lição/engine/runtime, sem duplicar pg-d01/tp-d01/AID-3527 |

Seleção U03 registrada (por que não U07/U09/U10): menor adaptação contida sobre material já curado + maior alavancagem (os 5 campos são a dobradiça consumida por U09 e pelo formato spec da tp-d01) + pré-req simples (U02/l16). Dedup verificado: nenhuma issue aberta cobria U03/pg-d02.

## 4. Estado final

- Aprove `38345871` intacto; PR #620 draft, head `e01d9d42` inalterado desde a revisão.
- Gate do PR #620: vermelho **apenas** pela pendência do produtor — dono/ação: **AID-3552 / CCE** (linha canônica + re-rodar gate). Nenhum identificador inventado em nenhuma das pontas.
- AID-3527 (app slice, LEE) intocada e não duplicada.


Provenance: agent=content-designer task=AID-3510 run=279880a0-cd05-453d-9b10-492a86f94ce9 session=ses_f0b559c5cffeZKTcdUajc6GQym

**Content Designer** · 2026-09-30T23:38:22.58543+00:00

Done — diretiva PO ee335f70 executada e receipt completo no comentário 65b1ed8a: (1) countersign genuíno do review exato já feito postado no PR #620 (comentário GitHub 5921625513, citation head=e01d9d42…, Provenance com run c02aa6db e session ses_f0bdea627 reais e verificados); (2) causa raiz do gate vermelho isolada no lado do produtor (trailer do body não canônico) e correção roteada ao CCE na AID-3552 com linha-alvo validada em dry-run hermético (PASS); (3) successor único priorizado criado: AID-3553 — U03/pg-d02 'pedido estruturado de 5 campos', CCE produz, CD revisa (política de review criada), objetivo observável registrado, dedup feita, sem ids de lição/engine/runtime, sem duplicar pg-d01/tp-d01/AID-3527. Aprove 38345871 preservado; nada re-executado; nenhuma autorização de merge. Pendência externa nomeada: gate do PR #620 verde depende de AID-3552 (CCE).

---

