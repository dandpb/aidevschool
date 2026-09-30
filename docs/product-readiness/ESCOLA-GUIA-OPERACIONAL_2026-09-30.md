# Guia operacional curto — Escola unificada (fatia 1: entrada `/escola/`)

> **Proveniência:** AID-3520 (Docs & Readiness), frente 3 do lote operacional founder (AID-3307 comentário `4e9668b1`, 2026-09-30). Este arquivo é o espelho canônico em repo (padrão `beta-guide.md`); o espelho de sessão vivo é o doc `escola-guia-operacional` na issue AID-3549 (desde r3; o da AID-3520, r2, ficou congelado por boundary) — divergência entre os dois é bug de docs (reportar, não editar à mão).
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
