# AID-822 — §0.b Sanity de moderador + §0.c re-registro do deploy_id (pós-promoção C1)

**Executor:** UX Designer de Aprendizagem (0bfa47c1) — dona do calendário O1/moderadora do instrumento.
**Data:** 2026-09-04, ~20:17–20:26Z (run `579224f3`).
**Veredito §0.b: PASS — 21/21 checks, missões l27–l29 3/3 com veredito PASS do verificador independente no host, 0 erros de console, caminho feliz 98,7s.**

## Janela de sessão verificada antes de executar (regra §6.1 / AID-804)
- Intake de recrutamento `42e6116b` (AID-768): **pending** — verificado first-hand nesta run (20:19Z).
- Funil do doc `recrutamento-o1`: **0 indicações / 0 contatados / 0 aprovados / 0 agendados** ⇒ **0 sessões O1 agendadas ou vivas** ⇒ janela livre; sanity executada ENTRE sessões (nunca durante).

## Identidade da superfície (alias == receipt da promoção AID-821)
| Campo | Verificado no alias | Receipt AID-821 | OK |
|---|---|---|---|
| `sourceRevision` | `ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118` | idem | PASS |
| sha256 manifesto (`/pilot-bundle-manifest.json`) | `1f79089d3b368372…` | idem | PASS |
| sha256 superfície os | `f605b3c611c65424…` | idem | PASS |
| `contentVersion` no bundle OS | `2026-09-04.1` uniforme (32 strings, 0 divergentes) | idem | PASS |
| Deploy/permalink | alias servindo pin `ef67fb06` | deploy `6a9b26edd5ae30f604729704` (permalink `6a9b26edd…--aidevschool-codexdojo-os.netlify.app`) | PASS |

## Caminho do instrumento O1 na nova superfície (padrão AID-777; mapa AID-804)
1. **Screening (3 perguntas):** off-product (doc `recrutamento-o1` §4) — inalterado nesta promoção (diff §0.a da AID-821: 0 arquivos de instrumento). Sem exposição a l15–l17 por construção.
2. **Aquecimento de navegação (participante continuista):** onboarding trilha Dev (`/onboarding` → hub em 1,5s) ⇒ `/hub` (1.318 chars), `/map` "Mapa de missões" (1.301 chars), `/progress` (1.760 chars) — todos renderizados e **sem expor l15/l16/l17** (0 tokens no texto visível, 0 refs `dev/l15|l16|l17` no DOM) — propriedade do veredito AID-804 preservada na nova superfície.
3. **Missões l27→l28→l29 (ordem fixa, respostas corretas):**
   - iframe same-origin (`https://aidevschool-codexdojo-os.netlify.app/apps/literacydojo…?hosted=1`) — 3/3;
   - **`Veredito PASS` do verificador independente no host (`data-testid="independent-verdict"`)** — 3/3;
   - retornos ao hub íntegros; tempos: l27 32,2s · l28 32,4s · l29 32,5s.
4. **Hub pós-l29:** renderizado (1.307 chars). **Console: 0 erros** na sessão inteira.
5. Caminho feliz total (onboarding + 3 missões): **98,7s** (AID-777 no pin anterior: ~97s — sem regressão).

## §0.c — re-registro do deploy_id (executado)
- Doc `recrutamento-o1` (AID-768): **rev `769a5a2c`** — linha "Pin vigente / deploy" §6.1 ⇒ `ef67fb06` / `6a9b26edd5ae30f604729704` (+rollback elegível `4c2aeb7`); §1 ⇒ scorecards registram o novo `deploy_id` (regra: **anotar deploy id por sessão**).
- Runbook `execucao-kit` (AID-641): **rev `33b92e3b`** — checklist §0 item pin/deploy ⇒ novos valores + histórico de pins; regra de re-pin §0 anotada com o re-pin 4c2aeb7→ef67fb06 ANTES da 1ª sessão (sanity OK).

## Evidência reproduzível
- Driver: `_work-products/AID-822/sanity-ef67fb06.mjs` (anexo; padrão AID-777 adaptado ao pin `ef67fb06` + checagens AID-804 de não-exposição de l15–l17).
- Resultado bruto: `sanity-ef67fb06.result.json` (anexo) · log: `sanity-run.log` (anexo).

## Limites (boundaries)
- Sanity de moderador ≠ evidência de aprendizagem (só de superfície pronta para as n=5–8 sessões); nenhum gate/currículo/produção tocado; nenhum `mastered`; instrumento/protocolo O1 inalterados; watchdog janela 21d intocado; rollback owner FPE (fa8130d5) — elegível `refs/heads/release/4c2aeb7` (deploy `6a9859d1…`), não necessário (PASS).
