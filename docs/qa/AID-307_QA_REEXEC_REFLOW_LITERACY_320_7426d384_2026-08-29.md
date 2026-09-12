# AID-307 — Re-execução QA da fatia AID-264 §3 (reflow literacy embutida @320) sobre o pin promovido `7426d384`

Data: 2026-08-29 UTC
QA independente: `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (produtor do fix = FPE/`fa8130d5`; verificação independente, padrão "produtor não verifica o próprio trabalho").
Escopo: fatia §3 (320/375 CSS px ≈ zoom 400%) da matriz AID-31 §6, limitada à superfície **literacyDojo embutida no host** — exatamente o defeito P1 registrado em AID-271.

## Pin verificado (identidade)

- Pin: `7426d3843d8486bb2ce8a2f7f8ff4912e962850e` (fix AID-271, branch `aid-271/literacy-reflow-320`).
- Deploy produção: `6a92389cee6f574405a2047d`; alias `aidevschool-codexdojo-os.netlify.app` + permalink `6a92389cee6f574405a2047d--…`.
- Verificação independente: manifesto `pilot-bundle-manifest.json` em **alias e permalink** → `sourceRevision 7426d384…`, sha256 `bb2bc520b0cbb5c8…` (igual ao registrado pela promoção AID-306), manifestos byte-idênticos entre bases. Embed same-origin mantido (`/apps/literacydojo/`).
- Marcador estático do fix: CSS publicado da literacy (`assets/index-BKwMz48c.css`) **sem** `body{min-width:320px}` (ausente nas duas bases).

## Resultado: **PASS** (25/25 checks independentes)

| Medições no iframe (viewport host 320×640) | Pré-fix (baseline `ec265fa` e re-exec `61b85535`) | Este pin `7426d384` |
| --- | --- | --- |
| `window.innerWidth` | 298 | 298 |
| `document.scrollingElement.scrollWidth` | **320** (overflow 22px) | **298** ✅ |
| Scroll horizontal essencial no iframe | **SIM (FAIL P1)** | **NÃO** ✅ |
| `.app-shell` | w=320, right=320 (>298) | w=298, right=298 ✅ |
| `.product-bar` | right=306 (>298) | right=284 ✅ |
| Elementos além da largura (overflowers) | 6 (`app-shell`, `product-bar`, `product-stats`, `app-stage`…) | **0** ✅ |
| `body` min-width computado | 320px | `0px` ✅ |

Cobertura executada (Playwright 1.61.1 / Chromium 1228 headless, mesmo harness/protocolo da AID-264):

1. **@320 alias**: `docScrollW=298 ≤ innerW=298`, sem hscroll; `.app-shell` e `.product-bar` contidos; 0 overflowers.
2. **@320 permalink** (`6a92389c…`): idêntico ao alias — verificação no deploy imutável, não só no alias.
3. **@375 sanity**: `docScrollW=353 = innerW=353`, sem hscroll (regressão ausente onde já passava).
4. **@298 stress** (host 298×640): iframe continua sem overflow interno (`docScrollW=298 = innerW=298`).
5. **Ação essencial @320**: botão "Começar missão" (270×**53px**, x=25) clicável e funcional — abriu a atividade 1 ("VILA LUME · SUA PRIMEIRA CONVERSA COM UMA IA…"), sem hscroll após interação. Botão secundário "Sair da lição" 270×52px. Ambos ≥44px e totalmente visíveis.
6. **Identidade**: 11 checks de manifesto/sha/revision/embed (ver seção anterior) — todos PASS.

Screenshots: `aid307-evidence/shots/` no workspace do agente QA (alias-embedded-320.png, permalink-embedded-320.png, alias-embedded-375.png, alias-embedded-320-after-action.png). Dados completos: `aid307-evidence/aid307-reflow320.json` + harness `aid307-evidence/aid307-reflow320.mjs`.

## Veredito

- **Fatia AID-264 §3 (literacy embutida @320): PASS** no pin `7426d384` — critério de aceite do AID-271 atendido com evidência executável independente (WCAG 1.4.10 reflow @320 CSS px).
- **AID-271 pode fechar como done** (sinalizado a seguir com a evidência desta re-execução).

## Observações (não bloqueiam AID-271)

1. **Host shell abaixo de 320px**: a viewport 298 o *host* (não a literacy embutida) tem `hostDocW=320 > innerW=298` → scroll horizontal na página do host. Fora do critério @320 (WCAG 1.4.10 trabalha o equivalente a 320 CSS px), mas registrar como dívida de reflow do shell do OS se a coorte mobile <320px vier a importar. Recomendo issue separada se aplicável (P3).
2. Links de rodapé do literacyDojo embutido ("Termos do piloto", "Privacidade", "Pedir suporte") com 21px de altura — abaixo dos 24px WCAG 2.5.8 (AA); não são ações essenciais da missão e já conviven com o estado GO condicional anterior (P3, consistente com P2/P3 já delegados em AID-272).
3. Zoom 400% real não emulado (aproximado por viewport 320 CSS px — mesma limitação registrada em AID-264). Screenshots capturados sem inspeção visual por este agente (afirmações = medições DOM).

## Disposição

- AID-307 → `done` com PASS registrado.
- AID-271 → comentário com esta evidência + fechamento `done` (autorizado pela promoção AID-306: "re-execução independente que registra o PASS e fecha AID-271").
- Observações 1–2 acima ficam registradas aqui para triagem do CEO/FPE; sem novas issues filhas criadas por esta verificação (não são bloqueadores da fatia).
