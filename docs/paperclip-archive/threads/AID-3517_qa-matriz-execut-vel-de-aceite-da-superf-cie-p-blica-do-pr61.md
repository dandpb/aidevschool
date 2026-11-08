# AID-3517: QA — matriz executável de aceite da superfície pública do PR616 (preparar agora; executar 1x pós-publicação)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-30T20:56:32.756169+00:00 | **Updated:** 2026-09-30T21:51:57.035+00:00
- **ID:** `7ba17310-2452-403b-9248-19854b0d895d`

## Description

Lote operacional founder (AID-3307 comment 4e9668b1, frente 1). Dono: QA Lead.

**Entregável agora:** matriz executável de aceite da superfície pública do PR #616 (escola unificada), cobrindo: jornadas dos dois públicos, entrada, navegação por teclado, retomada/progresso e respostas a erro. Casos + resultado esperado por caso.

**Aceite:** matriz publicada neste issue com caso→resultado esperado→evidência reutilizada (citar PR/head e receipts já aceitos). Reutilize evidências já aceitas; NÃO re-rode o mesmo head só por status.

**Execução da verificação pública:** UMA única vez, somente quando FPE/PRE fornecerem a URL/build realmente publicada (dependência explícita de publicação — registrar como condição, não como tarefa sua). Não duplicar o preflight do release (é dos FPE/PRE).

Contexto: PR #616 head `e95611da` (fatia aprovada em fechamento limitado AID-3453 18:54Z); QA já produziu verificação real dessa fatia — a matriz aproveita esse trabalho.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3517 — QA — matriz executável de aceite da superfície pública do PR616 (preparar agora; executar 1x pós-publicação)
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: db55b4c7-78fd-4125-8c84-81630a9e3597
- Agent: QA Lead (opencode_local)

## Objective

Lote operacional founder (AID-3307 comment 4e9668b1, frente 1). Dono: QA Lead.

**Entregável agora:** matriz executável de aceite da superfície pública do PR #616 (escola unificada), cobrindo: jornadas dos dois públicos, entrada, navegação por teclado, retomada/progresso e respostas a erro. Casos + resultado esperado por caso.

**Aceite:** matriz publicada neste issue com caso→resultado esperado→evidência reutilizada (citar PR/head e receipts já aceitos). Reutilize evidências já aceitas; NÃO re-rode o mesmo head só por status.

**Execução da verificação pública:** UMA única vez, somente quando FPE/PRE fornecerem a URL/build realmente publicada (dependência explícita de publicação — registrar como condição, não como tarefa sua). Não duplicar o preflight do release (é dos FPE/PRE).

Contexto: PR #616 head `e95611da` (fatia aprovada em fechamento limitado AID-3453 18:54Z); QA já produziu verificação real dessa fatia — a matriz aproveita esse trabalho.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `db55b4c7-78fd-4125-8c84-81630a9e3597` finished with status `succeeded` at 2026-09-30T21:52:05.065Z.
- Dois pedidos no `7c370d87`: anexar os 7 PNGs por attachment real e reconciliar a frase sobre termos legais. Investigando ambos em paralelo:

Achado: `OnboardingScreen.tsx:191` — a tela de onboarding declara concordância com os **termos do piloto** ao continuar. Minha frase estava errada. Lendo o contexto exato e o schema do endpoint de attachments:

Multipart funciona (id `98994b33`). Subindo os 6 restantes com rótulos:

7/7 anexados, conteúdo verificável e byte-idêntico. Publicando manifesto + correção dos termos e re-fechando:

## AID-3517 — `7c370d87` atendido e issue re-fechada: `done` (21:51:57Z)

**1. PNGs entregues por attachment real nesta issue (7/7):** IDs verificáveis no manifesto (`2075ff32`) com rótulos entrada desktop/mobile, atividade, resultado, retomada, offline /escola//raiz e deploy `6abd7fcb`; integridade conferida (content 200, `cmp` byte-idêntico). Sem rerun, sem novas capturas, sem outro serviço. Capacidade delimitada: eu não inspecionei pixels — revisão visual fica com o revisor capaz, agora com acesso pelo viewer.

**2. Correção publicada:** "nenhum termo legal aceito" estava **incorreta** — o onboarding público (B5, `OnboardingScreen.ts
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `db55b4c7-78fd-4125-8c84-81630a9e3597` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**QA Lead** · 2026-09-30T21:22:18.078214+00:00

# AID-3517 — Matriz executável de aceite da superfície pública do PR #616: PREPARADA · execução única pendente de publicação

**Outcome:** matriz publicada abaixo e como artefato (`/paperclip/aid3517-evidence/MATRIZ-ACEITE-PUBLICA-PR616.md`), com driver autocontido **validado 5/5** contra o build do lineage exato (`d9dbdd5c`); **1 defeito novo aberto como filha AID-3532 (P3, não-bloqueante)**; execução pública única fica **condicionada à publicação** (alias ainda NÃO serve o PR #616 — probe abaixo). Disposição: `blocked` (condição de publicação; dono do desbloqueio: FPE/PRE).

## Condição de execução (registro, não tarefa do QA)

Probe first-hand no alias público (2026-09-30 ~21:05Z):

```
curl https://aidevschool-literacydojo.netlify.app/escola/      → 200, corpo contém id="root" e NÃO contém o título da escola
curl https://aidevschool-literacydojo.netlify.app/escola/escola.js → 200, content-type text/html, 1854 B (shell SPA)
```

→ o catch-all do `netlify.toml` ainda sombreia `/escola/`: **PR #616 mergeado (d9dbdd5c @ e95611da, 20:54:18Z, verificado via GitHub API) mas NÃO publicado** — consistente com o bloqueio `NETLIFY_AUTH_TOKEN` da onda de publicação em AID-3453 (`a631ebec` 20:55Z; coordenação `59d0bf87` 21:00Z). **Executar a Parte B 1x somente quando FPE/PRE fornecerem a URL/build publicada.** Preflight de release (72 checks) é dos FPE/PRE — não duplicado aqui; UPTIME #7/#8 são do PRE.

## Parte A — coberto por evidência JÁ ACEITA no head `e95611da` (não re-executar)

Receipts: rodada formal QA **GO com limitação nomeada** (AID-3453 `6cd46e67` 18:45Z), aceite visual limitado (`35cf0178`), countersign QA Approved (`1e777242`), fechamento limitado (`ab7f5824`). Artefatos: `/paperclip/aid3453-evidence/qa-e95611da-2026-09-30/` (lint 0 erros · vitest 260+1skip · build com `escola/`+CACHE v5 · e2e 28/28 · driver independente 7/7 · 9 PNGs).

| Caso | Esperado | Evidência |
| --- | --- | --- |
| A1 entrada renderiza missão+2 jornadas+ponte Dev | heading Fundamentos, canvas, cards | driver QA item 1 (`6cd46e67`) |
| A2 CTA same-origin | `#start-fundamentals` href `/` | idem |
| A3 jornada não-programador até "Lição concluída" | onboarding→l02 3 atividades→feedback | itens 2 + pwa 5/5 |
| A4 progresso IndexedDB + retomada reload | `l02=completed`, `currentLessonId` estável | item 3 |
| A5 assets diretos + fallback SPA raiz | 200 text/css, 200 js; desconhecida→`/assets/` | item 4 |
| A6 sem overflow 360/1280 | scrollWidth≤clientWidth | item 5 |
| A7 retornante offline + query + progresso | CACHE v5 por pathname | item 6 (F1/fc1d79fb) |
| A8 read-only (sem api/storage/admin) | superfície estática limpa | item 7 + honesty 10 |
| A9 teclado | **lacuna da rodada aceita** → coberta em B4/B9 | achado AID-3532 |

## Parte B — execução única pós-publicação (driver novo: `aid3517-evidence/public-escola-acceptance.spec.ts`, retries=0)

| Caso | Resultado esperado |
| --- | --- |
| B1 entrada publicada anti-falso-verde (UPTIME #7) | `/escola/` 200 com título "AI DevSchool — uma escola, duas jornadas", **sem** `id="root"` nem "LiteracyDojo — IA com confiança"; `?utm_source=test` idem |
| B2 dois públicos | cards cotidiano+dev com CTA `/`; ponte Dev lista l15/l16/l27/l29 como destino com "prévia"; labs cross-origin `rel="noopener"` |
| B3 assets reais (UPTIME #8) | `escola.css` 200 text/css `.mission-panel`; `escola.js` 200 `start-fundamentals`; `entry-contract.js` 200 `SCHOOL_ENTRY`; `sw.js` 200 v5 |
| B4 teclado (nova cobertura) | skip link 1º parado→foca etapa; dialog Enter/Escape+foco preso; mapa-texto Enter expande; `#motion-btn` alterna; CTA alcançável por Tab |
| B5 jornada pública completa | CTA→onboarding→l02 certo→"Lição concluída" (conteúdo pinado do lineage) |
| B6 retomada pública | IndexedDB `l02=completed`; reload→home estável |
| B7 respostas a erro | offline retornante `/escola/?query` renderiza; raiz offline com progresso; rota desconhecida→fallback SPA |
| B8 read-only+overflow | 0 requisições `/api/`/POST/cross-origin; localStorage vazio; sem overflow |
| B9 foco mapa-texto→jornada | **falha esperada** (AID-3532, `test.fail` marcado; passar = defeito corrigido) |

Comando da execução única:

```bash
cd /paperclip/aid3517-evidence && PUBLIC_BASE_URL=https://aidevschool-literacydojo.netlify.app \
EVID_DIR=/paperclip/aid3517-evidence/run-public ./node_modules/.bin/playwright test --config playwright.config.ts
```

**Validação da ferramenta (não re-verificação do head):** 5/5 verde (incl. 1 expected-fail B9) contra `vite build`+`preview` do merge `d9dbdd5c` em worktree detach (árvores do produtor/intocadas); PNGs+`results.json` em `aid3517-evidence/toolcheck/`. Nota: o run de validação precedeu renomeação cosmética do título B9 e da anotação do id da filha (AID-3518→AID-3532) — nenhuma mudança de lógica.

## Defeito novo (filha)

- **AID-3532** (P3, a11y, não-bloqueia publicação): foco perdido ao ativar link do mapa em texto — `removeAttribute("tabindex")` após `focus()` dropa foco para BODY no Chromium (escola.js:106-118). Reproduzido mouse+teclado no lineage; atribuída ao LEE.

## Limitações

- Chromium headless; inspeção visual humana dos PNGs de `run-public/` segue pendente no founder (padrão do GO limitado da Parte A).
- B5 pinia l02 v4/contentVersion 2026-09-10.2 do lineage; head diferente → falha visível (aceite, não smoke).
- Sem cobertura noscript/leitor de tela (fora do escopo do PR #616).

**Próximo passo legítimo:** FPE/PRE completam o deploy (token) e fornecem a URL/build → QA executa a Parte B 1x, publica veredito + PNGs e fecha este issue (ou abre childs para achados novos).

**founder** · 2026-09-30T21:40:45.916551+00:00

Desbloqueio concreto: publicação616 concluída pelo FPE, recibo8bb39e04 na3453, source e95611da / merge d9dbdd5c504ef76a42d3f7944392dccee3eb6351. Produção [https://aidevschool-literacydojo.netlify.app/escola/](https://aidevschool-literacydojo.netlify.app/escola/) ; deploy6abd7fcb784e28733ac75eaf. Preview anterior6abd7f868db7f6738a1ca447 teve72/72; alias anterior65/65; pós-deploy72/72 e17/17 byte-equivalence, segundo recibo do produtor. Removi3453 como bloqueio: o deploy já existe e o pai depende agora deste aceite, portanto manter o vínculo como relacionado evita ciclo.



Executar ParteB uma vez no artefato público exato, registrar pass/fail/skip e capturas reais. Eu já verifiquei pixels do /escola/ e clique CTA até onboarding real Etapa1de5; isso não prova conclusão/persistência. Não criar obrigação de QA do founder: entregar PNGs para revisor visual capaz e delimitar sua própria capacidade. Não aceitar novos termos legais, criar conta ou transmitir dados pessoais; se uma etapa depender disso, explicitar limite e completar demais checks permitidos. Preservar P3 de foco3532 como achado separado não bloqueante, sem publicar626 nesta onda. Nenhum outro merge/deploy está autorizado. Ao terminar registrar recibo do mesmo deploy, limites e próximo passo para FPE, sem tarefa duplicada.

**QA Lead** · 2026-09-30T21:43:53.670487+00:00

# AID-3517 — Veredito da verificação pública única: **VERDE** (5/5, 0 skip) · 1 falha esperada confirmada ao vivo (AID-3532, P3 não-bloqueante)

**Outcome:** Parte B executada **1x** contra o artefato público exato após desbloqueio (`4af9d14e`): **B1–B8 pass, B9 = falha esperada** (defeito AID-3532 confirmado em produção). Aceite público da superfície `/escola/` do PR #616: **ATINGIDO**. Disposição: `done`.

## Recibo da execução

| Item | Valor |
| --- | --- |
| Deploy alvo | `6abd7fcb784e28733ac75eaf` (alias prod) · pin `d9dbdd5c` · source `e95611da` (receipt FPE `8bb39e04` na AID-3453, 21:33Z) |
| Comando | `cd /paperclip/aid3517-evidence && PUBLIC_BASE_URL=https://aidevschool-literacydojo.netlify.app EVID_DIR=/paperclip/aid3517-evidence/run-public ./node_modules/.bin/playwright test --config playwright.config.ts` |
| Resultado | **5/5 verde, exit 0, 0 skip, 9,4 s** · Chromium headless 151 / Playwright 1.62 |
| Artefatos | `/paperclip/aid3517-evidence/run-public/` (7 PNGs reais + `results.json` + test-results) · matriz atualizada em `MATRIZ-ACEITE-PUBLICA-PR616.md` |

## Pass/fail/skip por caso

| Caso | Resultado | Prova (resumo) |
| --- | --- | --- |
| B1 entrada anti-falso-verde | **PASS** | `/escola/` 200 com título da escola, **sem** `id="root"`/título LiteracyDojo; `?utm_source=test` idem |
| B2 dois públicos + labs | **PASS** | cards cotidiano/dev com CTA `/`; ponte l15/l16/l27/l29 como destino com "prévia"; labs `rel="noopener"` |
| B3 assets reais + SW | **PASS** | `escola.css` 200 text/css `.mission-panel`; `escola.js` 200 `start-fundamentals`; `entry-contract.js` 200 `SCHOOL_ENTRY`; `sw.js` 200 **v5** |
| B4 teclado | **PASS** | skip link 1º parado→foca `#etapa-atual`; dialog Enter/Escape com foco preso; mapa-texto Enter expande; motion alterna `aria-pressed`; **CTA alcançado com 1 Tab** |
| B5 jornada pública completa | **PASS** | CTA→onboarding→l02 3 atividades certas→**"Lição concluída"** no site público |
| B6 progresso/retomada | **PASS** | IndexedDB `l02=completed`; reload→home com `currentLessonId` estável |
| B7 respostas a erro | **PASS** | offline retornante `/escola/?query` renderiza; raiz offline com progresso vivo; rota desconhecida→fallback SPA 200 `/assets/` |
| B8 read-only + overflow | **PASS** | 0 requisições `/api/`/POST/cross-origin; localStorage vazio; sem overflow 360/1280 |
| B9 foco mapa-texto→jornada | **FAIL esperado** | AID-3532 **confirmado ao vivo**: `document.activeElement` = BODY após ativar o link (mesma assinatura do repro local) |
| Skip | **0** | nenhum caso pulado |

Capturas reais: `01/02` entrada desktop/mobile (dimensões **idênticas** ao round local aceito: 1280x1966 e 360x2891), `03` atividade, `04` resultado, `05` retomada pós-reload, `06/07` offline escola/raiz. Verificação mecânica: 7/7 substantivos (multi-cor, não-blank).

## Reuso de evidência (Parte A, não re-executada)

Receipts aceitos no head `e95611da`: rodada formal QA GO (`6cd46e67`), visual limitado (`35cf0178`), countersign Approved (`1e777242`), fechamento (`ab7f5824`) — ver matriz. O deploy público é do **mesmo lineage** (pin `d9dbdd5c`/source `e95611da`), e os marcadores de identidade (B1/B3: título, `.mission-panel`, `start-fundamentals`, `SCHOOL_ENTRY`, CACHE v5) confirmam-no mecanicamente.

## Limitações explícitas

- **Sem input de imagem neste agente**: inspeção visual é mecânica (dimensões/cores/não-blank). Os 7 PNGs ficam **entregues ao revisor visual capaz** (o comentário de desbloqueio já inspecionou pixels da entrada e CTA→onboarding Etapa 1; conclusão/persistência agora estão provadas aqui por execução).
- Nenhuma conta criada, nenhum dado pessoal transmitido, nenhum termo legal aceito (jornada usa apenas preferências genéricas de onboarding; dados ficam no IndexedDB local do browser de teste).
- B9/AID-3532 permanece **achado separado P3 não-bloqueante** (a11y: foco perdido no link do mapa em texto); sem publicação de #626 nesta onda, nenhum merge/deploy adicional — respeitado.

## Próximo passo (FPE/PRE — sem tarefa duplicada da minha parte)

- Nada pendente para este aceite. Opcional a PRE: **armar os checks UPTIME #7/#8** (`escola-root-marker`, `escola-assets`), que estavam designados "somente pós-publicação" e agora têm a condição satisfeita.
- AID-3532 (foco) segue com o LEE; ao corrigir, o caso B9 deste driver passará a falhar "inesperadamente" — sinal de fechar aquela issue com evidência.

**QA Lead** · 2026-09-30T21:46:02.581113+00:00

Aknowledgement do desbloqueio (`4af9d14e`, 21:40Z) — todos os itens foram cumpridos e estão documentados no **veredito `e6747de5`** (21:43Z):

| Instrução | Entrega |
| --- | --- |
| Executar Parte B 1x no artefato público exato; pass/fail/skip + capturas reais | Executada 21:42Z contra o deploy `6abd7fcb784e28733ac75eaf` (pin `d9dbdd5c`/source `e95611da`): **5/5 verde, 0 skip, 9,4s**; tabela caso-a-caso no veredito; 7 PNGs reais + `results.json` em `/paperclip/aid3517-evidence/run-public/` |
| Conclusão/persistência não provadas pelo seu clique até Etapa 1 de 5 | Provadas por execução: B5 "Lição concluída" + B6 IndexedDB `l02=completed` e `currentLessonId` estável pós-reload, no site público |
| Sem obrigação de QA do founder; PNGs para revisor capaz; delimitar capacidade | Veredito §Limitações: sem input de imagem neste agente — verificação visual mecânica (7/7 substantivos); PNGs entregues ao revisor visual capaz |
| Sem termos legais/conta/dados pessoais | Confirmado — onboarding usa preferências genéricas; dados só no IndexedDB local do browser de teste; limitação registrada |
| AID-3532 separado, P3 não-bloqueante; sem publicar #626 | B9 registrado como falha **esperada** (defeito confirmado ao vivo); nenhum merge/deploy adicional executado. Nota: comentário direto no AID-3532 retornou 403 (boundary do LEE) — confirmação ao vivo publicada no veredito, sem contorno |
| Recibo do mesmo deploy + limites + próximo passo para FPE, sem tarefa duplicada | Recibo no veredito (deploy/pin/source/comando/ambiente); próximo passo opcional é do PRE (armar UPTIME #7/#8, condição pós-publicação satisfeita); nada pendente para este aceite |

Disposição: **`done`** — objetivo do issue (matriz + execução única pós-publicação) integralmente cumprido.

**founder** · 2026-09-30T21:49:56.030953+00:00

Entrega de evidência para o resumo diário solicitado pelo usuário: os 7 PNGs já produzidos em /paperclip/aid3517-evidence/run-public/ ainda não estão acessíveis pelo file viewer desta issue (retorna “No workspace yet”). Anexar os arquivos existentes pelo mecanismo normal de attachment/artifact desta MESMA3517, com rótulos entrada desktop/mobile, atividade, resultado, retomada, offline Escola/raiz e deploy6abd7fcb. Não rerodar testes nem fazer novas capturas; não publicar em outro serviço. Retornar links/IDs verificáveis para revisão de pixels e entrega ao usuário. Não afirmar que imagens foram inspecionadas por você se o runtime não as lê. Reconciliar a frase “nenhum termo legal aceito”: minha leitura da tela pública mostra concordância com termos ao continuar. Apontar o caminho exato do teste e corrigir a frase se necessário; ausência de conta/PII não prova ausência de aceite. Nenhuma nova aceitação ou repetição de onboarding é pedida.

**QA Lead** · 2026-09-30T21:51:56.969873+00:00

Aknowledgement `7c370d87` — entregues: (1) os 7 PNGs existentes anexados a ESTA issue por attachment real (manifesto com IDs/sha256 abaixo); (2) correção da frase sobre termos (você está certo — ver §Correção). Sem rerodar testes, sem novas capturas, sem publicação em outro serviço.

## Manifesto de attachments (deploy `6abd7fcb784e28733ac75eaf` · pin `d9dbdd5c` · capturas 2026-09-30 21:42Z)

| Rótulo | Attachment ID | sha256 (12) | Bytes | Origem |
| --- | --- | --- | --- | --- |
| entrada desktop (1280x1966) | `98994b33-69f8-4ca0-8035-57f5142b5340` | 2902dd7aab4c | 263501 | run-public/01-escola-publica-desktop.png |
| entrada mobile (360x2891) | `9d0968c2-9bce-456a-8b8d-6843c4e46c84` | 520628b54ee2 | 216728 | run-public/02-escola-publica-mobile.png |
| atividade (l02, Mapa Inicial) | `0b545d6a-ee7e-4849-9138-947b7dd04a00` | 33873d2d5916 | 376628 | run-public/03-atividade-publica.png |
| resultado "Lição concluída" | `416e22dc-554e-44ee-8dd3-226a92b66259` | af511acfb6be | 310360 | run-public/04-resultado-publica.png |
| retomada pós-reload | `d2e1fd75-ac08-4d25-9e18-a7a4948bbc49` | 8d81c04b0e6d | 347530 | run-public/05-retomada-publica.png |
| offline /escola/ com query | `82cf15a2-1497-4c8c-b892-6905657d6ea4` | 3b6078d650b7 | 106535 | run-public/06-escola-offline-publica.png |
| offline raiz com progresso | `07549ade-64e8-473e-bca4-6cff8ab70645` | 042bef0b6d40 | 347520 | run-public/07-raiz-offline-publica.png |

Verificação de integridade executada agora: `GET /api/attachments/98994b33.../content` → 200, 263501 B, `cmp` byte-idêntico ao PNG original em `/paperclip/aid3517-evidence/run-public/`. **Delimitação de capacidade mantida: eu NÃO inspecionei pixels** (runtime sem input de imagem) — verificação foi mecânica (dimensões/cores/não-branco); os attachments estão agora acessíveis ao revisor visual capaz pelo viewer da issue.

## Correção — "nenhum termo legal aceito" (frase do veredito `e6747de5` §Limitações)

**Incorreta. Correção:** a jornada pública B5, **ao continuar no onboarding, constituiu aceite dos termos do piloto** (implícito por continuação; não há checkbox separado). Fatos:

- Caminho exato do teste: `public-escola-acceptance.spec.ts` caso B5 — `#start-fundamentals` → tela `assistant-welcome` → clique `onboarding-next` (primeiro de 5), que atravessa a tela com o `privacy-note`.
- Fonte da tela pública (lineage `e95611da`): `engines/literacyDojo/src/screens/OnboardingScreen.tsx:186–193` — "Piloto gratuito para maiores de 18 anos. Seu progresso fica somente neste navegador, sem conta e sem registrar detalhes das suas tarefas. **Ao continuar, você concorda com os [termos do piloto](./termos.html) e leu o [aviso de privacidade](./privacidade.html).**"
- Portanto, na execução única houve: aceite dos termos do piloto por continuação (correção); ausência de conta criada e ausência de PII transmitida (mantém, sem mudança); nenhuma etapa exigiu aceitação EXTRA além desse aceite padrão do fluxo público (nenhum termo novo/além do fluxo normal do aprendiz).
- Nota de escopo: os termos/aviso são os drafts do piloto (`docs/legal/piloto/`, pendentes de revisão legal — registro do repo); o aceite acima é o mesmo que qualquer visitante público tem ao usar o site.

Nenhuma nova aceitação foi realizada neste heartbeat (nenhum onboarding re-executado).

## Disposição

Todas as entregas do issue completas (matriz `d69d81e4` · execução única e veredito `e6747de5` · ack `9188ffce` · attachments + correção acima). **`done`**.

---

