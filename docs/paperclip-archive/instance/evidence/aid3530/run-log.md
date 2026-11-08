# AID-3530 — execution log (evidence) — LEE (Learning Engine Engineer)

Issue: AID-3530 "Corrigir reabertura do jogo inline" (filha de AID-3453/unify-school).
Delivery: draft PR #624 https://github.com/dandpb/aidevschool/pull/624
Source SHA: 60f73d7964fe2affb3a2d11ec1552f21e1745ead (branch aid3530/fix-inline-game-reopen, base origin/main d9dbdd5c504ef76a42d3f7944392dccee3eb6351)
Provenance: agent=learning-engine-engineer(98ed5775-4ae8-442e-81d0-e4c50c435205) task=AID-3530 run=e6a0ee4d-d784-49ba-b6f2-ca3b8927a199 (sessionId não exposto ao adaptador; nenhum identificador inventado)

## Isolamento (sem tocar trabalho alheio)

- Checkout principal permaneceu intocado em aid3515/observable-learning-evidence (clean durante todo o run; nenhum commit/branch alterado lá).
- Worktrees dedicados: /tmp/opencode/aid3530 (fix, branch nova de origin/main) e /tmp/opencode/aid3530-base (detached d9dbdd5c, prova base-falha).
- Sem push/merge em main; PR draft; #618 intocado (bug confirmado pré-existente no base 1975e2c7, conforme achado F7 da revisão AID-3512).

## Correção (mínima)

engines/dojoToday/src/main.ts — guarda de abertura passa a tratar src="about:blank" (sentinela pós-fechamento) como "sem jogo carregado":
`const currentSrc = playFrame.getAttribute("src"); if (!currentSrc || currentSrc === "about:blank") { ...set game src... }`
Unload intencional no fechamento (about:blank) e lazy-load preservados; sem refactor de UI, CSP, permissões ou segurança.

## Spec de regressão commitada (hermética para CI)

engines/dojoToday/playwright/inline-game-reopen.spec.ts (novo arquivo; governança protect-tests permite criação de novo teste):
- abre→fecha→reabre×2 (última reabertura por Enter);
- destino exato /games/<num>/index.html lido de data-game;
- conteúdo NOVO a cada aberação (nonce por fulfillment em page.route prova recarga real do documento);
- fechamento: wrap oculto + src=about:blank + aria-expanded=false + rótulo "▶ Jogar aqui (inline)";
- foco permanece no botão; loads==3 no fim.
- CI-safe: bundle public/games/ é gitignored (README §Jogar inline); fixture via page.route.

## Prova base-falha / fix-passa (mesma spec, worktrees separados)

- BASE d9dbdd5c (npm ci --include=dev; `npx playwright test inline-game-reopen`): **1 failed** —
  "14 × locator resolved to <iframe src="about:blank" ...> - unexpected value "about:blank"" na reabertura 1 (linha 66 da spec). Reprodução exata do F7.
- FIX 60f73d79: **1 passed** (7.2s).
- biome check src/main.ts playwright/inline-game-reopen.spec.ts → limpo; npx tsc --noEmit → limpo.

## Evidência de navegador REAL (jogo verdadeiro, sem route interception)

- Bundle real do voxelDojo game-02 compilado no worktree do fix: `npm run build -- --base=./` → copiado para engines/dojoToday/public/games/02/ (procedimento exato do README §Jogar inline).
- Spec temporária aid3530-evidence.spec.ts (não commitada; cópia neste dir): **1 passed (12.8s)**.
- Sequência abrir→fechar→reabrir(1, clique)→fechar→reabrir(2, Enter):
  - 3/3 carregamentos com frame URL http://127.0.0.1:5180/games/02/index.html;
  - canvas#stage (WebGL) + aside#hud h1 visíveis dentro do iframe em TODA abertura (HUD é construído pelo JS do bundle → prova boot real);
  - fechamentos: wrap hidden + src=about:blank + aria-expanded=false; foco no botão preservado; Enter opera o toggle.
- Screenshots reais (Chromium headless 1.62.0, viewport 1280x900, timezoneId UTC):
  - real-open-1.png, real-reopen-1.png, real-reopen-2-enter.png (wrap 340x543): cena WebGL renderizada — 1190 cores distintos por amostra (PNG decodificado e contado; frame vazio teria ~1); os 3 estados byte-consistentes = render determinístico.
  - real-close-1.png (página 1280x900) mostra o card recolhido.

## Limites respeitados

Sem merge/deploy/produção; sem novo serviço/gasto; sem mudança curricular; sem tocar branches aprovadas ou checkout de outro agente; trabalho atual AID-3516/3528 não afetado.

## Próximo passo / owners

- Revisão FSE (Full-Stack Feature Engineer, e761b40c): não regressão + escopo no PR #624 @60f73d79 — filho de revisão criado na própria issue AID-3530 (nenhum filho de revisão pré-existente para este head; sem duplicação).
- Merge (quando aprovado): porta única scripts/merge_pr.sh + countersign — FPE até política R1 (só o FPE merga).
- Conflito potencial conhecido: #618 também toca engines/dojoToday/src/main.ts (hunks distintos: a11y labels vs. toggle handler ~L344-358) — registrar na fila do FPE na ordem de merge.
