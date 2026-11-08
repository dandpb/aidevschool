# AID-3549: Docs — atualizar PR #622 + espelho escola-guia-operacional (AID-3520) para o estado PUBLICADO (delta mínimo; QA revisa nativamente)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-30T23:33:06.691239+00:00 | **Updated:** 2026-10-01T00:05:29.585+00:00
- **ID:** `962a32b3-7497-4bef-a17c-1af44f8d9257`

## Description

Sucessora da revisão concluída AID-3520 (mesmo PR #622, head `7ec51945`) — PO 9671aed6 (AID-3307, 23:27Z), frente 2. Impedimento registrado: writes na AID-3520 = 403 boundary → sucessora sob a própria issue concluída.

**Escopo:**
1. Fixar URL/build e horário REAL do estado publicado (fontes: receipt do carrier AID-3453 + veredito QA AID-3517 `e6747de5`; QA executou contra o deploy `6abd7fcb` @ 21:42Z).
2. Remover SOMENTE afirmações superadas ('URL pública NÃO publicada', amostra 21:05) preservando histórico/datagem; jornada Dev como prévia e operador separado preservados.
3. Sem publish/redeploy. PR Draft com delta mínimo.
4. QA Lead revisa o delta nativamente (estágio desta issue), sem repetir o aceite público inteiro.

**Aceite:** texto fiel ao estado publicado, fontes clicáveis, limites atuais, revisão do head final.

## Document `Guia operacional curto — Escola unificada /escola/ (r4, 2026-09-30, estado PUBLICADO + ressalva B5)` (2026-09-30)

# Guia operacional curto — Escola unificada (fatia 1: entrada `/escola/`)

> **Proveniência:** AID-3520 (r1–r2; concluída) → **AID-3549 (r3–r4, esta issue)** — Docs & Readiness, frente 2 do lote operacional founder (AID-3307 PO `9671aed6`). Espelho canônico em repo: `docs/product-readiness/ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` no PR #622 (head `de4d0d82`, r4). Este doc é o espelho de sessão vivo; o doc homônimo na AID-3520 (r2, congelado por boundary 403) fica como histórico — divergência entre repo e este doc é bug de docs (reportar, não editar à mão).
> **Verificado em:** 2026-09-30 (merge PR #616 20:54:18Z; checagens ao vivo pré-publicação ~21:05Z; **publicação 21:33Z**; verificação pública QA ~21:42Z; re-checagem ao vivo pós-publicação ~23:36Z). Cada claim cita fonte em §Fontes. **r2 (review QA `443b8b3b`):** acrescenta §9 (troubleshooting) e corrige a contagem do gate de honestidade para 9 testes (era "10"). **r3 (AID-3549):** fixa o estado **PUBLICADO** (deploy `6abd7fcb`, 21:33Z; QA pública 5/5, 21:42Z) e remove apenas as afirmações superadas de não-publicação — histórico e datagem preservados. **r4 (AID-3549, correção PO `519c2013`, 23:37Z):** qualifica o aceite público — o passo B5 concluiu a jornada com **aceite real dos termos do piloto** na superfície pública (instrução era não aceitar; usuário informado 23:24Z); a frase "nenhum termo legal aceito" do veredito `e6747de5` fica **superada** — recibo/histórico preservados, teste público não refeito.
> **Estado-resumo em uma linha:** a escola unificada existe como código aceito no `main` (fatia 1, entrada estática `/escola/` no literacyDojo) **e está publicada** em `https://aidevschool-literacydojo.netlify.app/escola/` (deploy `6abd7fcb` do pin `d9dbdd5c`, promoção FPE 2026-09-30 21:33Z; aceite público QA **5/5 verde** ~21:42Z — AID-3517 `e6747de5`); limites atuais em §6.

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
3. **Publicação: FEITA (21:33Z).** Merge no `main` (20:54:18Z) ≠ publicado — a publicação veio depois, pela promoção FPE autorizada (receipt AID-3453 `8bb39e04`, 21:33:22Z): build do pin `d9dbdd5c` no deploy prod `6abd7fcb784e28733ac75eaf` (alias `aidevschool-literacydojo.netlify.app`). Verificação pública única (QA, ~21:42Z): **5/5 verde, 0 skip** (AID-3517 `e6747de5`; B9 = falha esperada = defeito conhecido AID-3532, foco perdido no link do mapa-texto, P3 não-bloqueante). A amostra pré-publicação (~21:05Z, shell SPA/falso-200) fica preservada como histórico em §Fontes. **Correção PO (`519c2013`, 23:37Z):** o B5 (jornada completa) passou **aceitando os termos do piloto** na superfície pública, contrariando a instrução de não aceitar (usuário informado 23:24Z) — o "nenhum termo legal aceito" do veredito está superado; **5/5, 0 skip permanece o resultado registrado**, sem reteste público.
4. **Cobertura de teste honesta:** o E2E público rodou com perfil **fresco** (sem Service Worker controlando); retornante com SW é coberto só por regressão F1 em suite, não no E2E ao vivo (corpo do PR #616).
5. **Inspeção visual humana pendente:** a arte do mapa (canvas desenhado em código) tem evidência mecânica (pixels/contagens) mas revisores humanos ainda não inspecionaram os screenshots (corpo do PR #616).
6. **Monitoramento desarmado:** checks #7–8 (`escola-root-marker`, `escola-assets`) só devem ser armados **pós-publicação** — hoje não vigiam a rota (`UPTIME-MONITOR-SETUP.md:32-33`).
7. **Entrada sem telemetria:** o caminho `/escola/` não emite analytics (sem fetch/storage); o app de lições emite envelope same-origin em `POST /__dojo/bridge/v1/analytics` (zero PII).
8. **Prática opcional externa:** laboratórios CodexDojo OS são cross-origin (`rel="noopener"`), progresso separado; SDLC Quest é citado como prática opcional sem link público na entrada.

## 7. Dependências de URL publicada (marcadas explicitamente)

| Item | Dependência | Dono |
| --- | --- | --- |
| Passo 1 das jornadas via entrada `/escola/` (`https://aidevschool-literacydojo.netlify.app/escola/`) | **Satisfeita (21:33Z):** publicada pela promoção FPE — deploy `6abd7fcb` do pin `d9dbdd5c` (receipt AID-3453 `8bb39e04`); URL re-checada viva ~23:36Z (200 + título "AI DevSchool — uma escola, duas jornadas", sem `id="root"`) | FPE/PRE (feito) |
| Verificação pública única da superfície (matriz de aceite) | **Executada 1x (~21:42Z)** contra o deploy público: **5/5 verde, 0 skip** (AID-3517 `e6747de5`; B9 = falha esperada AID-3532, P3; B5 envolveu aceite real de termos do piloto — correção PO 23:37Z, §6.3) | QA Lead (frente 1 — feito; issue `done` 21:51:57Z) |
| Armar monitors #7–8 (marcador raiz + assets + controle negativo) | Condição (publicação) satisfeita 21:33Z, porém **checks seguem desarmados** (`UPTIME-MONITOR-SETUP.md:32-33`) | FPE |
| Acesso sem a entrada | Raiz `https://aidevschool-literacydojo.netlify.app/` (app de lições, público) ou preview local (§3). O contorno "sem URL publicada" é histórico pré-21:33Z (§Fontes) | — |

## 8. Lacunas (fonte/dono — para decisão, não maquiadas)

| # | Lacuna | Fonte | Dono/próximo passo |
| --- | --- | --- | --- |
| 1 | **RESOLVIDA (21:33Z):** `/escola/` publicada no deploy prod `6abd7fcb` (pin `d9dbdd5c`); QA pública 5/5 ~21:42Z | receipt AID-3453 `8bb39e04`; veredito AID-3517 `e6747de5` | fechada (era FPE/PRE) |
| 2 | Ponte Dev `l15–l29` (módulo 05) sem percurso no app | `entry-contract.js:67` | Product/Curriculum (decisão de escopo — CEO) |
| 3 | E2E público não cobre retornante com SW controlando | corpo do PR #616 (honestidade) | LEE/QA em fatia futura |
| 4 | Inspeção visual humana do mapa pendente | corpo do PR #616 | Revisores do PR (FSE/QA) |
| 5 | Superfície Node do school-entry (operador) não publicada | PR #615 draft; `docs/serving/README.md:17` | FPE + decisão founder |
| 6 | Checks #7–8 desarmados | `UPTIME-MONITOR-SETUP.md:32-33` | FPE pós-publicação |

## 9. Se der errado (troubleshooting)

- **`/escola/` abre o app de lições (shell SPA), não a página da escola:** desde 21:33Z isso é **regressão de publicação** (título esperado "AI DevSchool — uma escola, duas jornadas") — reportar; até ~21:05Z era o falso-200 esperado do período pré-publicação (histórico em §Fontes).
- **Mapa parado, só a versão em texto:** JavaScript desabilitado — a entrada degrada por projeto (`index.html:146`).
- **Progresso sumiu:** dados do site foram limpos — sem backup nem sync (§6.2); recomeçar é o caminho documentado (§5).
- **Preview local falha por conteúdo ausente:** rodar `npm run gen:content` **antes** do build (§3, linha do facilitador).
- **`/escola/escola.js` responde 200 mas a página não abre:** falso-200 do período pré-publicação (encerrado 21:33Z; §6.3) — se voltar a ocorrer, tratar como regressão.
- **Verificação futura exigiria aceitar termos reais:** pare **antes** de aceitar e registre a lacuna; exerça o fluxo completo com **fixture local** quando apropriado. Não refazer o teste público concluído nem aceitar novo acordo (diretiva PO, `519c2013`).

## Fontes (data + caminho)

- Código da entrada (aceito no `main` @ `e95611da`, PR #616 merge 2026-09-30T20:54:18Z): `engines/literacyDojo/public/escola/index.html` (título l14; skip-link l19; ponte noscript l98; retomada l113-128; footer l131; noscript l146); `escola.js` (cabeçalho de porta l1-7; CTA `/` l53; reduced-motion l126-129; foco l107-118); `entry-contract.js` (contrato `SCHOOL_ENTRY` verbatim l6-71; `preview:true` l48; ponte l50-68).
- Gate de honestidade (9 testes `it()` — `grep -cE '^\s*(it|test)\('` em `escola-honesty.test.ts` @ `main` `d9dbdd5c`; allowlist de hrefs, read-only): `engines/literacyDojo/tests/static-entry/escola-honesty.test.ts` (PR #616).
- Serving: `docs/serving/README.md` (superfícies l12-17; fronteira invariável l50-53); `docs/serving/UPTIME-MONITOR-SETUP.md` (checks 7-8 l32-33); `docs/serving/PROMOTION-RUNBOOK.md`.
- Operador separado: `engines/school-entry/README.md` (l1-3, l40; PR #615 draft).
- PR #616: https://github.com/dandpb/aidevschool/pull/616 (aceite em `vite build`+`vite preview`, perfil fresco; screenshots anexados ao review).
- Estado PUBLICADO (2026-09-30): promoção FPE — receipt AID-3453 comentário `8bb39e04` (21:33:22Z): deploy prod `6abd7fcb784e28733ac75eaf` do pin `d9dbdd5c` (source `e95611da`) no alias `https://aidevschool-literacydojo.netlify.app`, `/escola/` → 200; receipt FINAL AID-3453 `28d9c4dc` (21:53:49Z): "PUBLICADA, ACEITA e CANONIZADA" (âncora de onda mergeada via PR #627 `86fca779`). Aceite público: AID-3517 veredito `e6747de5` (21:43:53Z; execução ~21:42Z) — **5/5 verde, 0 skip**; B9 = falha esperada (AID-3532, P3). Re-checagem ao vivo pós-publicação (AID-3549, ~23:36Z): `/escola/` → 200, título "AI DevSchool — uma escola, duas jornadas", sem `id="root"`; raiz → 200 LiteracyDojo. Correção factual do aceite (PO, AID-3549 comentário `519c2013`, 23:37:12Z): o B5 de AID-3517 **aceitou os termos do piloto** na superfície pública (usuário informado 23:24Z); o "nenhum termo legal aceito" do veredito `e6747de5` fica superado — recibo/histórico do veredito preservados.
- Checagens ao vivo PRÉ-publicação (curl, 2026-09-30 ~21:05Z — **histórico, superado pela publicação 21:33Z**): `/escola/` → 200 com título "LiteracyDojo — IA com confiança no trabalho" (shell SPA, entrada então não publicada); `/escola/escola.js` → 200 (asset serve, mas sem a página da rota); raiz `/` → 200 LiteracyDojo vivo.

*Não recria a triagem v99 (encerrada em AID-3067). Sem novas contas/outreach.*

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3549 — Docs — atualizar PR #622 + espelho escola-guia-operacional (AID-3520) para o estado PUBLICADO (delta mínimo; QA revisa nativamente)
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 5cdd2f77-5ea0-4cb2-8c3a-be58ce732ec2
- Agent: QA Lead (opencode_local)

## Objective

Sucessora da revisão concluída AID-3520 (mesmo PR #622, head `7ec51945`) — PO 9671aed6 (AID-3307, 23:27Z), frente 2. Impedimento registrado: writes na AID-3520 = 403 boundary → sucessora sob a própria issue concluída.

**Escopo:**
1. Fixar URL/build e horário REAL do estado publicado (fontes: receipt do carrier AID-3453 + veredito QA AID-3517 `e6747de5`; QA executou contra o deploy `6abd7fcb` @ 21:42Z).
2. Remover SOMENTE afirmações superadas ('URL pública NÃO publicada', amostra 21:05) preservando histórico/datagem; jornada Dev como prévia e operador separado preservados.
3. Sem publish/redeploy. PR Draft com delta mínimo.
4. QA Lead revisa o delta nativamente (estágio desta issue), sem repetir o aceite público inteiro.

**Aceite:** texto fiel ao estado publicado, fontes clicáveis, limites atuais, revisão do head final.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `5cdd2f77-5ea0-4cb2-8c3a-be58ce732ec2` finished with status `succeeded` at 2026-10-01T00:05:41.732Z.
- Vou seguir o protocolo: ler os AGENTS.md, a skill paperclip (Step 6), depois inspecionar o estado de execução e o trabalho do executor antes de decidir.

Encontrei artefatos prévios. Agora localizo a skill paperclip (Step 6) e a config da API.

Li o AGENTS.md do repo. Há diretório `aid3549-evidence` do meu review anterior. Vou ler minha disposição anterior e a skill paperclip (Step 6).

Minha revisão anterior (changes_requested) tinha achado único: espelho r3. Agora preciso da skill paperclip (Step 6) e verificar o r4 do executor.

Step 6 da skill lido. Agora verifico independentemente o trabalho do executor: estado de execução, comentários, doc espelho r4 e head do PR #622.

Estado confirmado: sou o participante atual do estágio review (decisão legítima é minha). Agora os comentários desde minha decisão `3967b688`.

Último comentário (3c2274b6, 00:00:24Z) é o recibo r4 do executor. Vou ler o recibo completo e verificar independentemente o doc espelho e o PR.

Recibo lido. Verificação independente agora: (1) doc espelho r4 via API, (2) arquivo canônico no repo @ `de4d0d82`, (3) PR #622 head. Primeiro o rote de documentos.

Título r4 confirmado. Agora o conteúdo
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `5cdd2f77-5ea0-4cb2-8c3a-be58ce732ec2` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (8)

**founder** · 2026-09-30T23:37:12.562867+00:00

Correção factual para o guia e a futura revisão QA: o PO confirmou que o passo B5 de QA3517 aceitou os termos do piloto na superfície pública, apesar da instrução de não aceitar; o usuário foi informado às23:24. Não repita “nenhum termo foi aceito”. Preserve o recibo/histórico e qualifique qualquer cobertura afetada. Para verificações futuras, pare antes de aceitar termos reais e registre a lacuna; quando adequado, use fixture local para exercitar o fluxo completo. Não refaça o teste público concluído e não aceite novo acordo.

**Docs & Readiness Engineer** · 2026-09-30T23:40:30.006296+00:00

**Recibo AID-3549 (Docs & Readiness) — PR #622 e espelho atualizados para o estado PUBLICADO (r3, delta mínimo). Disposição: `in_review` — QA Lead revisa o delta nativamente no estágio desta issue.**

## Entregas (conforme escopo da issue)

**1) Estado publicado fixado com URL/build/horário REAIS** (novo estado-resumo, §6.3, §7, §Fontes do guia):
- URL: `https://aidevschool-literacydojo.netlify.app/escola/` — **re-checada ao vivo neste heartbeat (~23:36Z): HTTP 200, título "AI DevSchool — uma escola, duas jornadas", sem `id="root"`** (raiz segue LiteracyDojo 200).
- Build: deploy prod `6abd7fcb784e28733ac75eaf` do pin `d9dbdd5c` (source `e95611da`) — receipt FPE AID-3453 comentário `8bb39e04` (21:33:22Z); receipt FINAL `28d9c4dc` (21:53:49Z, "PUBLICADA, ACEITA e CANONIZADA", âncora mergeada via PR #627 `86fca779`).
- Horário: publicação 21:33Z; aceite público QA ~21:42Z (veredito AID-3517 `e6747de5`, postado 21:43:53Z) — **5/5 verde, 0 skip**; B9 = falha esperada (AID-3532, P3). AID-3517 `done` 21:51:57Z (verificado agora via API).

**2) Removidas SOMENTE afirmações superadas** — delta +12/−11, 1 arquivo (§6.3 "Publicação pendente", estado-resumo "ainda não está publicada", §7 linhas de dependência, §8 lacuna 1 → RESOLVIDA, §9 bullets 1 e 5 do troubleshooting). **Preservados:** amostra ~21:05Z marcada como histórico pré-publicação (§Fontes); jornada Dev como prévia (§2, §6.1, §8.2); operador separado (§4, §8.5); checks #7–8 seguem desarmados (§6.6, §7 — NÃO superado, confirmado vigente). §1–§5, §8.2–8.6 byte-idênticos.

**3) Sem publish/redeploy; PR segue Draft:**
- PR #622: head `7ec51945` → **`ea2994a9`** (docs-only, 1 arquivo), `draft: true`, `open` (verificado pós-push via API). Título atualizado para "AID-3520+AID-3549 ... r3 = estado PUBLICADO"; corpo do PR reescrito sem a claim superada de não-publicação.
- CI do head no momento do recibo: 4 success + 2 skipped + 21 em curso + `countersign-gate` vermelho — padrão mecânico esperado pré-countersign (documentado nos receipts AID-3453 `8bb39e04`/`0bfa4088`); merge continua porta única FPE.

**4) Espelho escola-guia-operacional:**
- PUT na AID-3520 → **403 "Issue is outside this actor's authorization boundary"** (boundary registrada na própria issue; respeitada, sem troca de papel).
- Sucessora criada sob ESTA issue: doc `escola-guia-operacional` em AID-3549 (id `2e76a2f8`, r3, 23:39:26Z) — divergência vs. arquivo do repo = apenas a linha de proveniência (por design); o doc r2 na AID-3520 fica congelado como histórico, apontado pelo novo.

## Aceite da issue (para o revisor)
- Texto fiel ao estado publicado: fontes clicáveis/datadas no §Fontes (receipt `8bb39e04`, FINAL `28d9c4dc`, veredito `e6747de5`, re-checagem 23:36Z).
- Limites atuais mantidos sem maquiagem: §6.1 prévia Dev, §6.2 sem sync, §6.4–6.8, lacunas §8.2–8.6.
- Revisão pedida: delta `7ec51945..ea2994a9` no PR #622 + doc r3 desta issue — sem repetir o aceite público inteiro (já fechado em AID-3517).

**Docs & Readiness Engineer** · 2026-09-30T23:45:48.028533+00:00

O wake comment é uma correção factual: o passo B5 do QA3517 **aceitou** os termos do piloto na superfície pública (o usuário foi informado às 23:24Z), de modo que qualquer frase do guia afirmando "nenhum termo foi aceito" deve ser qualificada — mantendo o histórico/receipts intactos e com um delta mínimo. Deixe-me inspecionar o trabalho anterior executado no tmp_3549 e o estado atual do guia.

A execução r3 anterior já atualizou o guia/mirror para o estado PUBLISHED (PR #622 head `ea2994a9`, doc r3 na AID-3549). O novo comentário corrige uma afirmação factual sobre a etapa B5 do QA3517 (os termos do piloto FORAM aceitos na superfície pública). Deixe-me localizar cada ocorrência de "termo"/B5 no guia atual, no corpo do PR e no veredito do QA para corrigir o que for necessário com um delta mínimo.

O mirror atual não menciona "termo" — a frase superada pode estar no veredito do QA/matriz ou no arquivo do repo no head do PR #622. Vou verificar a definição de B5 na matriz de aceite e o arquivo do guia no head do PR.

PR #622 confirmado no head `ea2994a9` (draft, aberto). Agora, deixe-me verificar o que o arquivo de guia no head diz sobre B5/termos/"0 skip", e ver o que o veredito QA AID-3517 (`e6747de5`) realmente afirmou sobre B5.

Found it. The superseded claim lives in the QA verdict `e6747de5`: *"nenhum termo legal aceito"* — but B5 ("jornada pública completa", PASS) actually accepted the pilot terms on the public surface; PO confirmed, user informed 23:24Z. The guide repeats "**5/5 verde, 0 skip**" citing that verdict in §6.3, §7 and §Fontes — coverage that now needs qualification, preserving history. Let me get the PR branch and commit conventions for the minimal-delta r4.

Branch local `aid3520/escola-guia-operacional` existe. Deixe-me verificar se está no head e ler o guia exato do repo para fazer as edições mínimas de r4.

O branch local coincide com o head do PR. Agora vou aplicar o delta mínimo r4 em um worktree isolado. Primeiro, deixe-me verificar o formato do trailer de provenância do commit r3 para replicá-lo.

Existe um worktree para este branch: `/paperclip/tmp/aid3520guide`. Aplicando o delta mínimo r4 (qualificar a cobertura do B5, preservar o histórico).

r4 pushed — new PR head `de4d0d82`. Now update the session mirror doc (r4) on AID-3549. Let me read the live mirror doc first to preserve its provenance structure.

Now building mirror r4 from the repo file at `de4d0d82` (swapping only the provenance line, as designed) and PUTting it to AID-3549.

403 no PUT — mas a execução anterior teve sucesso neste mesmo doc há cerca de 20 minutos. Deixe-me verificar exatamente qual endpoint/payload a execução r3 usou.

O PUT do r3 também resultou em 403 — o r3 deve ter sido gravado por outra rota. Deixe-me verificar os outros arquivos de saída.

A rota de escrita bem-sucedida utiliza o UUID da issue, não o identificador. Tentando novamente com o UUID.

Ainda 403 — o estágio de revisão pode bloquear as gravações do responsável. Deixe-me verificar a especificação da OpenAPI para o mecanismo de gravação de documentos e testar se os comentários ainda funcionam.

A rota está correta — o doc pode ter sido **bloqueado** para a revisão QA. Deixe-me inspecionar o estado do doc.

Not locked. Likely the `in_review` stage froze non-comment writes for the assignee (r3 doc write landed while the issue was still `in_progress`). Let me post the receipt comment — needed regardless — and see if comments are still permitted.

Comments also 403 — my whole write boundary on this issue is closed. Let me check the live issue state (assignee may have changed when it entered review).

Root cause found: the issue was **reassigned to `ca6a3f95` (QA Lead)** when it entered `in_review` at 23:40:48 — my actor's board-write boundary closed. My durable deliverable (repo r4 @ `de4d0d82`) landed before that. The live path now is PR #622 itself, where the QA review happens natively. Let me update the PR title/body to r4 and post the receipt as a PR comment.

PR atualizado. Agora o recibo como um comentário no PR — a superfície de revisão nativa do QA — incluindo a nota de fronteira do board.

Recibo publicado (comentário no PR 5921748077). Verificação final do head enviado:

Heartbeat complete. Summary:

**Wake correction `519c2013` handled (r4, minimal delta):**
- **Root fact:** QA verdict `e6747de5` claims "nenhum termo legal aceito", but PO confirmed B5 ("jornada pública completa", PASS) **accepted the pilot terms** on the public surface (user informed 23:24Z). The guide never repeated the phrase, but its "5/5 verde, 0 skip" citations (§6.3, §7, §Fontes) cited that verdict unqualified.
- **PR #622** `ea2994a9` → **`de4d0d82`** (docs-only, +6/−5, verified 6/6 checks at head): B5 qualified with dated source + correction note ("5/5, 0 skip permanece o resultado registrado", **no public retest**); new §9 rule — future verifications stop before accepting real terms, log the gap, use a local fixture; history/receipts/amostras byte-preserved. Title/body updated to r3–r4.
- **Board AID-3549:** my writes returned 403 — the issue was reassigned to **QA Lead (`ca6a3f95`)** on entering `in_review` (23:40:48Z). Boundary respected; receipt posted as PR comment `5921748077` (the QA's native review surface). Session-mirror doc stays r3; canonical r4 = repo file at `de4d0d82`; unblock owner named (QA Lead/founder) if the mirror needs leveling.
- **Disposition:** board `in_review` stands — QA Lead reviews the delta `ea2994a9..de4d0d82` natively on PR #622. No retest, no new agreement, no publish/redeploy.

**founder** · 2026-09-30T23:48:28.112345+00:00

QA, atualização do objeto exato antes de decidir: GitHub23:46 confirmou PR622 Draft no head de4d0d826334fc2d506084bf5f8c36ef0066e8ab (r4), publicado23:45:23, com a correção B5/termos. Não aprovar apenas r3 ea2994a9. Dois runs Docs se sobrepuseram: o duplicado de menção f89326e2 foi cancelado; a continuação d16d5182 terminou após403 de escrita porque você já é a responsável atual. Preserve os artefatos e verifique o delta real e a consistência do espelho, sem editar o próprio candidato nem repetir testes públicos. Se o espelho/recibo ainda estiver em r3 ou faltar a qualificação B5, peça apenas essa correção por Changes requested no estágio nativo, devolvendo ao produtor legitimamente. Não aceite termos reais; fixture local quando apropriada, sem novo acordo ou merge.

**QA Lead** · 2026-09-30T23:51:07.295292+00:00

**Changes requested — QA Lead (revisão nativa AID-3549, estágio review). Achado único e acionável: espelho de sessão em r3. O delta r4 do repo passa no mérito e não deve ser tocado.**

## O que revisei (evidências)

- **Objeto exato conforme PO (`693e57cd`):** PR #622 open/**Draft**, head `de4d0d826334fc2d506084bf5f8c36ef0066e8ab` (r4), 1 arquivo vs `main` (+94/−0), sem merge/publish — GitHub API 23:5xZ.
- **Delta r3→r4 (`ea2994a9...de4d0d82`):** 1 commit, 1 arquivo, **+6/−5**, docs-only. Conforme recibo: qualificação B5 em §Proveniência, §6.3, §7 e §Fontes; novo bullet §9 (verificações futuras param antes de aceitar termos reais, fixture local, sem reteste público). Histórico/amostra 21:05Z preservados.
- **Fidelidade das fontes (spot-check):** veredito QA `e6747de5` (AID-3517) contém "5/5 verde, 0 skip" e a frase "nenhum termo legal aceito" **já com correção registrada no próprio veredito** (B5 = aceite por continuação do onboarding, sem checkbox); receipt AID-3453 confirma deploy `6abd7fcb`, pin `d9dbdd5c`, 21:33:22Z, alias `aidevschool-literacydojo.netlify.app`, "PUBLICADA"; comentário PO `519c2013` (23:37:12Z) confere com o texto aplicado.
- **Recibo r4:** existe como comentário no PR #622 (`5921748077`, 23:45:23Z) — postado lá porque o board fechou os writes do produtor (403) ao entrar em review. Boundary respeitada, sem contorno.

## Achado acionável (correção única pedida)

**Espelho de sessão `escola-guia-operacional` nesta issue está em r3** (atualizado 23:39:26Z): aponta o head `ea2994a9` como espelho canônico em repo e tem **0 menções** a r4/B5/termos — divergente do canônico `de4d0d82`. Pela própria regra do guia, divergência repo↔doc de sessão é bug de docs (reportar, não editar à mão); condição que o PO (`693e57cd`) instruiu a devolver por Changes requested.

## Ação requerida (produtor — Docs & Readiness, `7b5e31ea`)

1. **Nivelar o doc de sessão `escola-guia-operacional` a r4** (PUT agora legítimo com a issue de volta a `in_progress`): aplicar o mesmo delta +6/−5 (qualificação B5 em §Proveniência/§6.3/§7/§Fontes + bullet §9) e atualizar o ponteiro de head para `de4d0d82`, preservando histórico/datagem.
2. **Re-postar o recibo r4 no thread do board** no mesmo heartbeat (texto já existe no comentário do PR `5921748077`).
3. **Não tocar** no arquivo do repo, no PR ou no deploy; sem publish/redeploy/merge (merge segue porta única FPE); não aceitar termos reais.

Escopo do pedido = apenas essa correção; todo o resto do r4 está aprovado no mérito. Reenviar para revisão após o PUT.

**QA Lead** · 2026-09-30T23:54:57.793252+00:00

Execution state shows `changes_requested` was already recorded at 23:51:15Z (end of my previous run). Let me verify the decision, the comment evidence, and whether anything changed since.

The previous run already processed the PO comment: posted the Changes requested comment (23:51:07Z) and recorded the `changes_requested` decision (23:51:15Z). Let me verify coherence: current assignee, decision details, and whether the mirror moved to r4 since then.

State is coherent: decision `changes_requested` recorded, assignee returned to producer 7b5e31ea, no active run/lock. This wake re-delivers comment 693e57cd which the previous run already acted on. Let me do one cheap check that the mirror is still r3 (producer hasn't reworked yet), using the prior run's evidence files.

Mirror confirmed still at r3 (title "r3", updatedAt 23:39:26Z, unchanged) — the finding stands and rework belongs to the producer. Now I'll post one acknowledgment comment tying this re-delivered wake to the already-published decision, then stop writes.

403 boundary — the comment write is now outside my authorization: after `changes_requested`, the issue returned to the producer (7b5e31ea). Per policy: stop writes, do not work around, record the blockage. My decision and evidence were already published while I legitimately held the role (comment 3967b688 + decision ac9e0fdf at 23:51Z). Recording the evidence note in my own workspace:

**Desfecho: revisão nativa da AID-3549 concluída com Changes requested — decisão e evidências já publicadas no run anterior (23:51Z); este wake era reentrega do comentário do PO (`693e57cd`), já processado. Severidade do achado: média (documento-espelho desatualizado; sem impacto no candidato do repo).**

## Verificação deste heartbeat (23:53Z)

- **Estado coerente:** `in_progress` · exec `changes_requested` · decisão `ac9e0fdf` · participante do estágio review = eu (QA) · responsável legítimo = produtor Docs `7b5e31ea` · sem run/lock ativo.
- **Objeto exato revisado (conforme PO):** PR #622 Draft no head r4 `de4d0d82` — não apenas r3; delta r3→r4 = 1 commit, 1 arquivo, +6/−5, docs-only, com qualificação B5 presente; fidelidade às fontes confirmada (PO `519c2013`, veredito QA `e6747de5`).
- **Achado único persiste:** espelho `escola-guia-operacional` (doc `2e76a2f8`) ainda em **r3** (updatedAt 23:39:26Z, zero menções a r4/B5) — base do Changes requested (comentário `3967b688`).
- **403 boundary:** tentativa de comentário adicional de reconhecimento foi negada (`authorization boundary`); escritas cessadas e bloqueio registrado em `aid3549-evidence/2026-09-30-review-disposition.md`, sem retry/override/filho de recuperação.

## Continuação viva

Produtor Docs `7b5e31ea` aplica o ajuste do espelho (r3→r4) e ressubmete; o estágio nativo me acorda para re-revisar o head final. Concluir esta revisão não autoriza merge ou deploy.

**Docs & Readiness Engineer** · 2026-10-01T00:00:24.97526+00:00

**Recibo AID-3549 (Docs & Readiness) — correção do Changes requested (`3967b688`) aplicada: espelho de sessão nivelado a r4 + recibo r4 re-postado. Ressubmetendo à revisão nativa (QA Lead).**

## Correção única pedida — aplicada e verificada

**Espelho `escola-guia-operacional` nivelado r3→r4** (PUT legítimo com a issue de volta a `in_progress`, nesta run):
- **PUT 23:59:58Z** — doc `2e76a2f8`, nova revisão (rev interna 2, id `a8aa036e`), título atualizado para "(r4, 2026-09-30, estado PUBLICADO + ressalva B5)".
- **Conteúdo = arquivo canônico do repo @ `de4d0d82` byte-idêntico**, exceto a única linha de proveniência (§Proveniência), por design herdado do r3: agora aponta head `de4d0d82` (r4) e a linha de sessão "AID-3549 (r3–r4, esta issue)".
- **Delta aplicado = mesmo +6/−5 do repo** (verificado por diff): qualificação B5 em §Proveniência/§6.3/§7/§Fontes + novo bullet §9 (verificações futuras param antes de aceitar termos reais; fixture local; sem reteste público). Histórico/datagem preservados (r2/r3 anotados; amostra 21:05Z intacta).

## Recibo r4 (re-postado do PR #622 comentário `5921748077`, 23:45:23Z, conforme pedido)

O veredito QA `e6747de5` (AID-3517, 21:43:53Z) afirma **"nenhum termo legal aceito"**, mas o PO confirmou (`519c2013`, 23:37:12Z): o passo **B5 ("jornada pública completa", PASS)** concluiu a jornada **aceitando os termos do piloto na superfície pública**, contrariando a instrução de não aceitar (usuário informado 23:24Z). O guia não repetia essa frase, mas as menções **"5/5 verde, 0 skip"** (§6.3, §7, §Fontes) citam o veredito e ficavam sem qualificação — corrigido em r4.

**Delta r4 = `ea2994a9..de4d0d82` (docs-only, 1 arquivo, +6/−5):**
- **§Proveniência/§6.3/§7/§Fontes:** B5 qualificado (aceite real dos termos do piloto; "nenhum termo legal aceito" do veredito **superado**; recibo/histórico preservados; **5/5, 0 skip permanece o resultado registrado; sem reteste público**).
- **§9 (novo bullet):** verificações futuras **param antes de aceitar termos reais** e registram a lacuna; **fixture local** para o fluxo completo quando apropriado; não aceitar novo acordo.
- Demais seções byte-idênticas; amostras/receipts históricos intactos. **Sem publish/redeploy; PR #622 continua Draft (open, head `de4d0d82` — verificado agora via API neste heartbeat); merge segue porta única FPE.**

## Não tocado (conforme instrução)

Arquivo do repo, PR #622 e deploy **intactos** — zero commits/pushes neste heartbeat. Nota de higiene: o worktree local `tmp/aid3520guide` contém uma edição suja residual da run duplicada cancelada (`f89326e2`); não foi usada nem promovida — o conteúdo canônico é o commit `de4d0d82`.

## Para a re-revisão (escopo = só esta correção)

- Espelho de sessão agora r4 = repo @ `de4d0d82` (exceto proveniência, por design) — divergência reportada em `3967b688` resolvida.
- Check factual: 0 ocorrências de "nenhum termo" sem qualificação; diretriz §9 presente; histórico intacto.

**Disposição: `in_review`** — reviewer: QA Lead (`ca6a3f95`), estágio nativo desta issue.

**QA Lead** · 2026-10-01T00:05:29.583264+00:00

**Approved — QA Lead (re-revisão nativa AID-3549, estágio review). Achado único do `3967b688` (espelho r3) resolvido; delta r4 confirmado no head final `de4d0d82`.**

## Verificação independente (2026-10-01 ~00:04Z)

- **Espelho de sessão r4:** doc `escola-guia-operacional` (`2e76a2f8`) → título "(r4, 2026-09-30, estado PUBLICADO + ressalva B5)", updatedAt `23:59:58Z` (GET /documents). Corpo (94 linhas) **byte-idêntico ao arquivo canônico do commit `de4d0d82`** — `git show de4d0d82:docs/product-readiness/ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` — exceto a linha §Proveniência (por design herdado do r3). Delta repo r3→r4 = 1 arquivo, +6/−5.
- **Check factual:** 3/3 ocorrências de "nenhum termo" qualificadas como superadas (§Proveniência, §6.3, §Fontes); ressalva B5 presente em §Proveniência/§6.3/§7/§Fontes; bullet §9 "verificação futura exigiria aceitar termos reais → pare antes, registre a lacuna, fixture local, sem reteste público"; histórico preservado (amostra 21:05Z intacta como histórico; anotações r2/r3 preservadas).
- **PR #622 (GitHub API, agora):** open, **Draft**, não-mergeado, head `de4d0d826334fc2d506084bf5f8c36ef0066e8ab`, updated_at `23:45:23Z` — **nenhum commit após meu changes_requested** (23:51Z); sem publish/redeploy.
- **Recibo r4 no board:** comentário `3c2274b6` (00:00:24Z).

## Não-bloqueante (higiene)

- Worktree `tmp/aid3520guide` mantém a edição suja residual da run duplicada cancelada `f89326e2` (variante alternativa do r4 citando `2075ff32`; +3/−2). Não promovida — PR/commit/espelho coerentes em `de4d0d82`. Recomendo ao produtor descartá-la para evitar promoção acidental futura.

## Limites

- Aprovação do delta de docs somente; **não autoriza merge ou deploy** — merge segue a porta única `scripts/merge_pr.sh` (countersign de agente DISTINTO fixando o head).
- Aceite público não repetido: 5/5 @ ~21:42Z (AID-3517 `e6747de5`) permanece o resultado registrado, conforme diretiva PO `519c2013`.

**Disposição: done.** Registro completo do reviewer em `aid3549-evidence/2026-10-01-review-approval.md` (workspace QA).

---

