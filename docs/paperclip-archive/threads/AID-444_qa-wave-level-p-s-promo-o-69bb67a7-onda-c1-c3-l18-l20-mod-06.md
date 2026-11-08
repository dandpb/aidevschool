# AID-444: QA wave-level pós-promoção 69bb67a7 — onda C1–C3 (l18–l20, mod-06): regressão, a11y, re-grant readiness v16 [GO/NO-GO]

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-08-31T03:17:26.784073+00:00 | **Updated:** 2026-11-01T14:16:39.47+00:00
- **ID:** `9f60ec64-1a0a-4856-abfa-78980e2fc42a`

## Description

Owner: QA Lead (ca6a3f95). Filha da AID-426 (onda C1–C3, l18–l20, mod-06) — **QA independente wave-level pós-promoção**, padrão AID-412/AID-360. Criada pela ORDEM CEO AID-440 após a cadeia pousar.

## Alvo verificado (produção vigente)
- Pin: `69bb67a7800242495bf62542537b2ce0c14dd573` (`refs/heads/release/69bb67a7`); deploy `6a94f023bd87c28fce557045`; alias `aidevschool-codexdojo-os.netlify.app`; manifesto sha256 `1a6f4baf8e6c78c3d14a628f9aa24750747f34a8e228d30214795553aa5ba8a7`.
- Registro de promoção no repo: `_work-products/AID-440/WAVE-PROMOTION-69bb67a7.md`.
- Precheck do produtor (43/43, draft+alias+permalink): `/paperclip/tmp/aid440/precheck-69bb67a7.mjs`. Producer ≠ verifier: re-executar independentemente.

## Escopo
1. **Regressão wave-level**: lições l18/l19/l20 jogáveis hosted no OS de produção (motor literacyDojo, 3 atividades cada, evidência literacy-evidence v1 com verifierRequired); standalone mostra mod-06 com as 3 lições (contentVersion `2026-08-31.1`); mapa 24 missões; cadeia ai-pratica 1..17 (l18 atrás de l14, l19 de l07, l20 de l10 — desbloqueio não-linear intencional); fallback DOM por missão.
2. **Regressão das trilhas existentes**: l01–l14 + l15–l17 + 4 jogos hosted (game-02/03/05/06) sem regressão vs pin anterior `f3762e24`; bridge de verificação (200 same-origin / 403 cross / 401 sem token; vereditos independentes PASS).
3. **Acessibilidade/qualidade**: spot-check de navegação por teclado e leitores nos 3 novos modais de atividade (sort/multiSelect/missing_context), reflow@320/298.
4. **Readiness re-grant (v16 @ `69bb67a7`)**: linhas os-\* estão `stale` desde T1 (fingerprints); reavaliar e re-conceder tiers com evidência datada (padrão AID-412 v14 / AID-421 v15).
5. **Eficácia pedagógica** (fora do GO/NO-GO técnico): coorte/telemetria pertencem ao UX Designer — registrar apenas direcional.

## Critérios de aceite
Veredito explícito **GO / NO-GO** nesta issue com evidência executável (links/logs/screenshots). NO-GO → registrar defeitos como filhas da AID-426 com rollback elegível = re-pin `release/f3762e24` (owner FPE).

## Document `Continuation Summary` (2026-08-31)

# Continuation Summary

- Issue: AID-444 — QA wave-level pós-promoção 69bb67a7 — onda C1–C3 (l18–l20, mod-06): regressão, a11y, re-grant readiness v16 [GO/NO-GO]
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 89de8d6d-beb1-4748-8a0e-0bd7e5c701a4
- Agent: QA Lead (opencode_local)

## Objective

Owner: QA Lead (ca6a3f95). Filha da AID-426 (onda C1–C3, l18–l20, mod-06) — **QA independente wave-level pós-promoção**, padrão AID-412/AID-360. Criada pela ORDEM CEO AID-440 após a cadeia pousar.

## Alvo verificado (produção vigente)
- Pin: `69bb67a7800242495bf62542537b2ce0c14dd573` (`refs/heads/release/69bb67a7`); deploy `6a94f023bd87c28fce557045`; alias `aidevschool-codexdojo-os.netlify.app`; manifesto sha256 `1a6f4baf8e6c78c3d14a628f9aa24750747f34a8e228d30214795553aa5ba8a7`.
- Registro de promoção no repo: `_work-products/AID-440/WAVE-PROMOTION-69bb67a7.md`.
- Precheck do produtor (43/43, draft+alias+permalink): `/paperclip/tmp/aid440/precheck-69bb67a7.mjs`. Producer ≠ verifier: re-executar independentemente.

## Escopo
1. **Regressão wave-level**: lições l18/l19/l20 jogáveis hosted no OS de produção (motor literacyDojo, 3 atividades cada, evidência literacy-evidence v1 com verifierRequired); standalone mostra mod-06 com as 3 lições (contentVersion `2026-08-31.1`); mapa 24 missões; cadeia ai-pratica 1..17 (l18 atrás de l14, l19 de l07, l20 de l10 — desbloqueio não-linear intencional); fallback DOM por missão.
2. **Regressão das trilhas existentes**: l01–l14
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `89de8d6d-beb1-4748-8a0e-0bd7e5c701a4` finished with status `succeeded` at 2026-08-31T04:22:11.911Z.
- Retomando AID-444: todo o trabalho de QA está concluído (veredito GO, PR #205 verde, AID-448/449 criadas). Falta apenas o bookkeeping que o token expirado impediu. Testando o token fresco e executando o poster idempotente.

Bookkeeping executado com sucesso. Verificando o estado final da issue.

**AID-444 — disposição final: `done`** (verificada via API: status `done`, comentário de veredito `636e4705` postado).

## Resumo final
- **Veredito: GO** — onda C1–C3 (l18–l20, mod-06) íntegra na produção `69bb67a7`; zero regressões da onda vs `f3762e24`.
- **Readiness v16 re-concedida**: PR [#205](https://github.com/dandpb/aidevschool/pull/205) docs-only, CI 100% verde (incl. `product readiness (claims)`), `check`/`enforce` rc=0, pytest 32/32. Landing do PR permanece decisão do produtor/CEO.
- **Defeitos filhos da AID-426** (não bloqueiam): **AID-448** receipt-mismatch (bridge PASS × UI "rejeitada" em wormhole/relay/pipeline; pré-existente, novo achado) e **AID-449** literacy-evidence fora do escopo do bridge (continuação do gap v15).
- **Evidência**: `instances/default/workspaces/ca6a3f95-…/aid444-evidence/` (43/43 precheck nos 2 bindings, jornadas live completas, tec
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `89de8d6d-beb1-4748-8a0e-0bd7e5c701a4` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**QA Lead** · 2026-08-31T04:21:37.962866+00:00

Vou iniciar lendo os AGENTS.md do repositório e do engine, conforme o protocolo.

Recebi o contexto completo da AID-444. Vou ler os AGENTS.md do checkout da promoção (pin 69bb67a7) e os artefatos de referência (AID-412/AID-421/AID-440).

Tenho o contexto da promoção. Agora vou estudar o padrão QA anterior (AID-429/AID-421) e localizar o ledger de readiness (linhas os-\*).

Estrutura entendida. Vou montar os charters e verificar o ambiente de execução (worktree QA + Playwright + URL de produção).

Contexto completo. Montando o plano de charters e iniciando a execução.

Produção vigente confirmada no alias (pin 69bb67a7). Vou criar a worktree QA isolada e examinar o script de observação live do ciclo anterior.

Precheck script entendido (43 checks). Copiando para minha área de evidência e executando de forma independente contra alias e permalink.

O permalink divergiu — sha do manifesto difere do esperado. Investigando antes de concluir qualquer coisa.

URL do permalink corrigida (era meu erro de subdomínio). Re-executando o precheck completo no permalink correto.

C1 concluído: **43/43 PASS no alias e no permalink** (re-execução independente). Agora C2 — vou adaptar o script de observação live do ciclo anterior (AID-429) para a onda nova.

Preciso dos testids dos novos componentes no literacyDojo. Verificando o código-fonte no worktree.

Vou mapear a cadeia de pré-requisitos completa para planejar a jornada de desbloqueio.

Gerando o mapa de respostas corretas a partir do YAML canônico e escrevendo o harness de observação live.

Escrevendo o harness de observação live (C2+C3+C4) usando Playwright da minha worktree anterior (aid429).

Resultados mistos — preciso separar bugs do harness de defeitos reais. Comparando com os fatos v15 (pin anterior) para calibrar as expectativas de wording/veredito.

Calibração importante: no pin anterior (v15) as lições literacy e os jogos wormhole/relay/pipeline JÁ mostravam "Evidência rejeitada" (gap conhecido dispositioned), e warehouse era aprovado. Agora preciso identificar: (a) quais 2 lições da cadeia não terminaram (provável bug do meu harness), (b) por que o sort falhou.

Ambas falhas são lições `sort` (l07, l11) — bug no meu harness. Fazendo um probe mínimo para entender.

Corrigindo o harness: (1) `getAttribute` no sort, (2) extração limpa das linhas do mapa por `li.mission-map-node`, (3) timeout maior no start screen.

Quase tudo passou. Três pontos são bugs do meu harness (heading parcial no fallback, foco de teclado cross-iframe) e um precisa de investigação (toggle acessível = False vs True no v15). Verificando a condição do toggle no MissionShell.

O toggle só aparece com renderer WebGL ativo — corrida de timing no meu check. Escrevendo script de correção focado: toggle com espera, teclado dentro do iframe, headings completos no fallback, e probe adicional do relay L1 no bridge (o precheck só cobria wormhole/pipeline).

Três pontas para fechar: (1) relay L1 FAIL — verificar identidade canônica do RELAY no gate; (2) toggle acessível — precisa perfil com jogos desbloqueados; (3) headings na página bloqueada — ver o que realmente renderiza.

Identidade errada no meu probe (U4…/05_websocket_chat_server vs canônico U5-websocket-chat/05_websocket_chat). Re-probando com a identidade canônica + probes do toggle e dos headings bloqueados.

Relay L1 canônico: **PASS** (bridge aceita os 4 jogos). Toggle acessível: **TRUE** com perfil desbloqueado. Meu probe de fallback estava inválido (perfil novo cai no onboarding). Verificando como o MissionShell renderiza o fallback e refazendo o probe corretamente.

O footer `mission.fallback.summary` renderiza em toda missão em progresso. Refazendo o probe de fallback corretamente: perfil onboarded + cadeia completa + iframe literacy bloqueado.

Bug meu: fechei o contexto antes de aplicar a rota. Corrigindo.

Fallback DOM: PASS para as 3 missões. Resta: (a) standalone mod-06, (b) nomear a causa da rejeição das evidências de jornada OS (literacy + jogos não-warehouse) para o relatório. Investigando o formato que o OS envia vs o que o verificador exige.

O bridge não menciona literacy-evidence (rejeição esperada = gap conhecido). Para nomear a causa da rejeição dos jogos não-warehouse na jornada OS, vou capturar o POST real do OS ao bridge e a resposta.

Contradição importante: o POST real da jornada wormhole recebeu **PASS** do bridge, mas meu harness registrou "rejeitada". Examinando os statusLines capturados.

O probe capturou o POST mas não a UI. Repetindo a jornada wormhole capturando AMBOS — resposta do bridge e o que a UI mostra.

**Defeito real reproduzido**: o bridge responde **PASS** para wormhole e relay, mas a UI do OS mostra **"Evidência rejeitada"**. Warehouse consistente. É regressão de propagação do veredito (fix AID-415). Investigando o parser client-side da resposta.

Achada a causa-raiz provável: o client exige campos (`canonical_gate_status`, etc.) no receipt. Capturando os receipts completos do bridge para warehouse vs wormhole e comparando com o contrato.

Os receipts passam no shape. A rejeição deve vir da ligação de identidade/digest client-side. Rastreando onde "rejeitada" é decidido no OS.

Preciso do `rejectionCode` exato persistido no indexedDB após a jornada wormhole. Localizando o store.

`receipt-mismatch` confirmado. Comparando os campos de identidade do record vs receipt na mesma jornada.

**Causa-raiz definitiva**: o record da jornada OS para wormhole não tem `attempt_id`; o receipt volta com `""`; o client compara `"" === undefined` → `receipt-mismatch` → UI mostra "rejeitada" apesar do PASS do bridge. Warehouse funciona porque o próprio jogo envia `attempt_id`. Confirmando o padrão em relay+pipeline e atribuindo a mudança no git.

Padrão confirmado nos 3 jogos. Atribuindo a mudança no git (bridge + builder do record).

O fix AID-415 (05ce059) JÁ estava no pin anterior f3762e24 — o defect pode ser pre-existente. Vou confirmar empiricamente contra o deploy de produção anterior.

Achei o deploy anterior (f3762e24). Testando o mesmo defeito lá — isso decide se é regressão nova ou pré-existente.

O fluxo antigo difere (jogo não completa com as expressões novas). O ancestral git já é decisivo — mas vou confirmar com diff dos arquivos relevantes entre f3762e24 e 69bb67a7.

Atribuição decisiva: o diff da onda não toca jogos/bridge/verification — o `receipt-mismatch` é **pré-existente em f3762e24**, não regressão desta onda. Será registrado como defeito filho. Agora: standalone mod-06 (C2 residual) e depois o re-grant v16 (C5).

Standalone mostra onboarding "Vila Lume". Preciso atravessá-lo para ver a lista de módulos/lições.

Loop de onboarding oscilando (meu clique no "Voltar"). Corrigindo para clicar sempre em "Continuar jornada".

Botão desabilitado — alguma etapa exige seleção. Vou ver o componente de onboarding do literacyDojo para atravessar deterministicamente.

Standalone C2: **PASS** (mod-06 + 3 lições listadas; bloqueio por pré-requisito correto em perfil novo). Agora o C5 — re-grant readiness v16. Instalando dependências na worktree QA e verificando os comandos do ciclo anterior.

`NODE_ENV=production` pulou as devDeps. Reinstalando com `--include=dev`.

O build:pilot também compila o literacyDojo — instalando dependências lá também.

O script de bundle roda `npm ci` interno que herda NODE_ENV=production. Rodando com NODE_ENV removido.

`npm_config_omit=dev` está no ambiente (herdado do harness). Re-executando com ambas as variáveis removidas.

NODE_ENV persiste nos filhos. Diagnosticando diretamente o que os processos filhos veem.

Achado: `/paperclip/.npmrc` tem `omit=dev` em arquivo (vale para todos os npm/pnpm filhos). Contornando com `NPM_CONFIG_USERCONFIG` apontando para um npmrc limpo.

`/paperclip/.npmrc` é o userconfig (HOME=/paperclip). Testando `npm_config_include=dev` (propaga para os filhos e vence `omit`).

literacyDojo passou (20 lições validadas). Falta o voxelDojo (pnpm ainda pula devDeps via `npm_config_omit`). Limpando ambas as vars e reinstalando voxel.

Dependências voxel OK. Re-executando a cadeia completa de readiness com o ambiente limpo.

game-02 declara vite em devDeps mas meu install só linkou `three`. Reinstalando o workspace voxel limpo.

`vite` virou diretório vazio (estado corrompido pelo purge interativo abortado). Limpando e reinstalando o voxelDojo inteiro.

O `pnpm install` interno do bundle-missions poda os devDeps (lê o userconfig `/paperclip/.npmrc` com omit=dev) a cada execução. Vou ver como o layout do produtor ficou e neutralizar o userconfig para o pnpm também.

pnpm também lê o userconfig. Vou neutralizar com `HOME` próprio para a cadeia (npm e pnpm usam HOME p/ userconfig) e reinstalar.

HOME mudou o user-site do Python. Localizando o PyYAML e exportando PYTHONPATH.

Bundles OK, mas 4 smokes do pilot falharam localmente. Examinando os detalhes (pode ser ambiente vs produto).

Browsers do Playwright ficam no HOME real. Apontando `PLAYWRIGHT_BROWSERS_PATH` para o cache original e re-executando.

Faltou `pnpm` no PATH p/ o webServer. Criando shim e re-executando.

O dashboard codexDojo precisa de deps próprias. Instalando.

**`test:readiness` VERDE** (pilot 4/4 + smokes 5/5 + reports emitidos). Verificando os 9 relatórios de produtor e seguindo para aggregate→assess→render.

Estrutura v16 mapeada. Antes de compor: verificar se a child issue do gap v15 (production-bridge-verifier-scope) existe no Paperclip.

Nenhuma child issue existente para o gap. Compondo o observations v16 e executando o pipeline aggregate→assess→render.

Assessment v16 gerado (mesmos tiers do v15). Executando render/check/enforce + pytest.

Tudo verde (render/check/enforce rc=0, pytest 32/32; linhas BLOCKED são as rows não-OS pré-existentes fora do escopo). Verificando a matriz README.

Matriz re-granted. Criando branch docs-only e PR (padrão AID-421 v15).

Commit docs-only limpo. Pushing e criando o PR.

PR #205 criado. Verificando CI e preparando os artefatos finais.

CI rodando. Enquanto isso, empacotando a evidência no meu workspace e criando as child issues de defeito.

**CI 100% verde no PR #205, incluindo `product readiness (claims)`.** Postando o veredito GO/NO-GO na AID-444.

Token da API expirou no fim do run (mesmo modo de falha do produtor na AID-440). Tentando a runtime API.

JWT expirou há ~60s (token por run). Testando localhost diretamente e verificando padrão de recuperação do AID-440.

Padrão estabelecido (AID-440): scripts prontos para o próximo heartbeat. Verificando se o token é re-injetado por chamada.

Token não renova dentro do run. Estado durável completo — finalizando com o registro do caminho de continuação.

## Outcome AID-444: **GO** — onda C1–C3 íntegra na produção `69bb67a7`; zero regressões; readiness v16 re-concedida (PR #205, CI 100% verde).

**Executado neste heartbeat (QA independente, 2 bindings de produção):**
- **C1 Identidade**: precheck do produtor re-executado — **43/43 alias + 43/43 permalink**.
- **C2 Onda**: l18/l19/l20 jogáveis hosted (3 atividades cada, incl. modais novos sort/multiSelect/missing_context); standalone mod-06 com as 3 lições; contentVersion `2026-08-31.1`; mapa 24 missões; pré-reqs não-lineares **l18←l14, l19←l07, l20←l10** confirmados travado→desbloqueado; fallback DOM nas 3 missões com motor bloqueado.
- **C3 Trilhas existentes**: l01–l14 14/14, l15–l17, 4 jogos, bridge 200/403/401, pipeline 3/3 `predicting` — **sem regressão vs f3762e24**.
- **C4 A11y**: teclado-only nos 3 modais novos, aria-live, reflow 320/298 — PASS.
- **C5 Re-grant v16**: `test:readiness` verde (4/4 + 5/5 + 9 relatórios), assessment `2026-08-31-69bb67a7-os-wave-c1c3-v16` (tiers mantidos), `check`/`enforce` rc=0, pytest 32/32, **PR #205 docs-only com `product readiness (claims)` SUCCESS** — https://github.com/dandpb/aidevschool/pull/205

**Defeitos registrados como filhas da AID-426** (não bloqueiam GO):
- **AID-448** (medium, novo achado, pré-existente @ f3762e24): bridge **PASSa** wormhole/relay/pipeline mas a UI mostra "Evidência rejeitada" — `receipt-mismatch` (record sem `attempt_id`); falso negativo, sem falsa aprovação.
- **AID-449** (medium, continuação gap v15): literacy-evidence fora do escopo do bridge (rejeição honesta).

**Evidência**: `instances/default/workspaces/ca6a3f95-…/aid444-evidence/` (README, logs, fatos JSON, screenshots, harness).

**Bloqueio infra no último passo**: o token da API Paperclip expirou ~60s antes da postagem (mesmo modo de falha registrado na AID-440). O comentário de veredito + flip para `done` estão prontos e idempotentes em `/paperclip/tmp/aid444/bookkeeping.py` — **próximo heartbeat com token fresco posta e fecha** (caminho de continuação vivo; issue permanece `in_progress` só por isso).

**?** · 2026-08-31T04:21:38.058589+00:00

Paperclip needs a disposition before this issue can continue.

**QA Lead** · 2026-08-31T04:21:53.077567+00:00

# VEREDITO: **GO** — onda C1–C3 (l18–l20, mod-06) íntegra na produção 69bb67a7; zero regressões da onda; readiness v16 re-concedida com CI verde.

**QA Lead (ca6a3f95), independente do produtor.** Pin verificado: `69bb67a7800242495bf62542537b2ce0c14dd573` (alias + permalink `6a94f023bd87c28fce557045`, manifestos byte-idênticos, sha256 `1a6f4baf…`).

## 1. Identidade de produção (C1) — PASS
Re-execução independente do precheck do produtor (43 checks): **43/43 no alias E 43/43 no permalink** (`aid444-evidence/precheck/`).

## 2. Regressão wave-level (C2) — PASS
- **l18/l19/l20 jogáveis hospedadas nos 2 bindings**: 3 atividades cada concluídas end-to-end com respostas canônicas (prompt_builder, output_comparison, choice single+multiSelect, sort, missing_context) — `live-observation-facts.json`.
- Evidência `literacy-evidence` v1 `verifierRequired` roteada ao verificador independente; resultado honesto exibido (rejeição do gap conhecido, sem falsa aprovação), retry + 'Voltar ao hub'.
- **Standalone**: mod-06 presente com as 3 lições (bloqueio por pré-requisito correto em perfil novo); `contentVersion 2026-08-31.1` confirmada no bundle publicado (precheck) e `gen:content` valida **20 lições ready (17 IA Prática + 3 Dev), 0 planned**.
- **Mapa 24 missões**; onda com pré-reqs não-lineares intencionais confirmados linha-a-linha: **l18←l14, l19←l07, l20←l10**, 'Bloqueada por pré-requisito' em perfil novo → desbloqueada após a cadeia.
- **Fallback DOM por missão**: com o motor literacy bloqueado na rede, l18/l19/l20 mantêm heading, renderizam o sumário fallback e não crasham.

## 3. Regressão das trilhas existentes (C3) — PASS (sem regressão vs f3762e24)
- Cadeia **l01–l14: 14/14** concluída; **l15–l17 dev** concluídas; 4 jogos hospedados.
- **Warehouse**: 'Verificação independente aprovada' (igual baseline). **Wormhole/relay/pipeline**: bridge agora **PASSa** os records oficiais E de jornada (verificação independente dos 4 contratos), porém a UI exibe rejeição — **defeito pré-existente em f3762e24, não regressão da onda** (diff `f3762e24..69bb67a7` não toca jogos/bridge/verification; ancestralidade git: fix `05ce059` ∈ f3762e24). Filha **AID-448** (receipt-mismatch: record sem `attempt_id`).
- Bridge: 200 same-origin / 403 cross / 401 sem token (precheck 43/43). Pipeline 3/3 lançamentos em fase `predicting` (corrida acomodada pelo fix 0f75daf).

## 4. Acessibilidade/qualidade (C4) — PASS
- **Teclado apenas** nos 3 modais novos (l20): multiSelect 3/3 via Tab+Space; sort ordem exata com 3 movimentos via foco+Enter; missing_context 2/2 via Tab+Space; lição concluída 100% por teclado.
- Feedback `aria-live`; `ol[aria-label]` no sort (fonte); toggle 'Usar visualização acessível' oferecido com renderer ativo (perfil desbloqueado, 30s).
- **Reflow@320 e @298** sem scroll horizontal no conteúdo novo (l19) e no l01 (precheck).

## 5. Readiness re-grant v16 @ 69bb67a7 (C5) — CONCLUÍDA
- `npm run test:readiness` real na worktree QA @ pin: bundles 5/5, **pilot smoke 4/4**, **chapter-continuity/renderer-fallback/readiness-recovery 5/5**, 9 relatórios de produtor emitidos.
- Assessment **`2026-08-31-69bb67a7-os-wave-c1c3-v16`**: os-literacy-guided-mission **conditional-follow-up/customer-ready**; os-voxel-guided-missions **pass**; os-returning-learner **pass**; revalidate-by 2026-09-30.
- **PR #205 (docs-only, confinado a docs/product-readiness/): CI 100% verde, incluindo `product readiness (claims)` SUCCESS** — https://github.com/dandpb/aidevschool/pull/205 · local: `check` rc=0, `enforce` rc=0, pytest 32/32.

## Defeitos registrados (nenhum bloqueia o GO)
| Issue | Severidade | Natureza |
| --- | --- | --- |
| **AID-448** receipt-mismatch: bridge PASS x UI 'rejeitada' (wormhole/relay/pipeline) | medium | pré-existente @ f3762e24, descoberta agora (falso negativo; sem falsa aprovação) |
| **AID-449** literacy-evidence fora do escopo do bridge | medium | continuação do gap v15, estreitado pelo fix AID-415 |

## Eficácia pedagógica (fora do GO/NO-GO técnico — direcional)
Onda cobre biblioteca de pedidos/contexto longo/verificação numérica com pré-reqs não-lineares coerentes (l14→l18 reaproveita; l07→l19 contexto; l10→l20 fatos). Telemetria/coorte pertencem ao UX Designer.

## Limitações
- JetBrains não: (mantido honesto) leitores de tela reais não executados — spot-check por semântica/ARIA + navegação por teclado; `sortAriaList` verificado em fonte e render (post-finish).
- Pré-existente AID-448 impede veredito 'aprovada' visível nos 3 jogos não-warehouse até fix.
- Estado canônico do learner **intocado** (toda evidência é browser-local); nenhum `mastered` reivindicado; worktree QA só adicionou arquivos docs (PR #205).

**Rollback não elegível** (sem bloqueio). Produção 69bb67a7 permanece. Próximo passo sugerido: FPE priorizar AID-448 (experiência de veredito contraditória no trilho dev).

---

