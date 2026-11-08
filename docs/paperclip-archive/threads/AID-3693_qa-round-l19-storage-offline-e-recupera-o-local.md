# AID-3693: QA-ROUND L19 — Storage: offline e recuperação local

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Learner App & Accessibility Engineer | **Created:** 2026-10-01T21:12:21.192032+00:00 | **Updated:** 2026-11-01T14:14:06.205+00:00
- **ID:** `d377fe40-7eef-4022-a5fb-0eac9de13797`

## Description

Campanha QA-ROUND autorizada explicitamente por Dani: testar a aplicação com as24especialidades, merge somente se tudoOK. Preparar casos distintos AGORA e observação segura do baseline publicado616 quando útil; preparação não é testeexecutado. Execução final e aceite devem usar o MESMO manifest congelado de C0 AID3670 (pins/base/árvore), validado por QA3672 e V\&E3673. Não inventar RC nem usar sua branch de autoria. Coordenar browser pesado em fila, fixtures/contextos isolados, sem sobrecarregarhost. Reusar prova jáaceita somente com identidade/aplicabilidade verificada; sehead muda, revalidar oafetado.



Fronteiras: sem contas reais/pagamentos/outreach/termos/dadosdestrutivos/ataques a serviços/carga; nenhum restart/runtime3630/R2/setup/credenciais/permissões/modelos/instalações. Sem mudanças deproduto ou merge nesta lente; registrar defeitos reproduzíveis para correção autorizada, severidade e NOTRUN. Sem PRcomments/assinaturas porproxy. Produtoautorado não pode receber autoaprovação: revisor configurado valida seu parecer. ManifestRC/CIexatos prevalecem, testeisoladoverde não prova integração.



Gates: autorias643/646 aceitas mas incompatibilidade comloader642 ainda requer repro/fix; fora do primeirobatchruntime inalteradas. Kits3665–3669/PR649–650 eplayer3660fora até decisãoPO. Merge somente scripts/merge\_pr.sh após dependências/reviews/12checks incluindocounter, independenteQA/V\&E; preflightPRE3674antespushremoto/mainmerge porqueNetlifyautopublish não estáesclarecido. Ausência dejobYAML não éprova deausência depublish. Esta lente NÃO autoriza publicação oumerge.



Entregar em sua própria tarefa: matriz cenário/esperado/observado, head/pins, dadossintéticos, comandos reais, logs/DOM/AX/pixels conforme suaespecialidade, run/session real, findings/limites. Declaremulação versusdispositivo/leitorfísico. Anexar e conferirreadbackanteshandoff se necessário; primeira negativa encerra ação semrota/atoralternativo. Não alterar stub3670 queSMtevePATCHnegado; use o manifestlegítimodoFPE.



L19: exercitar offline/cache/backup em fixtures e contextos LOCAIS isolados do RC: cache ausente/desatualizado, asset faltante, falha simulada de save, backup válido/inválido e recuperação sem corromper progresso. Nenhuma limpeza de dados reais, storage externo, serviço ou conta; não repetir auditoria de infraestrutura. Reusar provas aceitas de cache quando árvore idêntica, acrescentar apenas integração e falhas pertinentes.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3693 — QA-ROUND L19 — Storage: offline e recuperação local
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: a8d63761-4b0b-4f6a-9f37-5215557b3e85
- Agent: Learner App & Accessibility Engineer (opencode_local)

## Objective

Campanha QA-ROUND autorizada explicitamente por Dani: testar a aplicação com as24especialidades, merge somente se tudoOK. Preparar casos distintos AGORA e observação segura do baseline publicado616 quando útil; preparação não é testeexecutado. Execução final e aceite devem usar o MESMO manifest congelado de C0 AID3670 (pins/base/árvore), validado por QA3672 e V\&E3673. Não inventar RC nem usar sua branch de autoria. Coordenar browser pesado em fila, fixtures/contextos isolados, sem sobrecarregarhost. Reusar prova jáaceita somente com identidade/aplicabilidade verificada; sehead muda, revalidar oafetado.



Fronteiras: sem contas reais/pagamentos/outreach/termos/dadosdestrutivos/ataques a serviços/carga; nenhum restart/runtime3630/R2/setup/credenciais/permissões/modelos/instalações. Sem mudanças deproduto ou merge nesta lente; registrar defeitos reproduzíveis para correção autorizada, severidade e NOTRUN. Sem PRcomments/assinaturas porproxy. Produtoautorado não pode receber autoaprovação: revisor configurado valida seu parecer. ManifestRC/CIexatos prevalecem, testeisoladoverde não prova integração.



Gates: autorias643/646 aceitas mas incompatibilidade comloader
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `a8d63761-4b0b-4f6a-9f37-5215557b3e85` finished with status `succeeded` at 2026-10-02T00:30:34.195Z.
- I'm waking as reviewer for AID-3693. The executor claims three documentary fixes were delivered and verified. I need to review these first-hand before deciding approve/request_changes. Let me explore the environment to find the API and artifacts.

I have full context now. My earlier review (edd1d7b2) requested 3 documentary fixes; the executor's receipt (c73b2699) claims all delivered and resubmitted. Before deciding, I must verify the 3 items first-hand. Let me check the evidence artifacts.

Item 1 verified: recomputed sha = `b0f229e7…76945` matches the errata. diff confirms dist2 = dist − `icon-192.png`. Now verifying the SHA256SUMS files against the surviving dist copies, and cross-checking run3/run4 logs:

Tail shows OK but I need all lines verified. Checking full OK counts and the run4 C6 result values:

All three checks so far pass. Confirming the run4 C6 cap details and the tampered fixture sha cited in the errata, then examining how review decisions are registered natively (the executor's resubmit files show the route):

All 3 items verified first-hand. Now I need the exact native route to register an approve decision. Checking how decisions were registe
[truncated]

## Files / Routes Touched

- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `a8d63761-4b0b-4f6a-9f37-5215557b3e85` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**Storage Engineer** · 2026-10-01T22:11:30.14345+00:00

**L19 — Storage: offline e recuperação local — matriz + repro local no RC do C0 (preparação + repro local; NÃO é a execução final da rodada)**

**Proveniência real:** agente Storage Engineer `92d055bc-e965-4f92-8ef6-06a775fa900e`, tarefa AID-3693 (`d377fe40-7eef-4022-a5fb-0eac9de13797`), run `363371b8-7820-456c-9a10-6fc9995487fe`; suíte executada `2026-10-01T22:09:20.639Z → 22:10:04.102Z` (sessionId não exposto nos metadados do ambiente do adaptador — run/task/agent são reais e verificáveis). **Head/pins:** RC `rc/qa-c0` @ `501251d4f0d2d5e7e89dd0ccdfdd499072bd2fe2` (dist FPE 21:31Z, árvore limpa), contentVersion observado `2026-09-30.1`. Execução final/aceite ficam pendentes do manifest C0 congelado (AID-3670; QA AID-3672 e V&E AID-3673 ainda `todo` na data) — cabeça muda ⇒ revalidar afetados.

**Matriz cenário/esperado/observado (8/8 PASS):**

| # | Cenário | Esperado | Observado |
|---|---------|----------|-----------|
| C1 | Cache ausente (contexto limpo) | boot semeia v4 sem crash | IDB v4, contentVersion 2026-09-30.1, xp 0, l02 locked, 0 pageerrors |
| C2 | Cache desatualizado v1 legado (fixture sintética: skill `aplicar` passes>0, contentVersion `0001-01-01.0`) | migração forward-only preserva `completed`; skill praticada fica com revisão devida | UI "35 XP · sequência atual de 3 dias (recorde: 5)", reviews-due visível, skill listar `aplicar`, 0 pageerrors |
| C3 | schemaVersion 99 desconhecido | descarta e recomeça (nunca migra parcial) | IDB re-semeado fresh v4 (l02 locked, xp 0), console warn "progresso anterior incompatível", 0 pageerrors |
| C4 | Backup válido round-trip | export lossless (==IDB); restore em contexto novo idêntico; sem `mastered` | lição l02 concluída pela UI (55 XP), download sha256 `8f6325f8…ba2278`, exportEqualsIdb ✓, restoredEqualsExport ✓, sem `mastered` |
| C5 | Backup inválido truncado (½ arquivo) | recusa + progresso local intacto | alert "Progresso local não migrável: JSON inválido"; IDB byte-idêntico antes/depois |
| C6 | Backup tampered `mastered` | teto producer: cap p/ `completed`, nunca persiste mastered | import aceito com cap; IDB l02=`completed`; `mastered` ausente do IDB |
| C7 | Falha simulada de save (`put`→QuotaExceededError) | sem corrupção; último estado bom preservado | rejection não tratada capturada; IDB intacto; recarga volta ao estado bom |
| C8a | Asset faltante (icon-192.png removido do dist) | observação | install do SW falha (`addAll` atômico) → SW nunca ativa → offline morto; online OK |
| C8b | Offline real + cache obsoleto v4 | shell offline; /escola/ por chave própria; cache velho removido | caches=[`literacydojo-v5`] apenas; raiz offline renderiza; /escola/ offline h1 "Uma escola. Duas jornadas." |

**Achados reproduzíveis (defeitos registrados p/ correção autorizada; sem mudança de produto/merge nesta lente):**
- **F1 (P3 — UX/silêncio):** falha de save não é surfaced ao aprendiz — `OnboardingScreen.handleNext` (engines/literacyDojo/src/screens/OnboardingScreen.tsx:102-115) aguarda `completeOnboarding` sem try/catch/finally: rejection não tratada + `submitting` trava `true`. Sem perda/corrupção (IDB atômico; C7 prova último-estado-bom intacto).
- **F2 (P3 — robustez offline por design):** 1 asset de caminho fixo faltante derruba o install inteiro do SW (`cache.addAll` atômico, engines/literacyDojo/public/sw.js:34) ⇒ shell offline indisponível (C8a). Fail-closed deliberado; trade-off registrado.

**Dados sintéticos (sha256):** backup válido `8f6325f8…ba2278` (exportado pela UI); truncado `fc7d580a…807b3`; tampered `77fb5757…96a95`; harness `bd391982…ba90`. **Evidência:** `/paperclip/aid3693-evidence/` (l19-results.json, log, 8 screenshots, fixtures, scripts `server.mjs`/`run_l19.mjs`).

**Comandos reais:** cópia read-only do dist do worktree FPE `/tmp/opencode/rc-c0` @ 501251d4 (árvore limpa); servidores estáticos stdlib 127.0.0.1:4193 (íntegro) e :4194 (sem icon-192.png); `node run_l19.mjs` — Playwright 1.62 library, Chromium headless, 1 browser, contextos isolados por caso, duração ~44s. **Reuso:** suítes aceitas NÃO reexecutadas (backup-restore/pwa/escola-entry specs); provas #647 @ 8ce2ea27 não reaproveitadas (árvore difere de 501251d4) — superfícies revalidadas do zero.

**Limites/NOTRUN:** emulação headless (não é dispositivo/leitor físico); baseline publicado 616 não tocado; sem multi-tab, storage externo/R2, contas, dados reais; bump manual de CACHE do sw.js (deploy) fora do escopo. Execução FINAL pendente do manifest congelado.

**Disposição:** entrega da lente pronta para revisão nativa (reviewer configurado: Learner App & Accessibility Engineer). Nenhum dado real limpo; nenhum merge/deploy/publicação.

**Learner App & Accessibility Engineer** · 2026-10-01T22:20:14.188457+00:00

**Changes requested** — decisão estruturada do estágio nativo de review da AID-3693 (revisor: Learner App & Accessibility Engineer `ca12fdb7-19ee-4d89-be95-fce692acfdd9`; retorno ao Storage Engineer `92d055bc-e965-4f92-8ef6-06a775fa900e` conforme `returnAssignee`). O trabalho técnico é sólido e os achados procedem, mas o PACOTE DE EVIDÊNCIA tem 2 âncoras de identidade incorretas/ausentes — exatamente o que esta rodada exige conferir por readback antes do handoff. Correções são em comentário/evidência (minutos), sem re-teste: a cópia sobrevivente `/tmp/opencode/aid3693/dist` basta.

## Verificado first-hand (revisor, reads-only; árvore main limpa ao inspecionar)
- **Pins:** `rc/qa-c0` = `501251d4f0d2d5e7e89dd0ccdfdd499072bd2fe2` (git rev-parse) ✓ = constante do harness e do comentário. `contentVersion` observado `2026-09-30.1` consistente nos 3 logs finais.
- **Fixtures:** `fixture-truncated.json` = prefixo byte-exato de `l19-backup.json` (911/1822) ✓; `fixture-mastered.json` = backup com ÚNICA mutação `l02→"mastered"` ✓; shas `fc7d580a…807b3` / `77fb5757…96a95` / harness `bd391982…ba90` conferem ✓.
- **C6 (cap, não recusa):** flip run3→run4 legítimo — contrato real em `engines/literacyDojo/src/domain/progressBackup.ts:16` (`if (status === "mastered") return "completed"`, teto produtor) + regra dura 2 do AGENTS.md (mastered proibido em estado). Expectativa do run4 = contrato do produto, não racionalização ✓.
- **F1 (P3):** confirmado em `src/screens/OnboardingScreen.tsx:102-118` — `setSubmitting(true)` + `await completeOnboarding` sem try/catch/finally ✓.
- **F2 (P3):** confirmado — `public/sw.js` `precacheShell` usa `cache.addAll` atômico dentro de `install.waitUntil` ✓.
- **Isolamento C8a:** `dist2` difere de `dist` SOMENTE por `icon-192.png` removido ✓ (diff -rq); builds distintos do dist stale de main (asset hashes diferentes) ✓.
- **Consistência interna:** resultados/log4/results.json timestamps coerentes (22:09:20→22:10:04; comentário 22:11:30; run end 22:12:23).

## Requisitos para o retorno (3, todos sem re-executar a suíte)
1. **Errata do sha do backup válido:** o handoff cita `8f6325f8…ba2278` (export do run3, supersedido) mas o artefato anexado `aid3693-evidence/l19-backup.json` = `b0f229e7454045ca6d637b39da914cfb258508edcfd36ebd640b4b96b9476945` (run4 — recomputado por mim). Postar errata fixando `b0f229e7…` e marcando `8f6325f8…` como run3 superseded. Sem isso, reuso futuro de prova por identidade (exigência da carta da rodada) aponta para um sha que não existe na evidência.
2. **Pinjar a identidade do artefato testado:** o worktree FPE `/tmp/opencode/rc-c0` foi removido pós-run e `node_modules` está vazio — rebuild de verificação é impossível neste ambiente (instalações vedadas), então a únicas âncoras do dist são o pin do ref + nome do asset (`index-CcNpudqZ.js`, só visível incidentalmente num console do C3). Postar `SHA256SUMS` completo de `/tmp/opencode/aid3693/dist` (e dist2, declarando "= dist − icon-192.png") em `aid3693-evidence/` e referenciá-lo na errata — é o que permite revalidar "se head muda" quando o manifest C0 congelar. Valores que computei: `index.html 4ad8c7e9…04fc`, `assets/index-CcNpudqZ.js 7cfcfef6…f56`, `assets/index-Cu16LE5G.css 250fcf64…ca8b`.
3. **Transparência da iteração do harness:** uma linha no thread declarando que o FAIL C5C6 do run3 ("JSON inválido") foi defeito do MÉTODO de tamper do harness (JSON malformado), supersedido pelo run4 com fixture válida; evita leitura como não-determinismo do produto nos logs anexados.

## Limites desta revisão (declarados)
- Sem input de imagem nesta sessão: screenshots NÃO inspecionados visualmente por mim; confio nas asserções DOM/texto do harness (seletores + textContent, não pixels).
- Proveniência do dist aceita por evidência circunstuntancial sobrevivente (ref pin + hashes de conteúdo distintos + contentVersion); verificação por rebuild ficará para o ambiente que congelar o manifest C0.

## Disposição
`request_changes` — retorno ao Storage Engineer `92d055bc`; após os 3 itens (errata + SHA256SUMS + nota de iteração), reanexo como revisor para o approve final. Achados F1/F2 já estão bem registrados (correção autorizada por issue própria; nada nesta lente). Nada de merge/deploy/publicação; execução FINAL permanece pendente do manifest C0 congelado (AID-3670/3672/3673), como o próprio handoff declara.

**founder** · 2026-10-02T00:19:23.707284+00:00

Coordenação da fila, 2026-10-02 00:17 UTC. Ao revisor atual, [@Learner App & Accessibility Engineer](agent://ca12fdb7-19ee-4d89-be95-fce692acfdd9?i=eye): o seu parecer edd1d7b2-03e9-476d-80d9-46ac9e5b9646 pediu mudanças documentais e declarou retorno ao Storage Engineer, mas a interface desta tarefa permanece In Review, atribuída a você, com Review pending. Não há correção posterior visível; seu agente está idle e a lista de runs não mostra execução equivalente ativa.

Reconcilie somente a sua decisão já emitida pelo mecanismo nativo autorizado desta mesma tarefa, conferindo primeiro se ela ou seu retorno já estão registrados. Se ainda pendente, conclua o retorno configurado ao autor Storage Engineer para os mesmos três itens: errata do SHA do backup run4, SHA256SUMS dos dist/dist2 sobreviventes e nota de que o JSON inválido de run3 era defeito do método de tamper, supersedido no run4. Preserve a autoria original: não reescreva nem assine o recibo do Storage; ele corrige a própria evidência e você mantém a revisão independente posterior.

Escopo documental, sem reexecutar suíte, rebuild, instalação/restauração de dependências ou alteração de produto. O recibo continua sendo preparação/repro RC1 501251d4, não aceite RC2 nem prova do main atual. O C0 RC2 congelado é o comentário 1a0985fd-3028-4f29-9b60-160ebe7160ae de AID-3670, e707103563bd97bde9cf1071e9c0191831982d6c; isso não converte prova antiga em prova nova. C2/C3 e o bloqueio real de recuperação de dependências permanecem. Sem merge, publicação, mudança de permissões/proteções/modelo/serviço, tarefa ou job novo.

Se houver trabalho equivalente ativo/na fila, não duplique. Se a ação nativa for negada, pare e reporte o alvo e a negativa; não use outro endpoint, documento, comentário ou identidade como contorno. Faça readback do estado e dos IDs reais do resultado nesta tarefa.

**Learner App & Accessibility Engineer** · 2026-10-02T00:20:31.478059+00:00

**Changes requested** — reconciliação nativa da decisão já emitida pelo revisor (parecer integral: comentário `edd1d7b2-03e9-476d-80d9-46ac9e5b9646`, 2026-10-01T22:20:14Z; o POST de comentário simples desta revisão não registrou a decision row — `lastDecisionId` seguia `null` verificado por GET — portanto re-registro pela rota PATCH-with-comment, conforme precedente AID-3563/AID-3549). Disposição aplicada nesta edição única: status → `in_progress` + devolução ao autor Storage Engineer `92d055bc-e965-4f92-8ef6-06a775fa900e` conforme `returnAssignee`. Escopo documental: sem reexecutar suíte, sem rebuild, sem instalação/restauração de dependências, sem alteração de produto; o recibo permanece preparação/repro do RC1 `501251d4`, não aceite do RC2 nem prova do main atual (C0 RC2 congelado = comentário `1a0985fd-3028-4f29-9b60-160ebe7160ae` de AID-3670, `e707103563bd97bde9cf1071e9c0191831982d6c`; prova antiga não se converte em prova nova).

Requisitos inalterados (mesmos 3 do parecer `edd1d7b2`, correção é do próprio Storage preservando autoria):
1. **Errata do sha do backup válido:** citar `b0f229e7454045ca6d637b39da914cfb258508edcfd36ebd640b4b96b9476945` (= `aid3693-evidence/l19-backup.json` anexado, run4, recomputado pelo revisor) e marcar `8f6325f8…ba2278` como export do run3 supersedido.
2. **SHA256SUMS dos dist/dist2 sobreviventes** (`/tmp/opencode/aid3693/dist` e `dist2`, declarando dist2 = dist − `icon-192.png`) em `aid3693-evidence/`, referenciado na errata — âncora de identidade do artefato testado p/ revalidação quando o head mudar. Valores já computados pelo revisor: `index.html 4ad8c7e9…04fc`, `assets/index-CcNpudqZ.js 7cfcfef6…f56`, `assets/index-Cu16LE5G.css 250fcf64…ca8b`.
3. **Nota de iteração do harness:** o FAIL C5C6 do run3 ("JSON inválido") foi defeito do MÉTODO de tamper do harness (JSON malformado), supersedido pelo run4 com fixture válida (cap `mastered`→`completed` conforme `progressBackup.ts:16`); não é não-determinismo do produto.

Após os 3 itens, o revisor (`ca12fdb7`) reanexa para o approve final do estágio. Verificação first-hand e limites da revisão constam integralmente no parecer `edd1d7b2`.

**Storage Engineer** · 2026-10-02T00:23:48.54623+00:00

**Errata + âncoras de identidade — 3 itens da decisão `changes_requested` (parecer `edd1d7b2`, decisão `b6771baf`) atendidos; re-submeto ao estágio nativo de review.**

**Proveniência real:** Storage Engineer `92d055bc-e965-4f92-8ef6-06a775fa900e`, tarefa AID-3693 (`d377fe40-7eef-4022-a5fb-0eac9de13797`), run `30ed4f38-c1df-4e76-9537-6b40a8a8e858` (início 2026-10-02T00:20:48.500Z; sessionId não exposto nos metadados do adaptador, como no run anterior). **Escopo:** documental apenas — sem reexecutar suíte, sem rebuild, sem instalar/restaurar dependências, sem alteração de produto; o recibo permanece preparação/repro do RC1 `501251d4`, não aceite do RC2 nem prova do main atual (C0 RC2 congelado = comentário `1a0985fd` de AID-3670).

## 1. Errata do sha do backup válido ✔

Correção: no handoff citei `8f6325f83618760e4b01afa97ee2b5a1f674c369b4b5f27ed4f17fc982ba2278` como "backup válido" — esse é o **export do C4 do run3, SUPERSEDED** (consta em `aid3693-evidence/l19-run3.log`). O sha válido do artefato anexado e vigente é:

```
b0f229e7454045ca6d637b39da914cfb258508edcfd36ebd640b4b96b9476945  aid3693-evidence/l19-backup.json
```

— recomputado agora first-hand (`sha256sum`, 2026-10-02T00:22Z) e idêntico ao C4 do run4 (`l19-run4.log`). Reuso futuro de prova por identidade aponta para `b0f229e7…76945`.

## 2. SHA256SUMS dos dist/dist2 sobreviventes ✔

Publicados em `aid3693-evidence/` (proveniência e comando de verificação em `SHA256SUMS.README.md`):

- **`SHA256SUMS-dist.txt`** — 17/17 OK (`sha256sum -c` executado 2026-10-02T00:24Z em `/tmp/opencode/aid3693/dist`, cópia sobrevivente do dist FPE `rc/qa-c0` @ `501251d4`, servido em :4193).
- **`SHA256SUMS-dist2.txt`** — 16/16 OK; **dist2 = dist − `icon-192.png`** (única diferença, confirmada por diff dos checksums ordenados), servido em :4194 (C8a).

Valores que o revisor computou conferem 3/3 contra minha recomputação: `index.html 4ad8c7e98d8076cd8cae366670eee2a4a66bf6a8e687a22d22b4eeefb0bc04fc`, `assets/index-CcNpudqZ.js 7cfcfef636afb0f090fe0f5e2abbe797e99e26be46f17ba56f1ecb1f303f0f56`, `assets/index-Cu16LE5G.css 250fcf64dc98efabe5e0efd95f37de7b9c50f46554a6f42c292a333ed795ca8b`. Estas âncoras + ref pin `501251d4` + `index-CcNpudqZ.js` permitem revalidar "se head muda" quando o manifest C0 congelar.

## 3. Nota de iteração do harness (run3 → run4) ✔

O **FAIL C5C6 do run3 foi defeito do MÉTODO de tamper do harness** — o fixture gerado era JSON malformado, então o produto corretamente recusou com "Progresso local não migrável: JSON inválido" e o caminho do cap (C6) nem foi exercitado (`l19-run3.log`: `erroTampered` = JSON inválido). **Supersedido pelo run4** com fixture válida (mutação única `l02→"mastered"`, sha `77fb57576ead546e4f5f8b81de3ae07e16748fb53e9d6c529312487afee96a95`) → PASS: `tamperedAceitoComCap: true`, `l02AposTampered: "completed"`, `masteredNuncaPersistido: true`, conforme o teto do produtor em `engines/literacyDojo/src/domain/progressBackup.ts:16`. **Não é não-determinismo do produto**: C1–C4, C7, C8a, C8b são idênticos entre run3 e run4; a única divergência é o C5C6 supersedido.

## Disposição

3/3 itens atendidos sem re-teste (conforme acordado no parecer). Re-submeto ao estágio nativo de review (reviewer configurado: Learner App & Accessibility Engineer `ca12fdb7-19ee-4d89-be95-fce692acfdd9`) para o approve final do estágio. Achados F1/F2 seguem registrados para correção autorizada em issue própria; execução FINAL permanece pendente do manifest C0 congelado (AID-3670/3672/3673). Nenhum merge/deploy/publicação; nenhum dado real tocado.

**Learner App & Accessibility Engineer** · 2026-10-02T00:30:21.548085+00:00

**Approved** — decisão do estágio nativo de review da AID-3693 (revisor configurado: Learner App & Accessibility Engineer `ca12fdb7-19ee-4d89-be95-fce692acfdd9`; retorno configurado não acionado). Procedo ao parecer final sobre a re-submissão do Storage Engineer `92d055bc-e965-4f92-8ef6-06a775fa900e` (recibo `c73b2699-2069-471a-af4b-abc86563e657`, run `30ed4f38-c1df-4e76-9537-6b40a8a8e858`). Verificação independente executada agora first-hand, reads-only, 2026-10-02T00:2x–00:30Z.

## Os 3 requisitos do parecer `edd1d7b2` — verificados first-hand (3/3 ✔)

1. **Errata do sha do backup ✔** — recomputei `sha256sum aid3693-evidence/l19-backup.json` = `b0f229e7454045ca6d637b39da914cfb258508edcfd36ebd640b4b96b9476945`, idêntico ao citado na errata e ao C4 do `l19-run4.log`; `8f6325f83618760e4b01afa97ee2b5a1f674c369b4b5f27ed4f17fc982ba2278` confirmado presente apenas como export C4 do run3 (superseded) no `l19-run3.log`. Reuso futuro de prova por identidade agora aponta para o sha correto.
2. **SHA256SUMS dos dist/dist2 sobreviventes ✔** — `sha256sum -c` executado por mim em `/tmp/opencode/aid3693/dist`: **17/17 OK, zero falhas**; em `/tmp/opencode/aid3693/dist2`: **16/16 OK, zero falhas**; `diff -rq` confirma **dist2 = dist − `icon-192.png`** como única diferença. As 3 âncoras que computei na revisão anterior conferem byte-a-byte contra os arquivos publicados: `index.html 4ad8c7e9…04fc`, `assets/index-CcNpudqZ.js 7cfcfef6…f56`, `assets/index-Cu16LE5G.css 250fcf64…ca8b`. Identidade do artefato testado (pin `501251d4` + asset hash + sums) está agora pinjada para revalidação quando o head mudar.
3. **Nota de iteração do harness (run3 → run4) ✔** — presente no recibo com a causalidade correta, e eu a confirmei nos logs: run3 `erroTampered: "Progresso local não migrável: JSON inválido"` (fixture malformada ⇒ defeito do MÉTODO de tamper; caminho do cap não exercitado) vs. run4 C5C6 **PASS** com `tamperedAceitoComCap: true`, `l02AposTampered: "completed"`, `masteredNuncaPersistido: true` (teto do produtor em `engines/literacyDojo/src/domain/progressBackup.ts:16`). Fixture `fixture-mastered.json` recomputada = `77fb57576ead546e4f5f8b81de3ae07e16748fb53e9d6c529312487afee96a95` ✓ (mutação única l02→"mastered"). Não é não-determinismo do produto.

## Base técnica já verificada na 1ª revisão (mantida)

Pins `rc/qa-c0` = `501251d4f0d2d5e7e89dd0ccdfdd499072bd2fe2` ✓; fixtures prefix/mutação byte-exatas ✓; flip C6 legítimo pelo contrato do produto ✓; F1 (`OnboardingScreen.tsx:102-118`, save sem try/catch) e F2 (`public/sw.js`, `addAll` atômico no install) confirmados ✓; isolamento C8a (dist2) ✓. Achados F1/F2 seguem registrados com file:line para correção autorizada em issue própria; nenhum defeito novo introduzido pelas correções documentais (escopo foi apenas comentário/evidência, sem reexecutar suíte nem rebuild — conferido).

## Limites que permanecem (sem alteração)

Este approve valida o **pacote de evidência como preparação/repro do RC1 `501251d4`** — NÃO é aceite do RC2 nem prova do main atual (C0 RC2 congelado = comentário `1a0985fd` de AID-3670). Execução FINAL da rodada permanece pendente do manifest C0 congelado e dos gates AID-3672/AID-3673; "se head muda, revalidar o afetado". Sem merge/publicação/produto nesta lente; nenhum dado real tocado. Prova antiga não se converte em prova nova.

Disposição: revisão do estágio concluída com aprovação; issue encerrada como `done` nesta lente L19. Monitor do sweep-channel (AID-3039) intocado por esta revisão (armado para tick futuro, sem ação necessária).

---

