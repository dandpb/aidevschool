# AID-3520: Docs — guia operacional curto da escola unificada (pronto para revisão; marcar dependências de URL publicada)

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-30T20:57:54.955597+00:00 | **Updated:** 2026-09-30T21:43:08.298+00:00
- **ID:** `61d9c383-d84f-44de-b1c1-5cf8f9f1b822`

## Description

Lote operacional founder (AID-3307 comment 4e9668b1, frente 3). Dono: Docs & Readiness.

**Entregável:** guia operacional CURTO e pronto para revisão da escola unificada: caminhos das duas jornadas (dois públicos), pré-requisitos, operador separado, retomada, troubleshooting e limitações REAIS. Usar contratos/rotas aceitos; marcar explicitamente o que depende de URL publicada.

**Aceite:** texto utilizável publicado neste issue + lista de lacunas com fonte/dono. NÃO recriar a triagem v99 (encerrada em AID-3067). Sem novas contas/outreach.

## Document `Guia operacional curto — Escola unificada /escola/ (r2, 2026-09-30)` (2026-09-30)

# Guia operacional curto — Escola unificada (fatia 1: entrada `/escola/`)

> **Proveniência:** AID-3520 (Docs & Readiness), frente 3 do lote operacional founder (AID-3307 comentário `4e9668b1`, 2026-09-30). Espelho canônico em repo: `docs/product-readiness/ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` no PR #622 (head `7ec51945`, r2). Doc na issue = espelho de sessão; divergência entre os dois é bug de docs (reportar, não editar à mão).
> **Verificado em:** 2026-09-30 (checagens ao vivo ~21:05Z; merge PR #616 20:54:18Z). Cada claim cita fonte em §Fontes. **r2 (review QA `443b8b3b`):** acrescenta §9 (troubleshooting) e corrige a contagem do gate de honestidade para 9 testes (era "10").
> **Estado-resumo em uma linha:** a escola unificada existe como código aceito no `main` (fatia 1, entrada estática `/escola/` no literacyDojo); a **URL pública `/escola/` ainda não está publicada** — hoje o caminho devolve o shell SPA da raiz (falso-200, §7).

---

## 1. O que é (1 parágrafo)

Uma escola, duas jornadas: todo mundo começa pelos mesmos **fundamentos** (F1 Entender IA · F2 Uso seguro · F3 Prompt e contexto · F4 Verificação) no **app de lições** (trilha adaptativa com avaliação inicial, 23 missões pt-BR); depois segue para **IA no cotidiano** (quem não programa) ou **IA para Dev** (quem desenvolve — hoje prévia planejada, §6). A entrada `/escola/` é uma página estática que **orienta e encaminha**; ela não armazena nada e não tem login. Jogos e laboratórios são prática opcional, com progresso separado.

## 2. Caminhos das duas jornadas

**Jornada 1 — IA no cotidiano (para quem não programa) — REAL hoje:**
1. Abra a entrada da escola (`/escola/`, §7) ou direto o app de lições (`/` da superfície Literacy).
2. CTA "Começar pelos fundamentos" → link same-origin para `/` (nenhum gate, nenhuma conta).
3. No app: avaliação inicial curta define o ponto de partida; a trilha adapta a ordem; uma lição por vez, com feedback determinístico.
4. Progresso fica no dispositivo (IndexedDB do app de lições).

**Jornada 2 — IA para Dev (para quem desenvolve) — PRÉVIA hoje:**
- Os fundamentos são os mesmos (passos 1–4 acima). A **ponte Dev é prévia planejada**: as lições `l15`, `l16–l17`, `l21–l23` e `l27–l29` do módulo 05 aparecem na entrada como **destino**, não como percurso pronto no app (contrato `SCHOOL_ENTRY`, `preview: true`). Prática opcional para quem já programa: laboratórios do CodexDojo OS (link externo, progresso separado).

## 3. Pré-requisitos

| Quem | Precisa | Não precisa |
| --- | --- | --- |
| Aprendiz | Navegador moderno com JavaScript; mesmo navegador/dispositivo para retomar | Conta, login, instalação, e-mail |
| Facilitador (preview local) | Clone do repo; `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build`; preview do build (`vite preview`, projeto `pwa` — mesmo fluxo de aceite do PR #616) | Deploy próprio |
| Operador | Superfície Node separada (§4) | Acesso admin pela entrada pública — **não existe** |

Sem JavaScript: a entrada degrada — mapa parado, versão em texto do mapa disponível, links para o app de lições funcionam (`index.html:146`).

## 4. Operador separado (não está na escola pública)

A entrada pública `/escola/` **não tem** `/admin`, API, fetch, storage ou gate de operador (removido na porta estática; `escola.js:1-7`, allowlist mecânica de hrefs no gate de honestidade). O controle operacional (liberação global de engines, painel `/admin/engines`, checagem Chromium de entrada) vive na **superfície Node do school-entry** — app separado, **não publicado**, Node ≥ 22.13, `npm ci && npx playwright install chromium && npm start` → `127.0.0.1:5185`, sessão de operador 8h com `ADMIN_PASSWORD_HASH` (`engines/school-entry/README.md:40`). Publicação da superfície pública é papel exclusivo de FPE/PRE pelo runbook de promoção (`docs/serving/PROMOTION-RUNBOOK.md`).

## 5. Retomada

- **Onde o progresso vive:** no app de lições, no seu dispositivo (IndexedDB, same-origin). Recarregar mantém a lição corrente estável e o estado `completed` (E2E do PR #616: `l02` persiste após reload na mesma origem).
- **A entrada `/escola/` não sabe onde você parou:** cada experiência mantém seu próprio progresso; a entrada não sincroniza nem rastreia nada (seção "Já conhece a escola?" lista os links diretos — `index.html:113-128`).
- **Recomeçar do zero:** janela privada/navegador limpo, ou limpar os dados do site. Perda real: limpar dados do site apaga o progresso (não há backup — §6).

## 6. Limitações reais (não maquiadas)

1. **Jornada Dev é prévia:** a ponte `l15–l29` (módulo 05) não é percurso no app hoje; a entrada lista o destino planejado (`entry-contract.js:42-68`).
2. **Sem conta, sem sync:** progresso local-first por navegador/dispositivo; sem recuperação entre dispositivos; limpeza de dados = perda.
3. **Publicação pendente:** merge no `main` ≠ publicado. Checagem ao vivo 2026-09-30 ~21:05Z: `/escola/` devolve o shell SPA da raiz (título "LiteracyDojo — IA com confiança no trabalho"), não a página da escola — dependência de URL publicada (§7).
4. **Cobertura de teste honesta:** o E2E público rodou com perfil **fresco** (sem Service Worker controlando); retornante com SW é coberto só por regressão F1 em suite, não no E2E ao vivo (corpo do PR #616).
5. **Inspeção visual humana pendente:** a arte do mapa (canvas desenhado em código) tem evidência mecânica (pixels/contagens) mas revisores humanos ainda não inspecionaram os screenshots (corpo do PR #616).
6. **Monitoramento desarmado:** checks #7–8 (`escola-root-marker`, `escola-assets`) só devem ser armados **pós-publicação** — hoje não vigiam a rota (`UPTIME-MONITOR-SETUP.md:32-33`).
7. **Entrada sem telemetria:** o caminho `/escola/` não emite analytics (sem fetch/storage); o app de lições emite envelope same-origin em `POST /__dojo/bridge/v1/analytics` (zero PII).
8. **Prática opcional externa:** laboratórios CodexDojo OS são cross-origin (`rel="noopener"`), progresso separado; SDLC Quest é citado como prática opcional sem link público na entrada.

## 7. Dependências de URL publicada (marcadas explicitamente)

| Item | Dependência | Dono |
| --- | --- | --- |
| Passo 1 das jornadas via entrada `/escola/` (`https://aidevschool-literacydojo.netlify.app/escola/`) | **Publicação do build do PR #616** pela promoção autorizada — até lá, o caminho devolve o shell SPA (falso-200; controle negativo do check #7 pega isso) | FPE/PRE |
| Verificação pública única da superfície (matriz de aceite) | Executar **uma única vez** quando FPE/PRE fornecerem URL/build publicada | QA Lead (frente 1 do mesmo lote) |
| Armar monitors #7–8 (marcador raiz + assets + controle negativo) | Somente pós-publicação | FPE |
| Contornar hoje sem URL publicada | Direto pela raiz `https://aidevschool-literacydojo.netlify.app/` (já publicada e viva — checagem 200 + conteúdo LiteracyDojo ~21:05Z) ou preview local (§3) | — |

## 8. Lacunas (fonte/dono — para decisão, não maquiadas)

| # | Lacuna | Fonte | Dono/próximo passo |
| --- | --- | --- | --- |
| 1 | `/escola/` não publicado (shell SPA no lugar) | curl 2026-09-30 ~21:05Z; `UPTIME-MONITOR-SETUP.md:32` | FPE/PRE (publicação já autorizada, founder 20:44Z no merge #616) |
| 2 | Ponte Dev `l15–l29` (módulo 05) sem percurso no app | `entry-contract.js:67` | Product/Curriculum (decisão de escopo — CEO) |
| 3 | E2E público não cobre retornante com SW controlando | corpo do PR #616 (honestidade) | LEE/QA em fatia futura |
| 4 | Inspeção visual humana do mapa pendente | corpo do PR #616 | Revisores do PR (FSE/QA) |
| 5 | Superfície Node do school-entry (operador) não publicada | PR #615 draft; `docs/serving/README.md:17` | FPE + decisão founder |
| 6 | Checks #7–8 desarmados | `UPTIME-MONITOR-SETUP.md:32-33` | FPE pós-publicação |

## 9. Se der errado (troubleshooting)

- **`/escola/` abre o app de lições (shell SPA), não a página da escola:** publicação pendente — usar a raiz `/` ou o preview local (§7, linha "Contornar hoje").
- **Mapa parado, só a versão em texto:** JavaScript desabilitado — a entrada degrada por projeto (`index.html:146`).
- **Progresso sumiu:** dados do site foram limpos — sem backup nem sync (§6.2); recomeçar é o caminho documentado (§5).
- **Preview local falha por conteúdo ausente:** rodar `npm run gen:content` **antes** do build (§3, linha do facilitador).
- **`/escola/escola.js` responde 200 mas a página não abre:** é o falso-200 da publicação pendente (§6.3) — mesmo contorno do primeiro item.

## Fontes (data + caminho)

- Código da entrada (aceito no `main` @ `e95611da`, PR #616 merge 2026-09-30T20:54:18Z): `engines/literacyDojo/public/escola/index.html` (título l14; skip-link l19; ponte noscript l98; retomada l113-128; footer l131; noscript l146); `escola.js` (cabeçalho de porta l1-7; CTA `/` l53; reduced-motion l126-129; foco l107-118); `entry-contract.js` (contrato `SCHOOL_ENTRY` verbatim l6-71; `preview:true` l48; ponte l50-68).
- Gate de honestidade (9 testes `it()` — `grep -cE '^\s*(it|test)\('` em `escola-honesty.test.ts` @ `main` `d9dbdd5c`; allowlist de hrefs, read-only): `engines/literacyDojo/tests/static-entry/escola-honesty.test.ts` (PR #616).
- Serving: `docs/serving/README.md` (superfícies l12-17; fronteira invariável l50-53); `docs/serving/UPTIME-MONITOR-SETUP.md` (checks 7-8 l32-33); `docs/serving/PROMOTION-RUNBOOK.md`.
- Operador separado: `engines/school-entry/README.md` (l1-3, l40; PR #615 draft).
- PR #616: https://github.com/dandpb/aidevschool/pull/616 (aceite em `vite build`+`vite preview`, perfil fresco; screenshots anexados ao review).
- Checagens ao vivo (curl, 2026-09-30 ~21:05Z): `/escola/` → 200 com título "LiteracyDojo — IA com confiança no trabalho" (shell SPA, entrada NÃO publicada); `/escola/escola.js` → 200 (asset serve, mas sem a página da rota); raiz `/` → 200 LiteracyDojo vivo.

*Não recria a triagem v99 (encerrada em AID-3067). Sem novas contas/outreach.*

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3520 — Docs — guia operacional curto da escola unificada (pronto para revisão; marcar dependências de URL publicada)
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 145250e9-56cc-4fd6-b7d4-19d1e637bc29
- Agent: QA Lead (opencode_local)

## Objective

Lote operacional founder (AID-3307 comment 4e9668b1, frente 3). Dono: Docs & Readiness.

**Entregável:** guia operacional CURTO e pronto para revisão da escola unificada: caminhos das duas jornadas (dois públicos), pré-requisitos, operador separado, retomada, troubleshooting e limitações REAIS. Usar contratos/rotas aceitos; marcar explicitamente o que depende de URL publicada.

**Aceite:** texto utilizável publicado neste issue + lista de lacunas com fonte/dono. NÃO recriar a triagem v99 (encerrada em AID-3067). Sem novas contas/outreach.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `145250e9-56cc-4fd6-b7d4-19d1e637bc29` finished with status `succeeded` at 2026-09-30T21:43:44.059Z.
- Doc r2 verificado — §9 troubleshooting presente (5 bullets + heading, ≤10 linhas), §Fontes agora diz 9. Agora verificação independente dos espelhos: PR #622 no GitHub e o diff doc↔arquivo.

Espelhos e correções confirmados independentemente. Antes de decidir, verifico o mecanismo exato de decisão de aprovação usado em fluxos anteriores:

Verificação completa. Todos os achados foram endereçados corretamente — aprovo com evidência independente:

**Aprovado — AID-3520 concluída com verificação independente (decisão `approved`, status `done`, exec `completed`).**

Verificação first-hand do r2 @ head `7ec51945`:
- **Achado 1 (Médio) resolvido:** §9 troubleshooting presente no doc r2 (rev `37ce4c87`) e no PR #622 — 7 linhas (≤10), cobrindo os 4 modos de falha pedidos + falso-200; zero renumeração, refs §3–§8 intactas.
- **Achado 2 (Baixo) resolvido:** §Fontes cita 9 testes; re-executei `grep -cE '^\s*(it|test)\('` em `d9dbdd5c` → **9**.
- **Espelhos coerentes:** PR #622 `open`/`draft`/1 arquivo +92/−0, base `main@d9dbdd5c`; diff doc↔arquivo = 2 linhas (só proveniência, por design).
- **Sem merge/deploy:** aprovação cobre só o entregável de docs; PR segue draft (porta
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `145250e9-56cc-4fd6-b7d4-19d1e637bc29` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation] Revisão do guia operacional da escola unificada (r1) — QA Lead (expired)

Aprovar ou rejeitar com motivo o doc escola-guia-operacional r1 (AID-3520). Critérios: (1) claims de readiness com data+fonte; (2) jornadas/rotas batem com o aceito no PR #616; (3) dependências de URL publicada e lacunas com dono corretas.

## Comments (7)

**Docs & Readiness Engineer** · 2026-09-30T21:05:58.262136+00:00

**Recibo AID-3520 (Docs & Readiness) — entregável pronto para revisão.**

## Entregável (aceite da issue: texto utilizável publicado + lacunas com fonte/dono)
- **Doc na issue:** `escola-guia-operacional` (r1, 2026-09-30) — guia operacional CURTO da escola unificada: duas jornadas, pré-requisitos, operador separado, retomada, troubleshooting, limitações reais, dependências de URL publicada e lacunas.
- **Espelho canônico em repo (padrão beta-guide):** PR #622 → `docs/product-readiness/ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` (docs-only, 1 arquivo, base `origin/main` @ `d9dbdd5c`).

## Dependências de URL publicada — marcadas (achado-chave)
Merge ≠ publicado: **PR #616 merge 20:54:18Z, mas `/escola/` ainda devolve o shell SPA da raiz** — verificado ao vivo (curl, 2026-09-30 ~21:05Z, título retornado "LiteracyDojo — IA com confiança no trabalho"). É exatamente o falso-200 do controle negativo do check #7 (`docs/serving/UPTIME-MONITOR-SETUP.md:32-33`). Publicação é exclusiva de **FPE/PRE**; monitors #7–8 armam só pós-publicação (FPE); verificação pública única aguarda URL (QA Lead, frente 1). Até lá, o guia documenta o contorno: raiz `https://aidevschool-literacydojo.netlify.app/` (viva) + preview local (`vite build`+`vite preview`).

## Lacunas com fonte/dono (resumo; detalhe no §8 do guia)
1. `/escola/` não publicado → **FPE/PRE** (autorizado pelo founder 20:44Z). 2. Ponte Dev `l15–l29` sem percurso no app (`entry-contract.js:67`) → **product/CEO**. 3. E2E sem retornante c/ SW (corpo PR #616) → **LEE/QA**. 4. Inspeção visual humana pendente (PR #616) → **revisores**. 5. Superfície operador school-entry não publicada (PR #615 draft) → **FPE + founder**. 6. Checks #7–8 desarmados → **FPE**.

## Disposição
**in_review** — revisão de conteúdo: **QA Lead** no doc da issue e no PR #622; merge: **FPE** (single-writer até R1). Escopo respeitado: não recria triagem v99 (AID-3067); sem contas/outreach; sem mudança de produto.

**founder** · 2026-09-30T21:20:42.961349+00:00

Correção operacional delimitada no candidato de documentação: o coordenador verificou PR622, head76d59298, aberto como não-draft. Converta somente o estado desse PR para Draft e confirme por leitura o mesmo head e isDraft\=true; não altere código/conteúdo, não faça merge e não mexa em outro PR. O limite atual é candidato em draft aguardando revisão.



Depois publique um recibo curto da correção aqui. A revisão independente do guia será roteada para QA Lead pelo estágio nativo desta mesma issue; não crie outra tarefa/filho de review nem trate a antiga interação de confirmação como substituto do revisor designado. Preserve o artefato, o escopo e os limites de publicação de FPE/PRE. Respeite403/409/422 sem mudança de papel para recuperar escrita negada.

**Docs & Readiness Engineer** · 2026-09-30T21:21:31.878249+00:00

**Recibo da correção operacional (AID-3520, Docs & Readiness).**

- **PR #622 convertido para Draft** — único objeto tocado; nenhum código/conteúdo alterado, nenhum merge, nenhum outro PR.
- **Confirmação por leitura (pós-conversão):** head `76d59298a79d3e25569eb04682b19df287d2f9dc` (inalterado), `isDraft: true`, state `open`, 1 arquivo (docs-only). Fonte: `GET /repos/dandpb/aidevschool/pulls/622` (leitura refeita após a conversão via `convertPullRequestToDraft`).
- **Estado:** candidato em draft aguardando revisão. A interação de confirmação anterior não substitui o revisor designado — revisão independente do guia fica a cargo do roteamento nativo desta issue (QA Lead), sem nova tarefa/filho de review da minha parte.
- **Preservado:** artefato (doc `escola-guia-operacional` r1 + espelho repo no PR #622), escopo, limites de publicação de FPE/PRE, dependências de URL publicada registradas no guia (§7).

Disposição permanece **in_review** — revisão roteada pelo estágio nativo da issue.

**QA Lead** · 2026-09-30T21:31:48.212032+00:00

**Changes requested — revisão independente QA Lead (AID-3520, estágio review, head `76d59298a79d3e25569eb04682b19df287d2f9dc`).**

## Verificado e CONFIRMADO (evidência independente, 2026-09-30)
- **PR #622:** `open`, `draft: true`, head `76d59298`, 1 arquivo docs-only (+84/−0), base `main@d9dbdd5c` (GitHub API `GET /repos/dandpb/aidevschool/pulls/622`).
- **Espelho coerente:** arquivo do PR ≡ doc da issue `escola-guia-operacional` r1 em 83/84 linhas; única diferença é a linha de proveniência (cada espelho aponta o outro como canônico — por design, não é divergência).
- **Claims ao vivo reexecutadas:** `https://aidevschool-literacydojo.netlify.app/escola/` → 200 com título "LiteracyDojo — IA com confiança no trabalho" (shell SPA = falso-200, entrada NÃO publicada); raiz `/` → 200 viva. Limitação §6.3/§7 confirmada vigente.
- **Citações de código conferidas exatas em `main@d9dbdd5c`:** `index.html` l14/l19/l98/l113-128/l131/l146; `escola.js` l1-7 ("No storage access"), l53, l107-118, l126-129; `entry-contract.js` l6/l42/l48 (`preview:true`)/l50/l67/l71; `school-entry/README.md` l40; `UPTIME-MONITOR-SETUP.md` l32-33.
- **"23 missões pt-BR" exato:** `curriculum/ai-literacy/catalog.yaml` — 23 lições públicas `ia_pratica` (7 módulos); módulo 05 Dev (`l15–l29`) fora do app, coerente com a moldura de prévia do guia.
- **Escopo respeitado:** não recria triagem v99; sem contas/outreach; sem mudança de produto.

## Achados acionáveis (bloqueiam aprovação)

**1. (Médio — lacuna de escopo) Seção `troubleshooting` ausente.** A issue exige explicitamente "...retomada, **troubleshooting** e limitações REAIS". O guia (§1–§8) não tem seção de troubleshooting nem usa o termo; há só cobertura parcial dispersa (§3 degradação sem JS, §5 recomeçar do zero, §7 contorno sem URL publicada). **Esperado:** seção curta (≤10 linhas) de "se der errado" com os modos de falha que o próprio guia documenta — `/escola/` mostra o app SPA → ainda não publicado, usar raiz ou preview local (§7); mapa parado → JavaScript desabilitado (`index.html:146`); progresso sumiu → dados do site limpos, sem backup (§6.2); preview local falha → rodar `npm run gen:content` antes do build (§3). Atualizar os dois espelhos (doc da issue r2 + PR #622).

**2. (Baixo — imprecisão factual) §Fontes diz "Gate de honestidade (10 testes...)".** **Atual:** `escola-honesty.test.ts` tem **9** blocos `it()` em ambos os SHAs citados (`e95611da` e `d9dbdd5c`; conferido por `grep -cE '^\s*(it|test)\('`). Off-by-one em um doc cuja premissa é "cada claim cita fonte". Corrigir para 9 (ou citar o contador exato usado).

## Correções pedidas
1. Adicionar a seção de troubleshooting (achado 1) nos dois espelhos.
2. Corrigir a contagem de testes no §Fontes (achado 2).
3. Sem merge/deploy nesta revisão; candidato permanece draft; publicação segue exclusiva de FPE/PRE.

Disposição: **in_progress** — retorna ao produtor (Docs & Readiness) pelo estágio nativo.

**QA Lead** · 2026-09-30T21:33:04.738652+00:00

Changes requested — revisão independente QA Lead (head 76d59298a79d3e25569eb04682b19df287d2f9dc); detalhes e evidências no comentário 443b8b3b: (1) Médio — seção troubleshooting ausente (exigida pela issue); (2) Baixo — §Fontes afirma 10 testes no gate de honestidade, real: 9. Corrigir nos dois espelhos (doc da issue r2 + PR #622); sem merge/deploy.

**Docs & Readiness Engineer** · 2026-09-30T21:37:28.361648+00:00

**Changes addressed — resubmissão r2 para o estágio de review (QA Lead).** Achados 1 e 2 do comentário `443b8b3b` corrigidos exatamente como pedido; nenhum outro artefato tocado; sem merge/deploy (PR #622 segue draft; publicação permanece exclusiva de FPE/PRE).

**1) §9 "Se der errado (troubleshooting)" adicionado (achado 1 — Médio):** 7 linhas (≤10), cobrindo os modos de falha que o próprio guia documenta: `/escola/` mostra shell SPA → raiz ou preview local (§7); mapa parado → JavaScript desabilitado (`index.html:146`); progresso sumiu → dados limpos, sem backup (§6.2); preview local falha → `npm run gen:content` antes do build (§3); `escola.js` 200 sem página → falso-200 da publicação pendente (§6.3). Seção inserida como §9 (após §8) — **zero renumeração**, todas as refs §3–§8 verificadas pelo QA continuam válidas.

**2) Contagem corrigida 10 → 9 (achado 2 — Baixo):** §Fontes agora cita "**9 testes `it()` — `grep -cE '^\s*(it|test)\('` em `escola-honesty.test.ts` @ `main` `d9dbdd5c`**". Re-verificado de forma independente neste heartbeat: contador retorna **9** no worktree e em `origin/main` (linhas 104/119/140/158/165/178/187/194/224).

**Espelhos atualizados e coerentes:**
- **PR #622:** head `76d59298` → **`7ec51945`** (commit "docs(product-readiness): AID-3520 r2 — review QA 443b8b3: acrescenta §9 troubleshooting; corrige contagem do gate de honestidade 10→9"); segue `open` + `draft: true`, 1 arquivo docs-only **+92/−0**, base `main@d9dbdd5c` (GitHub API `GET /repos/dandpb/aidevschool/pulls/622` e `/pulls/622/files`).
- **Doc da issue:** `escola-guia-operacional` **r2** (revisão `37ce4c87`, título atualizado). Diff ao vivo doc↔arquivo do PR = **2 linhas** (apenas a linha de proveniência, que aponta cada espelho para o outro — por design).

Disposição: **in_review** — devolvo ao QA Lead pelo estágio nativo para re-conferência dos dois achados.

**QA Lead** · 2026-09-30T21:43:08.287948+00:00

**Approved — re-revisão independente QA Lead (AID-3520, estágio review, r2 @ head `7ec519451b4325c46ed35f15bc643db308c8d6f6`).** Achados 1 e 2 do comentário `443b8b3b` corrigidos e re-verificados first-hand; nada além do pedido foi tocado.

## Verificação independente (2026-09-30, pós-resubmissão)

**Achado 1 (Médio) — §9 troubleshooting: RESOLVIDO.** Doc r2 (`escola-guia-operacional`, rev `37ce4c87`) contém §9 "Se der errado (troubleshooting)": heading + 5 bullets = 7 linhas (≤10), cobrindo exatamente os modos de falha pedidos — shell SPA em `/escola/` → raiz/preview (§7); mapa parado → JS desabilitado (`index.html:146`); progresso sumiu → dados limpos sem backup (§6.2); preview local falha → `npm run gen:content` antes do build (§3); `escola.js` 200 sem página → falso-200 (§6.3). Inserido após §8 com **zero renumeração** (§1–§8 intactos; §Fontes continua sem número); refs internas §3/§5/§6.2/§6.3/§7 todas resolvem.

**Achado 2 (Baixo) — contagem: RESOLVIDO.** §Fontes agora cita "9 testes `it()` — `grep -cE '^\s*(it|test)\('` @ `main` `d9dbdd5c`". Re-executado por mim agora: `git show d9dbdd5c:engines/literacyDojo/tests/static-entry/escola-honesty.test.ts | grep -cE '^\s*(it|test)\('` → **9**. Exato.

**Espelhos coerentes (re-conferidos):** PR #622 `open`, `draft: true`, head `76d59298`→`7ec51945` (2 commits), base `main@d9dbdd5c`, 1 arquivo docs-only **+92/−0** (era +84/−0; delta = §9 + notas r2). Diff ao vivo arquivo-do-PR↔doc-da-issue = **2 linhas** (só a linha de proveniência, por design). Proveniência do doc r2 cita o head novo corretamente.

**Aceite da issue:** duas jornadas (§2), pré-requisitos (§3), operador separado (§4), retomada (§5), troubleshooting (§9), limitações reais (§6), dependências de URL publicada marcadas com dono (§7) e lacunas fonte/dono (§8) — publicado como texto utilizável no issue. Não recria v99; sem contas/outreach.

## Limitações explícitas
- Aprovação do **entregável de documentação** apenas: NÃO autoriza merge do PR #622 (segue draft; merge é porta exclusiva `scripts/merge_pr.sh` com countersign distinto) nem deploy/publicação (exclusivo FPE/PRE pelo runbook de promoção).
- Checagens ao vivo do guia são de ~21:05Z; falso-200 de `/escola/` permanece a limitação vigente até a publicação.

Disposição: **done** — estágio de review concluído com aprovação; serviço avança os estágios restantes.

---

