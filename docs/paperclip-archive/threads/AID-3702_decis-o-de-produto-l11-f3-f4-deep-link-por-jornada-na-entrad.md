# AID-3702: Decisão de produto (L11/F3+F4) — deep-link por jornada na entrada e caminho de volta app -> /escola/

- **Status:** done | **Priority:** low | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-10-01T21:40:54.742362+00:00 | **Updated:** 2026-10-17T16:29:58.132+00:00
- **ID:** `b3061d9e-ff79-459b-8727-2c1777897a81`

## Description

Achados AID-3685 L11 (matriz linhas 8 e 12, evidência /paperclip/aid3685-evidence/2026-10-01-l11-growth-web-entrada-links.md).

F3: não há deep-link por jornada — App.tsx não lê URLSearchParams/hash; a troca de jornada é estado interno (HomeScreen.tsx:137-160); todos os CTAs da entrada apontam para "/" (escola.js:53,86). Impede campanha/entrada direta Dev e atribuição por jornada no funil.

F4: o app não linka de volta para /escola/ (grep "escola" em engines/literacyDojo/src = 0 hits) — quem entra pela escola não consegue voltar à visão de duas jornadas.

Decisão de produto (UX + Growth, aceite PO); sem mudança de produto durante a rodada QA-ROUND.

## Acceptance Criteria

- Decisão documentada: entrada direta por jornada (ex. /?journey=dev ou rota) sim/não e por quê
- Decisão documentada: link de retorno do app para /escola/ (porta de mão única hoje) sim/não e onde (Home/Footer)
- Se GO: issues técnicas derivadas para Growth Web + Learner App com escopo pequeno

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3702 — Decisão de produto (L11/F3+F4) — deep-link por jornada na entrada e caminho de volta app -> /escola/
- Status: done
- Priority: low
- Current mode: review
- Last updated by run: 7be6ffab-9ee6-49d5-be53-7798144e3b46
- Agent: CEO (opencode_local)

## Objective

Achados AID-3685 L11 (matriz linhas 8 e 12, evidência /paperclip/aid3685-evidence/2026-10-01-l11-growth-web-entrada-links.md).

F3: não há deep-link por jornada — App.tsx não lê URLSearchParams/hash; a troca de jornada é estado interno (HomeScreen.tsx:137-160); todos os CTAs da entrada apontam para "/" (escola.js:53,86). Impede campanha/entrada direta Dev e atribuição por jornada no funil.

F4: o app não linka de volta para /escola/ (grep "escola" em engines/literacyDojo/src = 0 hits) — quem entra pela escola não consegue voltar à visão de duas jornadas.

Decisão de produto (UX + Growth, aceite PO); sem mudança de produto durante a rodada QA-ROUND.

## Acceptance Criteria

- Decisão documentada: entrada direta por jornada (ex. /?journey=dev ou rota) sim/não e por quê
- Decisão documentada: link de retorno do app para /escola/ (porta de mão única hoje) sim/não e onde (Home/Footer)
- Se GO: issues técnicas derivadas para Growth Web + Learner App com escopo pequeno

## Acceptance Criteria

- Decisão documentada: entrada direta por jornada (ex. /?journey=dev ou rota) sim/não e por quê
- Decisão documentada: link de retorno do app para /escola/ (porta de mão única hoje) sim/não e onde (Home/Footer)
- Se GO: issues técnicas derivadas para Growth Web + Learner App com escopo pequeno

## Recent Concrete Actions

- Run `7be6ffab-9ee6-49d5-be53-7798144e3b46` finished with status `failed` at 2026-10-17T16:29:50.350Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): Failed to execute statement

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `7be6ffab-9ee6-49d5-be53-7798144e3b46` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation] Aceite da decisão de produto L11/F3+F4 — deep-link por jornada + retorno app → /escola/ (expired)

CEO propõe GO nas duas frentes: D1 entrada direta por jornada via ?journey= (não rota nova) e D2 link de volta para /escola/ no footer da Home. Issues derivadas AID-3704 e AID-3705 em backlog, gated: começam só após aceite e fim da QA-ROUND.

## Comments (4)

**?** · 2026-10-01T21:49:22.316116+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `032d0b81-c3e6-41e6-8698-50af3bcb94e3`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**CEO** · 2026-10-01T22:08:28.360424+00:00

**Recibo recuperação AID-3702 (CEO, run status-only)** — o run anterior morreu em falha de adapter (`opencode models` timeout), não por problema da tarefa. A decisão de produto L11/F3+F4 foi elaborada e está pronta para formalização. Rascunho integral (será promovido a documento `decision` + issues derivadas no próximo run de modelo normal; este run económico não pode escrever documentos/artefatos — recusado pela API com `status_only`):

**D1 — Entrada direta por jornada: GO, via `?journey=` (não rota nova).** Formato `/?journey=dev` e `/?journey=ia`; ausente/inválido = comportamento atual. Razões: (1) menor escopo — `App.tsx` lê `URLSearchParams` no boot e seta jornada inicial (hoje só estado interno, `HomeScreen.tsx:137-160`); sem router/SW/Netlify novos; (2) funil — param viaja na URL, compõe com UTM, habilita campanha Dev e atribuição por jornada (o núcleo do F3); (3) não-quebrante/reversível. Descartadas: rota `/dev` (mais superfície, mesmo ganho) e hash (frágil). Naming `journey` consistente com `journeySwitchFlow`. Lado entrada: card Dev → `/?journey=dev`, card IA mantém `/` (`escola.js:53,86`), re-pin de hashes em `escola-honesty.test.ts` coordenado com a issue de copy F1 (um único re-pin).

**D2 — Retorno app → /escola/: GO, link discreto no footer da Home.** Rótulo honesto (ex.: “Escola de IA · ver as duas jornadas”); nada no header para não competir com o loop de aprendizado. Hoje a porta é de mão única (grep `escola` em `src/` = 0 hits, F4) e a segunda audiência (Dev) é o que a escola apresenta.

**Gates:** nenhuma mudança de produto durante a QA-ROUND; issues derivadas (Growth Web + Learner App, escopo pequeno) serão criadas como backlog sem atribuição; início só após aceite do PO nesta decisão e fim da rodada; F1 (copy) pousa antes/junto do ajuste de CTAs.

**Próximo passo (run normal):** PUT documento `decision`, criação das 2 issues derivadas (children, backlog), `request_confirmation` para aceite do PO, disposição `in_review`.

**CEO** · 2026-10-01T22:10:29.132649+00:00

**Fecho da rodada AID-3702 (CEO):** issues técnicas derivadas criadas como children em backlog, sem atribuição e sem despacho — gate duplo (aceite do PO nesta decisão + fim da QA-ROUND):

- AID-3704 — Growth Web: CTAs da entrada `/escola/` → `/?journey=dev` + atribuição por jornada (coordenação de re-pin com a issue F1).
- AID-3705 — Learner App: boot lê `?journey=dev|ia` + link de volta `/escola/` no footer da Home.

`request_confirmation` pendente para aceite do PO da decisão GO (D1+D2). Disposição: `in_review` com caminho de aceite ativo. Após aceite: promoção do rascunho ao documento `decision` (este run económico teve escrita de documento recusada pela API) e despacho das children pelo fluxo normal de fila.

**founder** · 2026-10-17T16:15:34.049645+00:00

✅ DECISÃO DE PRODUTO APROVADA PELO FOUNDER: Aprovado deep-link `?journey=dev|ia` na entrada `/escola/` e link de retorno no footer do Learner App (AID-3704 e AID-3705).

---

