<!-- issue: AID-2670 | key: beta-smoke-matrix | doc_id: f8021644-5f53-4a84-8731-c4dfbbab6f5e | updated: 2026-09-26 01:36:01.081+00 -->

# QA SMOKE BETA — matriz pass/fail engines customer-tier (sessão founder)

(AID-2670)

# QA SMOKE BETA — Matriz pass/fail das engines customer-tier (AID-2670)

**Sessão do founder** (diretiva AID-2660 01:20:34Z) · Execução: 2026-09-26T01:31–01:34Z (UTC) · QA Lead
Escopo: 6 engines customer-tier do doc `engine-reports` rev 4c2a2724 (AID-2660), testadas **contra os deploys públicos ao vivo**.

**Veredito executivo: 9/9 superfícies customer-tier = PASS. 0 blockers de sessão. Integridade do pilot bundle 20/20 OK.**
O corredor de teste não quebra na mão do founder nas superfícies com URL pública.

## Ambiente & método

- Playwright 1.63.0, chromium headless (linux), Node v24.18.0; suíte standalone fora do repo em `/paperclip/w2670/qa` (25 testes, `npx playwright test`, resultados em `results.json`).
- Loops core replicam os contratos e2e das próprias engines (literacy `playwright/support.ts`; warehouse `game-02-warehouse/playwright`; OS `tests/release-journeys.smoke.spec.ts`; miniTown `playwright/mini-town.spec.ts`) — não fui eu quem produziu essas engines; sou verificador independente.
- Guardas: `console.error` fatal + `pageerror` coletados em todos os testes; varredura de ruído separada nas 4 superfícies principais = CLEAN.
- Integridade: cada superfície do `pilot-bundle-manifest.json` baixada e comparada ao sha256 declarado (curl + sha256).
- Não houve escrita em estado canônico do learner (todos os loops rodam em browser profile descartável; apps escrevem no máximo progresso local).

## Matriz

| # | Engine (tier) | Superfície / URL | Loop core exercitado | Resultado | Evidência |
|---|---|---|---|---|---|
| 1 | literacyDojo (customer ×2) | https://aidevschool-literacydojo.netlify.app | onboarding completo → Mapa Inicial → 1ª lição respondida certa nas 3 atividades → "Lição concluída" | **PASS** | `qa2670-literacy-alias-2-concluded.png`; console CLEAN |
| 2 | literacyDojo (hospedada no OS) | https://aidevschool-codexdojo-os.netlify.app/apps/literacydojo/ | mesmo loop 1, na cópia do pilot bundle | **PASS** | `qa2670-literacy-alias-2-concluded.png` (alias) + shots literacy-osbundle-*.png (AID-2670); sw.js/termos/privacidade hash OK |
| 3 | codexDojo OS (customer ×3) | https://aidevschool-codexdojo-os.netlify.app (root, `?track=dev`, `/desktop?operator=1`) | "Entrar na escola" → hub → lançador abre com apps; missão voxel `/mission/dev/game-02-warehouse` jogada até o fim → `completion-is-not-mastery` + `independent-verdict` | **PASS** | `qa2670-os-1-hub.png`, `qa2670-os-3-warehouse-verdict.png` |
| 4 | voxelDojo (customer, loop standalone) | https://aidevschool-codexdojo-os.netlify.app/apps/warehouse/ | L1 jogada até "concluída" clicando prateleiras via HUD; evidência console `"source":"voxeldojo","pass":true` | **PASS** | `qa2670-voxel-warehouse-L1.png` |
| 5 | voxelDojo (amplitude) | 15 superfícies `/apps/{wormhole,relay-station,pipeline-plant,checkpoint-city,timeline-tower,docking-bay,hash-ring,air-traffic,mission-control,breaker-grid,river-delta,observatory,freight-yard,lighthouse-network,stacks}/` | boot + canvas visível + sem erro fatal (founder pode clicar qualquer uma) | **PASS 15/15** | results.json (testes voxel-*) |
| 6 | dojoToday (customer) | https://aidevschool-dojotoday.netlify.app | headings "Sua lição de hoje" + "Retome por aqui" + KV WAREHOUSE ativa + fronteira de autoridade visível | **PASS** | `qa2670-dojotoday-alias.png`; console CLEAN |
| 7 | dojoToday (hospedada no OS) | /apps/dojotoday/ | renderiza sem erro fatal | **PASS** | dojotoday-osbundle.png (AID-2670) |
| 8 | miniTown (experimental por design) | https://aidevschool-minitown.netlify.app | canvas + HUD "MiniTown —" + `window.__miniTown` simulação avança (step) | **PASS** | `qa2670-minitown.png`; console CLEAN |
| 9 | pixelDojo/PixelQuest (customer) | preview https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app + /apps/pixelquest/ (OS) | preview: app real ("18 labs… Fase 1/8 Briefing", botões Começar/Orbita 3D); bundle: canvas sem erro fatal | **PASS** (ressalva B2) | `qa2670-pixelquest-preview.png` |

**Integridade do pilot bundle: 20/20 superfícies** — sha256 servido == declarado no manifest (incl. arquivos requiredFiles do literacy). Manifest `sourceRevision b6a0ea1b` (pin de release; main atual `4461841f` — re-pin por release já é lacuna conhecida do relatório).

## Classificação de achados (nenhum blocker de sessão)

| ID | Severidade | Achado | Ação sugerida / dono |
|---|---|---|---|
| A1 | Informativa (positiva) | Doc `engine-reports` diz dojoToday "sem deploy público" e omite miniTown — **ambos têm alias públicos vivos e funcionando** (matriz #6, #8). | GWE (AID-2669) pode linkar os 2 aliases no Beta Hub; atualizar doc na próxima rev (dono do doc: CEO). |
| A2 | Média (portfólio, não sessão) | pixelQuest público hoje = **branch preview** (`singular-crostata`), não alias estável; preview exibe projeção de learner ("Review overdue 43d"). Fundador deve testar via `/apps/pixelquest/` do OS ou decisão de alias (decisão aberta #4 do engine-reports). | Decisão CEO / Platform & Release. |
| A3 | Baixa | `aidevschool-engine-lab-preview.netlify.app` serve **protótipo antigo** do OS (título "codexDojo OS") — risco de confusão se linkado no Beta Hub. | GWE (AID-2669): linkar só o alias canônico `aidevschool-codexdojo-os`. |
| A4 | Cosmética | `aidevschool-engine-runtimes-preview.netlify.app` = 404 (alias morto referenciado em código). | Limpeza futura; sem impacto no founder. |

## Limitações explícitas

1. Amplitude do OS: boot + hub + lançador + 1 missão voxel ponta-a-ponta; apps do lançador (Terminal, Arquivos, Engine Hub interno etc.) não foram deep-testados individualmente.
2. Não testado: viewport mobile, instalação PWA, modos offline, WebGL em hardware exótico (chromium headless/software).
3. Screenshots capturados como artefato, mas **este agente não inspeciona imagens** (modelo sem input visual) — vereditos ancorados exclusivamente em asserções DOM/comportamentais + logs.
4. Foto pontual em 01:31–01:34Z; deploys Netlify podem mudar depois disso.
5. Anexos e doc ficaram em AID-2670: a parent AID-2660 está fora do boundary de escrita deste agente — relay da matriz para a parent é ação do CEO.

## Comandos de reprodução

```bash
cd /paperclip/w2670/qa && npx playwright test          # 25 testes, matriz completa
curl -s https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | jq .   # manifest
# integridade sha256: script em anexo (logs AID-2670) — 20/20 OK
```

Disposição: **done** — matriz entregue com evidência; nenhum blocker de sessão; achados classificados com donos sugeridos.
