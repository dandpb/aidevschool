# Guia operacional curto — Escola unificada (fatia 1: entrada `/escola/`)

> **Proveniência:** AID-3520 (Docs & Readiness), frente 3 do lote operacional founder (AID-3307 comentário `4e9668b1`, 2026-09-30). Este arquivo é o espelho canônico em repo (padrão `beta-guide.md`); o doc `escola-guia-operacional` na issue AID-3520 é o espelho de sessão — divergência entre os dois é bug de docs (reportar, não editar à mão).
> **Verificado em:** 2026-09-30 (checagens ao vivo ~21:05Z; merge PR #616 20:54:18Z). Cada claim cita fonte em §Fontes.
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

## Fontes (data + caminho)

- Código da entrada (aceito no `main` @ `e95611da`, PR #616 merge 2026-09-30T20:54:18Z): `engines/literacyDojo/public/escola/index.html` (título l14; skip-link l19; ponte noscript l98; retomada l113-128; footer l131; noscript l146); `escola.js` (cabeçalho de porta l1-7; CTA `/` l53; reduced-motion l126-129; foco l107-118); `entry-contract.js` (contrato `SCHOOL_ENTRY` verbatim l6-71; `preview:true` l48; ponte l50-68).
- Gate de honestidade (10 testes, allowlist de hrefs, read-only): `engines/literacyDojo/tests/static-entry/escola-honesty.test.ts` (PR #616).
- Serving: `docs/serving/README.md` (superfícies l12-17; fronteira invariável l50-53); `docs/serving/UPTIME-MONITOR-SETUP.md` (checks 7-8 l32-33); `docs/serving/PROMOTION-RUNBOOK.md`.
- Operador separado: `engines/school-entry/README.md` (l1-3, l40; PR #615 draft).
- PR #616: https://github.com/dandpb/aidevschool/pull/616 (aceite em `vite build`+`vite preview`, perfil fresco; screenshots anexados ao review).
- Checagens ao vivo (curl, 2026-09-30 ~21:05Z): `/escola/` → 200 com título "LiteracyDojo — IA com confiança no trabalho" (shell SPA, entrada NÃO publicada); `/escola/escola.js` → 200 (asset serve, mas sem a página da rota); raiz `/` → 200 LiteracyDojo vivo.

*Não recria a triagem v99 (encerrada em AID-3067). Sem novas contas/outreach.*
