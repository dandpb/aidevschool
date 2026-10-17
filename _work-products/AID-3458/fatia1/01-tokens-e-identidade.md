# AID-3458 — Fatia 1 · Inventário de tokens SDLCQuest v1.3 e regras de adoção

Data: 2026-09-30 · Autor: UX Designer de Aprendizagem · Revisor de aceite: System Designer
Fonte canônica verificada: `engines/sdlc-quest/src/style.css` (+ `index.html`, `src/world.js`, `src/harness-style.css`).
O beta https://aidevschool-sdlcquest.netlify.app é **referência visual**; a escola canônica é `engines/sdlc-quest/index.html` + `src/`.

Decisão da issue (AID-3458/AID-3453): a superfície de entrada da escola única **reutiliza** a identidade do SDLCQuest v1.3. Nenhum sistema visual novo é criado.

## 1. Tokens verificados (copiar 1:1, não reinterpretar)

| Papel | Token | Valor verificado | Origem (style.css) |
| --- | --- | --- | --- |
| Fundo/papel | `--paper` | `#f5f3ec` | l.1 |
| Cartão | `--card` | `#fffef9` (variantes `#fffef8`, `#fbfaf4`, `#fbfaf5` já usadas) | l.1 |
| Tinta/texto | `--ink` | `#172935` | l.1 |
| Texto secundário | `--muted` | **`#4c6057`** (valor FINAL da v1.1; o `#64716f` da l.1 foi substituído na l.12) | l.12 |
| Linha/borda | `--line` | `#d9ded5` | l.1 |
| Mapa/painel-profundo | `--deep` | `#101d28` | l.1 |
| Menta (ação/concluído) | `--mint` | `#a7e6cd` (hover do primário `#baeeda`) | l.1 |
| Menta-escuro | `--mint-dark` | `#195d4b` | l.1 |
| Ouro (destaque) | `--gold` | `#e8c888` | l.1 |
| Coral (erro/atenção) | `--coral` | `#b64c36` | l.1 |
| Raio maior | `--radius` | `18px` (painéis/diálogos); cartões de opção `10px`; botões quiet `9px` | l.1, l.3 |
| Foco visível | — | `outline: 3px solid #12624c; offset 3px` (v1.1; todos os focáveis, incl. `summary`) | l.13 |
| Seleção | — | `::selection { background: var(--mint) }` | l.1 |

## 2. Tipografia

- Sans (todo o app): `'Avenir Next','Segoe UI',Arial,sans-serif` (`--sans`).
- Mono (eyebrows, metadados, código): `'SFMono-Regular',Consolas,'Liberation Mono',monospace` (`--mono`).
- **Georgia itálico SOMENTE no `<em>` do título** `.heading h1 em{font-family:Georgia,serif;font-weight:400;color:#527a69}` (l.1; mesmo padrão em `harness-style.css` `h2 em #426c53`). Não estender Georgia a nenhum outro elemento.
- Corpo ≥ 14px/1.75 na lição (padrão v1.1); eyebrow/mono 11px (nunca < 10px legível); títulos h1 `clamp(28px,3.2vw,46px)`.

## 3. Componentes-base reaproveitados (sem recriar)

- **Botão primário**: fundo `--mint`, borda `#86bfa7`, texto `#163b2d`, raio 9px, `min-height:46px`, sombra-base `0 2px 0 #82b49e`.
- **Botões quiet/icon**: transparentes, hover `#e6eae1`, raio 9px, `min-height:44px` (v1.1 l.25).
- **Cartão de opção (tentativa)**: `#fffef8`, borda `#ced9c7` → hover `#8da895` → selecionado `#579579` + `aria-pressed`.
- **Painel do mapa**: fundo `--deep`, raio 18px, HUD mono claro `#cbddd2`, rodapé com legenda (dot menta = disponível; dot `#52616a` = bloqueada) e botão "pausar cenário".
- **Mapa Canvas 2D**: papel/menta/ilhas preservados — cenário desenhado em Canvas (world.js: ilhas isométricas + circuito de fluxo), **sem novos assets obrigatórios**; rótulo acessível no canvas + fallback textual por botões (padrão `worldFallback`).
- **Diálogo de lição**: `<dialog>` nativo, raio 18px, topo sticky, `.lesson-primer` (exemplo acompanhado), `.step-dots`, `.feedback`, `.takeaway`.
- **Estágios/nós**: `.stage-node` com `aria-current`, `data-locked`, tick de conclusão; setas de progressão visíveis (nos pares `.pillars i →`).
- **Skip link** `.skip` (fixo, aparece no foco), **toast** `aria-live` (padrão l.1), **reduced motion**: `@media (prefers-reduced-motion: reduce)` zera animações/transições (l.8).

## 4. Regras de adoção na entrada da escola

1. **Copiar, não derivar**: cores/fontes/raios/foco usam os valores da tabela acima; nenhum token novo a não ser declarado neste contrato e aprovado pelo System Designer.
2. **Um sinal de progresso por tela** na entrada: "Fundamentos 0/4" (ver mapa de atrito 02). Contadores de jogo (18/16/6) vivem dentro do detalhe "prática opcional", nunca no primeiro paint.
3. **Jargão zero de OS/admin** na entrada: nada de "desktop", "dock", "janela", "terminal", "admin". Linguagem: escola, trilha/jornada, lição, prática.
4. **Quebra-grelha 630px** existe na fonte (l.54–71) mas **não validada ao vivo** — fica como verificação pendente da QA (RC-5), não como claim.
5. Extensões permitidas (bounded): rótulo de jornada no mapa (ouro p/ "IA no cotidiano", menta-escuro p/ "IA para Dev"), desde que com os tokens existentes.
6. O protótipo (artefato 03) é **local e demonstrativo**: não escreve estado canônico, não marca mastery (respeita produtor/verificador e contratos AID-641/909 preservados).

## 5. Fora de escopo desta fatia

- Novo sistema visual, novos assets obrigatórios, animações novas além do cenário existente.
- Redesenho global da experiência OS (coordenado via pai AID-3453 quando a fatia for aprovada).
- Deploy/produção.
