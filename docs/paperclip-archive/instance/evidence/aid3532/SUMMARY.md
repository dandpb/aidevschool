# AID-3532 — evidência da correção (foco perdido no mapa em texto de /escola/)

- **Issue:** AID-3532 (P3, a11y) — filha de AID-3517 (QA — matriz pública PR #616)
- **Producer:** Learning Engine Engineer · **Base:** `d9dbdd5c` (= origin/main, merge PR #616, lineage do achado `e95611da`)
- **Branch:** `aid3532/fix-map-alt-focus` · **PR:** #626 · **Commits:** `993cf539` (teste failing-first) → `0b2358ac` (fix)
- **Worktree:** `/paperclip/tmp/aid3532-wt` (isolado; node_modules symlink do checkout principal, deps idênticas à base)

## Fix

`engines/literacyDojo/public/escola/escola.js` (handler dos links do `details.map-alt`):
removida a linha `target.removeAttribute("tabindex")` — `tabindex="-1"` agora permanece
no cartão focalizado (primeira correção sugerida na issue; mesmo padrão do alvo estático
do skip link `#etapa-atual` em `index.html:68`). Cartões continuam fora da ordem de Tab.

## Prova (projeto `pwa` = vite build + vite preview, mesmo ambiente da repro QA)

| Arquivo | Verificação | Resultado |
|---|---|---|
| `base-fail-run.txt` | novo spec `escola-map-focus.pwa.spec.ts` na base `d9dbdd5c` (pré-fix) | **4/4 falham** — foco em BODY (defeito reproduzido; confirma repro QA B9) |
| `fix-pass-run.txt` | mesmo spec com o fix (`0b2358ac`), re-rodado após formatação biome | **4/4 passam** — foco persiste (Enter/click, ambos os cartões, repetição, re-check 1 frame depois) |
| `escola-entry-regression.txt` | `escola-entry.spec.ts` no mesmo build (contrato de serving, jornadas, SW offline) | **4/4 passam** — sem regressão de superfície |
| `lint.txt` | `npx biome check playwright` | clean (15 achados em `public/escola/js` são pré-existentes na base e `public/` está fora do gate `lint` do engine: `biome check src tests playwright`) |

## Cobertura do novo spec (failing-first; não editado após a prova, só formatação)

1. Enter no link `#jornada-cotidiano` → foco no cartão + `tabindex="-1"` + persiste 1 frame
2. Enter no link `#jornada-dev` → idem
3. Click no link `#jornada-dev` → idem
4. Ativações repetidas (click×2 + Enter) → foco persiste em todas

Mutation-guard: re-check do foco um frame depois pega variantes que adiarem a remoção
do atributo (ex.: `setTimeout`), que reintroduziriam a perda de forma assíncrona.

## Encaminhamento (final)

- **Revisão formal independente:** estágio **nativo** na própria AID-3532 (executionPolicy: review · participant **Engine Systems Engineer** · approvalsNeeded 1) — veredito APROVA/ACHADOS como comentário na AID-3532. A issue filha AID-3537 foi criada antes do estágio nativo e ficou **superseded** (fechável pelo próprio ESE, assignee dela; tentativas do produtor de comentar/cancelá-la e de comentar na AID-3532 pós-in_review retornaram 403 — boundary respeitada). Um único round de revisão para este head.
- Merge: FPE pela porta única `scripts/merge_pr.sh` (countersign-gate). Producer não mergeia.
- QA/AID-3517: quando este fix estiver publicado, o caso **B9** da matriz pública (marcado `test.fail` no lineage `e95611da`) passará a falhar "inesperadamente" — sinal acordado para fechar AID-3532; atualização do marcador é da QA no run pós-publicação.

