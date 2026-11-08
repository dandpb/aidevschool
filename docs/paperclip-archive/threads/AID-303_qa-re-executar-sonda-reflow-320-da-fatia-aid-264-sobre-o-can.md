# AID-303: QA: re-executar sonda reflow @320 da fatia AID-264 sobre o candidato do PR #180 (AID-271) e dar GO/NO-GO antes do merge

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-08-29T01:23:24.458619+00:00 | **Updated:** 2026-08-29T01:49:32.651+00:00
- **ID:** `e1978626-b30d-4ea9-b281-f1c37d3e882d`

## Description

Verificação independente do fix do P1 AID-271 (scroll horizontal essencial no iframe da literacyDojo embutida a viewport 320px).

**Candidato:** branch `aid-271/reflow-320` — PR https://github.com/dandpb/aidevschool/pull/180 (base origin/main 3586cb58; commit 7360281f). Mudança: remoção dos pisos de largura (`body` 320px, `.voxel-world` 330/280/340px, sangramento -30px do mapa @560) + spec `engines/literacyDojo/playwright/reflow-320.spec.ts`.

**Critério de aceite (do issue AID-271):** a 320px CSS px (viewport ou 400% zoom), sem scroll horizontal essencial dentro do iframe; sem perda de conteúdo/ação essencial. Evidência: re-execução da sonda relevante da fatia AID-264 pela QA com PASS.

**Sondas pedidas (mesma geometria da baseline/re-exec AID-264):**
1. Host mission `/mission/ai-pratica/l01` @320x640: dentro do iframe, `document.scrollingElement.scrollWidth <= window.innerWidth` (baseline falhava com 320 vs 298) e `.product-bar` right <= innerWidth.
2. Sem regressão: literacy standalone @320/@375 sem overflow; sem perda de conteúdo/ação essencial nas telas do fluxo da missão (intro → atividade → resultado).
3. Teclado/foco básico intacto no fluxo da missão (a mudança é só CSS de layout, mas o GO precisa confirmar).

Método (harness `qa-aid264`, deploy preview do PR ou execução local do branch) a critério da QA; registrar geometria medida e veredito GO/NO-GO neste issue. Produtor (FPE) não verifica o próprio trabalho — meu papel termina aqui até o veredito.

Blocante para: merge do PR #180 e fechamento do AID-271.

## Document `Continuation Summary` (2026-08-29)

# Continuation Summary

- Issue: AID-303 — QA: re-executar sonda reflow @320 da fatia AID-264 sobre o candidato do PR #180 (AID-271) e dar GO/NO-GO antes do merge
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: f18d0130-0866-425d-bb86-4c1637496500
- Agent: QA Lead (opencode_local)

## Objective

Verificação independente do fix do P1 AID-271 (scroll horizontal essencial no iframe da literacyDojo embutida a viewport 320px).

**Candidato:** branch `aid-271/reflow-320` — PR https://github.com/dandpb/aidevschool/pull/180 (base origin/main 3586cb58; commit 7360281f). Mudança: remoção dos pisos de largura (`body` 320px, `.voxel-world` 330/280/340px, sangramento -30px do mapa @560) + spec `engines/literacyDojo/playwright/reflow-320.spec.ts`.

**Critério de aceite (do issue AID-271):** a 320px CSS px (viewport ou 400% zoom), sem scroll horizontal essencial dentro do iframe; sem perda de conteúdo/ação essencial. Evidência: re-execução da sonda relevante da fatia AID-264 pela QA com PASS.

**Sondas pedidas (mesma geometria da baseline/re-exec AID-264):**
1. Host mission `/mission/ai-pratica/l01` @320x640: dentro do iframe, `document.scrollingElement.scrollWidth <= window.innerWidth` (baseline falhava com 320 vs 298) e `.product-bar` right <= innerWidth.
2. Sem regressão: literacy standalone @320/@375 sem overflow; sem perda de conteúdo/ação essencial nas telas do fluxo da missão (intro → atividade → resultado).
3. Teclado/foco básico intacto no fluxo da missão (a
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `f18d0130-0866-425d-bb86-4c1637496500` finished with status `succeeded` at 2026-08-29T01:49:46.600Z.
- Entendi o escopo: re-executar a sonda reflow @320 da fatia AID-264 sobre o candidato `aid-271/reflow-320` (commit 7360281f) e dar GO/NO-GO para o PR #180. Vou verificar o candidato no git e montar meu próprio ambiente de execução (sem tocar no worktree do produtor).

Agora vou construir o candidato localmente (mesma forma do deploy do piloto: OS + literacy embutida em `/apps/literacydojo/`).

Li os AGENTS.md (repo, engines, literacyDojo). Regras respeitadas: verificação apenas, sem tocar estado canônico. Agora vou ver o support do E2E para replicar o fluxo real (intro→atividade→resultado) na minha sonda independente contra o host real.

Tenho os IDs do conteúdo (l01: choice `opt-rascunho`; l02: `out-b` + `c-fontes`,`c-limites`). Agora subo os servidores locais do candidato e escrevo a sonda independente.

Servidores do candidato no ar. Escrevendo a sonda independente (mesma geometria da AID-264, host real):

Tudo falhou — preciso diagnosticar se é a sonda (não achou as telas) ou o candidato. Inspecionando o resultado:

Bug da minha sonda (constante `TOL` não serializada no `evaluate`). Corrigindo e melhorando a parte de teclado:

Todas as sondas passaram. Confir
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `f18d0130-0866-425d-bb86-4c1637496500` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-08-29T01:49:20.055277+00:00

VEREDITO: **GO para o merge do PR #180 (AID-271)** — critério de aceite cumprido com evidência independente executável.

**Sonda reflow @320 re-executada (réplica exata da geometria AID-264)** sobre o candidato `aid-271/reflow-320` @ 7360281f (base 3586cb58), build local na forma do deploy do piloto (OS + literacy embutida em /apps/literacydojo/), host REAL em /mission/ai-pratica/l01, Chromium 1.61.1 headless.

1) **Sonda principal @320x640** — iframe de 298px (idêntico à baseline): dentro do iframe, em TODAS as etapas (intro→atividade→feedback→resultado): `docScrollW=298 == innerW=298` (baseline: 320>298 ✗), `.product-bar` right=284 <= 298 (baseline: 306>298 ✗), `body` min-width=0, 0 ações essenciais fora da vista, host sem hscroll. **PASS** — falha P1 corrigida.
2) **Sem regressão**: host @375 (iframe 353px) e standalone @320/@375 no fluxo completo onboarding→mapa→intro→atividade→feedback: docScrollW=innerW em todas as etapas, 0 ações essenciais ocultas. **PASS**. Observação não-bloqueante: no resultado, `voxel-island-main` (decorativo) sangra até right=324 mas é clipado por `overflow:hidden` do `.voxel-world` — sem scroll horizontal essencial.
3) **Teclado/foco @320**: Tab entra no iframe, foco com indicador visível (BUTTON "Sair da lição"), Shift+Tab sai, Escape não derruba o app. **PASS**.

Corroborações/triagem: spec do produtor `reflow-320.spec.ts` 3/3 PASS no meu worktree (a 1ª execução a frio falhou por race de cold-start do webServer Playwright — infra, não produto; sugiro aquecimento). Suíte E2E existente: 2 falhas (`vertical-slice` happy-path, `gamification` revisão — ambas "0 evidências") **reproduzidas no commit BASE 3586cb58** → pré-existentes/ambientais, não regressão do candidato; observação encaminhada ao produtor no AID-271.

Limitações: execução local do branch (não o deploy preview do PR — novo deploy invalida a leitura); 320px via viewport CSS (critério aceita "viewport ou zoom 400%"); leitor de tela não reexecutado nesta sonda (diff é só CSS de layout, sem mudança de semântica).

Evidência: `aid303-evidence/RELATORIO_AID-303_GO_PR180.md` + `probe-reflow320.json` + `shots/` (16 screenshots) no meu workspace; baseline comparativa em `qa-aid264/geometry320.json`. Produtor não verificou o próprio trabalho. Disposição: done — GO emitido, merge do PR #180 liberado; AID-271 pode fechar após o merge.

---

