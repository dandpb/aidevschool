# AID-264 — Verificação independente de acessibilidade (fatia AID-31 §6) sobre o piloto pinado `ec265fa`

Data: 2026-08-28 UTC
QA independente: `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (nenhuma das mudanças verificadas foi produzida por este agente)
Alvo: bundle do piloto pinado — manifesto `pilot-bundle-manifest.json` re-verificado idêntico ao registro de 2026-08-28 (`sourceRevision ec265fab13ac98700e9de58b5d719d55d979178d`, SHA-256 por superfície conferidos).
Artefatos: `qa-aid264/` no workspace do agente QA (results.json, geometry320.json, accessible-frame.json, accessible-view.json, wormhole-input.json, audit.mjs, evidence/*.png).

## Ambiente e comandos

- Linux, Node v24.18.0; Playwright 1.61.1 + Chromium headless (build 1228) do `engines/codexdojo-os-prototype/node_modules`; axe-core 4.13.0.
- Harness: `qa-aid264/audit.mjs` — por superfície: meta/idioma, árvore semântica (headings/landmarks/live regions/nomes), axe, emulação `prefers-reduced-motion`, viewports 320/375/1280 com medição de overflow/oclusão, varredura Tab/Shift+Tab/Enter/Escape com estilo de foco computado, entrada/saída de iframe, e sonda de interação (MutationObserver no `.status` do HUD voxel).
- Imutabilidade: `curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json` byte-idêntico ao permalink salvo; superfícies: alias canônico + deploys Netlify pinados (literacy `6a8ddc9afe…`, pixel `6a8e1f4c59…`) + `/apps/warehouse|wormhole|relay-station`.

## Veredito por superfície

| Superfície | Veredito | Bloqueadores (P0/P1) | Observações (P2/P3) |
| --- | --- | --- | --- |
| voxel 02-warehouse (standalone + embutida) | **NO-GO** | idioma `lang="en"` com copy mista EN/PT-BR; `.status` do HUD sem live region (mudanças não anunciadas); `prefers-reduced-motion` ausente (CSS e JS = 0 ocorrências) | canvas sem nome acessível; alvos 37px < 44px; axe landmark-one-main/region; projeção acessível tem `role=status` e copy PT (mitigação parcial, com headings duplicados e copy ainda mista) |
| voxel 03-wormhole (standalone + embutida) | **NO-GO** | idem warehouse (3 mesmos P0, evidência por superfície) | + `input[type=text]` (`data-testid=code-input`) sem label/aria-label/title — nome acessível depende só de placeholder |
| voxel 05-relay-station (standalone + embutida) | **NO-GO** | idem warehouse (3 mesmos P0) | idem warehouse |
| pixel-quest (deploy pinado embutido pelo host) | **NO-GO contratural** | `prefers-reduced-motion` ausente (CSS do app: 0 animações/transições; JS: 0 `matchMedia`) — lacuna P0 registrada no contrato AID-31; movimento do game loop inalterado sob reduce | axe page-has-heading-one (moderate); canvas TEM `aria-label` (ponto positivo vs voxel) |
| literacyDojo standalone | **GO** | — | axe: color-contrast serious `.route-badge`; aria-prohibited-attr `.onboarding-progress` |
| literacyDojo embutida no host (@320) | **GO condicional** | **P1**: scroll horizontal essencial dentro do iframe a 320px (app-shell 320px vs frame 298px; passa a 375px) | idem standalone |
| Host OS (mission shell, PT-BR) | **GO** | — | color-contrast serious `.mentor-mission-context`; iframe do motor com `outline: none` quando focado |

**Leitura de release:** a fatia §6 falha em ao menos um critério P0 em 4 de 5 superfícies → **a empresa não pode alegar conformidade cross-engine de design/acessibilidade neste estado** (consistente com a recomendação já registrada em AID-31). Caminho no-code (host + literacyDojo) permanece viável; recomendo corrigir o reflow @320 embutido (P1) antes de expor coorte em mobile 320px.

## Evidência por dimensão

### 1. Leitor de tela (proxy executável; ver Limitações)

- HUD voxel: `.status` é `div` sem `role`/`aria-live` (warehouse `hud.ts:15`, wormhole `:14`, relay `:10` confirmados no DOM publicado). Sonda de interação: clique em "Start wave" → MutationObserver registrou ≥1 mudança de texto (ex.: "Crate 1/12: key:8gl33c:0 — click the shelf…") **sem semântica de anúncio** → leitor de tela não anuncia a mudança de fase/feedback.
- Projeção acessível do warehouse (após "Usar visualização acessível" no host): existe `role=status` com copy PT-BR ("Caixa 1 de 12: key:8gl33c:0") — anúncio funciona **apenas** nesta visualização alternativa; headings duplicados (H2+H1 "L1 — Hash → shelf") e copy mista EN persistem ("Predict the shelf for…", "shelf 0 · 0 crates").
- Host mission shell: `aria-live="polite"` na seção de estado ("Etapa Responder Motor running…") e no painel do mentor — correto.
- literacyDojo landing: 5 landmarks rotulados, 2 headings, 0 controles sem nome; live regions de feedback aparecem só durante a atividade (não amostradas nesta fatia — limitação).
- Nomes acessíveis: 0 links sem texto em todas as superfícies; wormhole tem 1 controle com nome apenas via placeholder.

### 2. Reduced motion

| Superfície | Media query declarada | Comportamento sob reduce |
| --- | --- | --- |
| voxel 02/03/05 | não (CSS publicado sem a query; JS sem `matchMedia`) | nenhuma mudança; loop 3D continua (movimento em canvas não governado por CSS) |
| pixel-quest | não (CSS: 0 animações/transições; JS: 0 `matchMedia`) | nenhuma mudança; game loop em canvas continua |
| literacyDojo | sim (1 bloco; CSSOM confirma) | durações → `1e-05s` (efetivamente 0) em 40 elementos — implementação correta |
| host shell | sim (não medida nesta fatia; sem animações detectadas) | n/a |

### 3. 320/375 CSS px (+ zoom 400% aproximado por viewport 320px, ver Limitações)

- voxel 02/03/05 standalone: **PASS** — sem scroll horizontal essencial (`docScrollW` = viewport); HUD empilha abaixo do canvas (ex. warehouse: canvas 320×333 em y=0, HUD 320×307 em y=333 com scroll interno); botões primários operáveis (ex. "Start wave" x=18 y=546 w=118 h=37).
- voxel embutidas: **PASS** (frame interno ~298–353px, `docScrollW` 298 @320 sem overflow).
- literacy standalone @320: **PASS** (sem overflow). literacy embutida @320: **FAIL (P1)** — medição dentro do iframe: `docScrollW=320` vs `innerW=298` → overflow de 22px causado por `app-shell` w=320 e `.product-bar` right=306 > 298.
- pixel @320/375: **PASS** (sem overflow; controles visíveis).

### 4. Teclado/foco

- Standalone voxel: Tab percorre canvas→Start wave→botões de jogo com retorno ao primeiro stop (ciclo completo); foco sempre visível (`outline: solid 3px rgb(255,213,79)`); Escape não altera foco (não há overlay).
- Host→iframe: ordem "← Hub" → "Usar visualização acessível" → iframe; dentro do iframe os controles do jogo são alcançáveis com foco visível; Shift+Tab retorna ao host ("← Hub") — entrada/saída de iframe funcional nos 4 caminhos de missão.
- literacy standalone: links/botões com foco visível (3px), ciclo completo.
- pixel: canvas (com aria-label) + 3 botões com foco visível (2px).
- Nota P3: o elemento `iframe` do host computa `outline-style: none` quando focado (indicador do contêiner invisível; conteúdo interno continua navegável).

### 5. Idioma

- voxel 02/03/05: `lang="en"` + `title` EN, mas aside rotulado PT-BR ("Controles e explicação da missão") e projeção acessível PT-BR — página mista dentro de jornada PT-BR. **P0 confirmado com evidência de DOM publicado.**
- literacy (`pt-BR`), pixel (`pt-BR`), host (`pt-BR`): coerentes.

## Defeitos e triagem

| ID ref | Severidade | Defeito | Produto vs infra |
| --- | --- | --- | --- |
| P0-a | bloqueador | voxel 02/03/05 `lang="en"` + copy mista | produto (registrado em AID-263) |
| P0-b | bloqueador | voxel 02/03/05 `.status` sem live region | produto (registrado em AID-263) |
| P0-c | bloqueador | voxel+pixel sem `prefers-reduced-motion` (declaração e comportamento) | produto (registrado em AID-263) |
| P1-d | alto | literacy embutida: reflow falha @320 (scroll horizontal essencial no iframe) | produto — novo achado desta fatia |
| P2-e | médio | wormhole `code-input` sem nome acessível estável (placeholder como única fonte) | produto |
| P2-f | médio | axe serious: contraste `.route-badge` (literacy), `.mentor-mission-context` (host); `aria-prohibited-attr` `.onboarding-progress`; canvas voxel sem nome acessível; alvos 37px < 44px no HUD voxel | produto |
| P3-g | baixo | iframe do host com `outline: none`; headings duplicados na projeção acessível | produto |
| Infra | não-produto | NVDA/VoiceOver reais e inspeção visual de screenshots indisponíveis neste runner (ver Limitações) | infraestrutura |

## Limitações

1. **Leitor de tela**: nenhum NVDA/VoiceOver real neste ambiente. Evidência usa árvore de acessibilidade computada (roles/nomes/live regions via DOM+axe) e MutationObserver sobre regiões de status — prova a (falta de) semântica de anúncio, não a transcrição de um SR real. Recomendo 1 passe manual NVDA+Firefox antes do GO final da coorte Dev.
2. **Zoom 400%**: aproximado por viewport 320 CSS px (equivalência WCAG 1.4.10); zoom real de browser não emulado.
3. **Screenshots** capturados (evidence/*.png) mas não inspecionados visualmente por este agente; toda afirmação de layout vem de medições DOM (bounding boxes/computed styles).
4. **pixel-quest embutido** testado no deploy imutável pinado no host (mesma URL que o bundle embute); o caminho UI `/desktop → engines` não foi percorrido nesta fatia.
5. literacy: live regions de feedback verificadas apenas no estado landing; estados `verifying/erro` (AID-31 R2) não re-mostrados aqui.

## Disposição

- Fatia baseline sobre `ec265fa`: **executada e registrada** — 4/5 superfícies NO-GO (P0 confirmados com evidência independente), 1 novo P1 (reflow @320 literacy embutida).
- Re-execução pós-AID-263: **pendente** — bloqueada pelo fechamento dos P0 por engenharia (AID-263, in_progress, Founding Product Engineer). Este relatório é a baseline contra a qual a re-execução comparará.
