# Intent: registro do fix XSS dojoToday numeric fields (PR #460, origem Sentinel/Jules)

> **RETROSPECTIVE RECORD (post-merge)** — criado em 2026-09-16 pelo FPE sob
> AID-2201. O PR #460 foi mesclado pelo CEO (`dandpb`) em
> **2026-09-16T20:35:27Z** (merge commit `58098bb52902a892e628829f6adbfb2ebfec54d2`,
> mensagem "CEO countersign, CI 29+1skip") **25 segundos após a abertura da
> triagem AID-2201** (20:35:02.608Z), que exigia veredito first-hand + registro
> de produtor **antes** de qualquer merge. Nem este registro nem o veredito
> independente existiam no momento do merge — recorrência da classe
> **AID-767/F1** (produtor externo sem registro fast-path pré-merge), mitigada
> na época pelo retrofit AID-771 (`intent/2026-09-03-xss-dojotoday-sentinel/`).
> Eixo de aceitação: founder merge é caminho válido per AID-1136; CI verde no
> head é fato verificado abaixo. O que faltava — registro do produtor e veredito
> independente — é suprido por este par `intent.md`/`plan.md` retroativo e pelo
> veredito first-hand citado. Registro retroativo nunca substitui veredito
> independente; produtor ≠ verificador permanece.

Author: Sentinel/Jules (bot externo, produtor do fix; task 1256405595406003203) · registro retroativo: FPE (AID-2201) · Change-id: AID-2201-dojoToday-xss-sentinel · Status: accepted (veredito VÁLIDO pós-hoc; fix correto; registro docs-only)

## Problem

O Sentinel reportou **HIGH**: "Untrusted string interpolation directly into
`innerHTML` without escaping in `streakCard` and `progressCard` for
conceptually numeric fields" em `engines/dojoToday/src/main.ts`. PR #460
(criado 2026-09-16T19:59:51Z, head `39f283be57f0566c985b8a13edf4bea28b4c6900`,
base `fb4dbc77`) interpolações cruas de `s.current`, `s.longest`,
`s.freezesMax` (attr `title`), `s.masteredCount`, `s.totalUnits` e `pct`
(style) em template string terminado em `root.innerHTML` (`main.ts` boot()).

Detecção na casa: recibo AID-2192 (20:27:22Z) — "fora do escopo AID-2192;
sugerido rotear ao owner de segurança"; sem triagem até AID-2200/AID-2201.

## Veredito first-hand (FPE, sessão AID-2201, 2026-09-16 ~20:4x–21:0xZ)

**VÁLIDO — sink real e executável pré-fix; não-explorável no estado entregue
(attack surface requer read model corrompido); fix correto e completo para a
classe do sink.** Metodologia e evidências:

1. **Controle negativo pré-fix (worktree dedicada @ base `fb4dbc77`)**: fixture
   hostil via seam `DOJOTODAY_TODAY_MODULE` (`engines/dojoToday/vite.config.ts`
   alias de `./data/today`) com payloads HTML em campos numericamente tipados
   (`current`, `longest`, `freezesMax`, `masteredCount`). Resultado:
   `XSS FLAGS: {"mastered":1}` (payload em `masteredCount` **executou** via
   `<img onerror>`) e handler `onmouseover="window.__xssTitle=1)"` **injetado**
   pelo breakout do atributo `title` via `freezesMax` — prova de execução,
   não só de sink.
2. **Prova pós-fix (@ `58098bb5`, `_default`)**: mesma fixture/probe →
   `XSS FLAGS: {}`, `PAGEERRORS: []`, `onmouseover: null`, payloads renderizados
   como texto literal (`&lt;img src=x onerror=…`); branch `s.current > 0` com
   string hostil cai no fallback (NaN > 0 = false) — gate documentado, não XSS.
   Probe: 1 passed.
3. **Alcance do dado (explorabilidade)**: `src/data/today.ts` é **AUTO-GERADO**
   por `learner/substrate/adapters/dojotoday.py` no prebuild — build-pinned, sem
   caminho de rede em runtime; a rota hosted `?host=os` renderiza só
   `renderLocalSuggestion` (escapada desde PR #262, guardada por PR #264) e não
   renderiza streak/progress. Logo: pré-fix, exploração exigia substrate/build
   corrompido — severidade prática BAIXA no estado entregue; severidade HIGH per
   política do scanner (sink innerHTML) — mesma classe da triagem AID-753
   ("sink real, não-explorável no estado de então"). Defesa em profundidade é a
   convenção do arquivo (todos os campos textuais já eram escapados).
4. **Corretude/completeza do fix**: 6 interpolações agora com `escapeHtml`
   (helper `src/escape.ts`, assinatura `unknown` aceita números); coerção
   `Number(...)||0` protege `.repeat()`/aritmética; interpolações restantes no
   arquivo são literais confiáveis/índice de loop (`--i:${index}`). Checks
   estáticos first-hand @ `58098bb5`: `npm run selfcheck` OK; `npx biome check`
   limpo (16 files); `npx tsc --noEmit` limpo; `npx vite build` OK.
5. **CI (GitHub API, first-hand)**: head `39f283be` = 39 check-runs, 38 success
   + 1 skipped, incluindo `SDLC guardrails (diff)` e `dojoToday (TS +
   substrate)` success. Merge `58098bb5` (tree `431fe399`, idêntica ao head):
   38 success + 1 skipped + **1 failure `product readiness (claims)`**
   (run 35147464091) — ver Consequência de readiness abaixo.
6. **Inexatidão do relato do produtor**: o corpo do PR alega "Ran `pnpm test`" —
   `engines/dojoToday/package.json` **não tem script `test`** (gates reais:
   `selfcheck`, `lint`, `build`, `test:readiness`). Motivo a mais para veredito
   independente obrigatório: o bot não verifica o próprio diff.

## Consequência de readiness (não tratada no merge)

`product readiness (claims)` @ `58098bb5`: STALE-WINDOW
`dojotoday-daily-guidance` — "recorded pass/customer-ready vs current
stale/None" nos 3 cenários (source fingerprint stale). O claim registrado
(@ `8eb0ada0`, 16:46:40Z) é anterior ao diff de código do #460; mesmo diff de
código muda o fingerprint — precedente exato da cadeia #262/#265 (downgrade
mecânico + re-grant com evidência independente; ver
`docs/product-readiness/assessments/2026-09-04-289cdbd-dojotoday-xsschain-regrant-v28.yaml`).
A falha `pixelquest-evidence-encounter` no mesmo check **pré-existe** @
`fb4dbc77` (20:17:52Z) — não atribuível ao #460. `docs/product-readiness/README.md`
é projeção gerada (`tools/cli.py render`) — não editar à mão; re-grant via
pipeline canônico. Follow-ups abertos como issues filhas de AID-2201:
(1) guarda de mutação numeric-fields; (2) downgrade+re-grant
`dojotoday-daily-guidance`.

## Affected users and systems

- `engines/dojoToday/` — `src/main.ts` (único arquivo do diff do #460, +9/−6);
  sem mudança de boundary: superfície segue read-only, não escreve
  `learner/learning_state.yaml`, não marca mastered.
- Readiness `dojotoday-daily-guidance` — stale mecânico pós-diff (follow-up).
- Sem toque em outras engines, substrate ou segredos.

## Constraints

- Aceitação de merge de bot PR exige (AID-1136, `docs/sdlc/README.md`
  §PRs automatizados/§External-origin PRs): registro de produtor pré-merge +
  CI verde no head (incl. sdlc-guards) + aceitação registrada. Aqui: CI verde
  ✔ (head), aceitação = founder merge ✔ (caminho válido); registro pré-merge ✖
  (suprido retroativamente por este change) — desvio registrado, não apagado.
- Producer ≠ verifier: este registro é o lado produtor/casa; o veredito acima é
  a triagem house-side exigida pela AID-2201; a guarda de mutação (follow-up)
  exigirá countersign independente.
- Este change (AID-2201) é docs-only: 2 arquivos em `intent/`; sem código, sem
  readiness, sem segredos.

## Open questions

Nenhuma em aberto para o veredito. Em follow-up: janela do re-grant factory
(AID-1357) para `dojotoday-daily-guidance` após a guarda de mutação pousar.
