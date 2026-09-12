# AID-264 — Re-execução da fatia §6 (AID-31) sobre o pin promovido `61b85535` (pós-AID-263)

Data: 2026-08-28 UTC (re-execução)
QA independente: `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` — mesma fatia, mesmo harness, baseline `ec265fa` em `docs/qa/AID-264_QA_ACESSIBILIDADE_PILOTO_ec265fa_2026-08-28.md`.
Pin verificado: manifesto `pilot-bundle-manifest.json` → `sourceRevision 61b85535b2d7cefdd177cd7823b9ec824ddfb787`; todas as 5 superfícies com SHA-256 alterados vs baseline; literacy agora same-origin (`/apps/literacydojo/`, AID-282); pixel em novo deploy imutável (`6a920159a8…`).
Ambiente: idem baseline (Playwright 1.61.1 + Chromium 1228 headless + axe-core 4.13.0; harness `qa-aid264/audit.mjs` + sondas dedicadas). Evidência: `qa-aid264/post263/` (results-post263.json, post263-probes.json, manifest-post263.json) + `qa-aid264/evidence-post263/*.png`.

## Veredito final por superfície (pin `61b85535`)

| Superfície | Baseline `ec265fa` | Re-execução `61b85535` | Motivo residual |
| --- | --- | --- | --- |
| voxel 02/03/05 (standalone + embutida) | NO-GO (3 P0) | **NO-GO parcial** | P0 idioma ✅ (`lang="pt-BR"`, HUD/títulos/copy 100% PT, projeção PT sem texto EN); P0 live region ✅ (`.status` = `role="status" aria-live="polite"`, anúncio funcional confirmado em interação); **P0 reduced-motion só metade**: CSS publicado e computado (durações → `1e-05s`) mas o **gating de cena WebGL não está no pin promovido** (ver § Achado crítico) |
| pixel-quest (deploy pinado) | NO-GO contratural | **GO condicional** | media query `prefers-reduced-motion` publicada no CSS (cômputo confirmado); sem animações CSS não-essenciais; movimento restante é gameplay em canvas; P2 `page-has-heading-one` persiste |
| literacyDojo standalone | GO | **GO** | pt-BR, reduced-motion correto (1e-05s), reflow OK @320/@375; P2 axe persiste (`.onboarding-progress` aria-prohibited-attr, `.route-badge` contraste) |
| literacyDojo embutida @320 | GO condicional | **GO condicional** | **P1 persiste**: scroll horizontal essencial dentro do iframe (medição idêntica à baseline: `docScrollW=320` vs `innerW=298`; `.app-shell` w=320). Agora same-origin, mas o min-width do app-shell continua. AID-271 (backlog) segue aberta |
| Host mission shell | GO | **GO** | aria-live/h1/PT-BR corretos; P2 contraste `.mentor-mission-context` e P3 `iframe outline:none` persistem |

**Conformidade cross-engine de acessibilidade: ainda NÃO pode ser alegada** — voxel NO-GO parcial (reduced-motion de cena) + P1 de reflow embutido.

## Achado crítico — divergência de linha de promoção (reduced-motion de cena WebGL perdido)

- O candidato reconciliado `afd6789` (linha AID-263, GO independente em AID-288) contém `engines/voxelDojo/shared/reducedMotion.ts` (gating de cena: bots sem deslizar, viajantes congelam, flash assenta) — `window.matchMedia("(prefers-reduced-motion: reduce)")`.
- O pin promovido `61b85535` **não contém esse arquivo e não descende de `afd6789`** (`git merge-base --is-ancestor afd6789 61b85535` → falso). Suas correções voxel vêm de `38463210` (linha AID-261), que resolveu idioma/live-region/alvos/tokens/CSS-reduced-motion, mas **sem gating de cena**.
- Evidência executável no publicado: `grep -c 'matchMedia'` = **0** nos 6 JS voxel do bundle (`index-RYXBcbam`, `warehouseScene-BFLAlpdv`, `index-UbMDoGwY`, `wormholeScene-r1dpxxhG`, `index-CrPHFbd0`, `relayScene-C8bY5erE`); `git grep matchMedia` em `61b85535 -- engines/voxelDojo` = 0.
- Efeito para a pessoa aprendiz: com `prefers-reduced-motion: reduce`, animação decorativa não-essencial do WebGL (cenário orbitando, bots deslizando, flashes) continua; somente CSS para a ~0ms.
- Classificação: **P0 do critério "Movimento" da matriz §6 não atendido no pin promovido** (produzido e verificado, mas perdido na promoção). Decisão é de release-engineering: re-pin para a linha reconciliada ou port do `shared/reducedMotion.ts` — registrada como issue filha para o CEO/FPE (ver Disposição).

## Evidência-chave da re-execução

1. **Idioma**: `lang="pt-BR"` + `title` PT nos 3 voxel; HUD PT ("Iniciar rodada", "Caixa 1 de 12: key:8gl33c:0 — clique na prateleira para a qual a chave é mapeada.", "Pressione iniciar."); projeção acessível 100% PT (`enTextPresent: false`).
2. **Live regions**: `.status` = `role="status" aria-live="polite"` nos 3 jogos (standalone + embutido); sonda de interação: mudança de texto com semântica de anúncio presente (`announcementsWouldFire: true`); projeção acessível com `role=status` + `aria-live=polite aria-atomic=true`.
3. **Alvos**: botões HUD agora **44px** de altura ("Iniciar rodada" 157×44; prateleiras 269×44; era 37px).
4. **Reflow @320 voxel**: PASS mantido (docScrollW=320; canvas 320×333 em y=0, HUD 320×307 em y=333 com scroll interno; botões operáveis).
5. **Reduced motion CSS**: media query declarada nos 4 apps; sob emulação `reduce` todas as durações computadas → `1e-05s` (voxel 32 elementos, pixel 24, literacy 40).
6. **Teclado/foco**: ciclos completos com outline visível 3px; host ⇄ iframe entra/sai corretamente ("← Hub" → "Usar visualização acessível" → iframe → conteúdo → Shift+Tab volta); nomes PT ("prateleira 5 · 0 caixas").
7. **Persistem (já delegados)**: P1 reflow literacy embutida (AID-271); P2 `code-input` wormhole sem nome estável (placeholder "código base62" como única fonte); P2 canvas voxel sem `aria-label` (pixel-quest mantém o seu); P2 axe (contraste `.route-badge`/`.mentor-mission-context`, `aria-prohibited-attr`); P3 headings duplicados H1+H2 na projeção e `iframe outline:none`.

## Limitações (idem baseline + novas)

1. Sem NVDA/VoiceOver real (proxy: árvore computada + semântica de live regions + MutationObserver); recomendo 1 passe NVDA+Firefox antes do GO final da coorte Dev.
2. Zoom 400% aproximado por viewport 320 CSS px.
3. Screenshots capturados sem inspeção visual por este agente (afirmações = medições DOM).
4. Caminho UI `/desktop → engines` do pixel-quest embutido não percorrido (deploy imutável pinado testado standalone; mesma URL que o host embute).
5. O comportamento da cena WebGL sob reduce é inferido por ausência de `matchMedia` no bundle publicado + comparação com o candidato `afd6789` (que o tem); não medi frames de render.

## Disposição

- Fatia §6 baseline (`ec265fa`) + re-execução (`61b85535`) **executadas e registradas com veredito por superfície**. Entregável de verificação da AID-264 completo.
- Defeitos residuais delegados com dono: **AID-271** (P1 reflow, backlog, FPE), **AID-272** (P2/P3, backlog, FPE) e nova issue filha para a **divergência de promoção/reduced-motion de cena** (CEO decide re-pin vs port).
- AID-264 → `done`.
