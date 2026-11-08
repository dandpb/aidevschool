# AID-3740: REGISTRO S5-RACE L07-F2 (PR #655 1d25f3d4) — corrida multi-tab: 2× lesson_completed em 2/5 execuções, XP íntegro 5/5; limite registrado, aguarda adjudicação de roteamento do PO

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** — | **Created:** 2026-10-02T01:35:16.038285+00:00 | **Updated:** 2026-10-17T16:12:00.565+00:00
- **ID:** `5d7894c3-d4cb-4e04-985e-465010c489ef`

## Description

**Registro pedido pelo PO (comentário 960d61b6 em AID-3718) antes do aceite — cobertura concorrente S5-RACE executada pelo LAE. NÃO é novo escopo de implementação nem duplicação da AID-3731: é o registro do cenário/resultado/limite explícito.**

**Por que issue nova:** AID-3718 está `in_review` com assignee FSE (`e761b40c`) e as rotas de escrita do meu ator nesse estágio retornam 403 'Issue is outside this actor's authorization boundary' (ações/alvos exatos: `POST /api/issues/AID-3718/comments` e `PATCH /api/issues/AID-3718`; nenhum outro ator/endpoint tentado, conforme protocolo). Este child é o canal nativo restante para o registro durável.

**Cenário (browser real, além do replay sequencial já PASS em 6cd23da1):** duas abas da mesma origem (mesmo learner/IndexedDB) respondem as 3 atividades do Mapa Inicial e disparam `finish-lesson` back-to-back — duas PRIMEIRAS conclusões concorrentes. Objeto pinado: PR #655 head `1d25f3d430bb2cfb9ea8aff5c8350a6b5ccd01fd`, base main `fcf84d3e`, worktree isolado, harness espelhado do QA AID-3681; provas FSE/AID-3735 reusadas (suíte inalterada não repetida).

**Resultado medido (`--repeat-each=5`, 5 passed, 1.3m):**
- `lesson_completed`: **1× em 3/5; 2× em 2/5** — hipótese estática do PO confirmada empiricamente (load→compute→save→emit com transações IndexedDB separadas = TOCTOU entre conclusões concorrentes).
- **XP persistido = 85 em 5/5** (um único +25; +10×6 de atividade acumularam) — last-write colapsou o bônus. **Nenhuma duplicação de XP cumulativo afirmada nem observada.**
- Status `completed` e praticabilidade íntegros em todas.

**Relevância ao contrato de 1ª conclusão única:** invariante de premiação resistiu (5/5); invariante de contagem de eventos NÃO resiste multi-tab (2/5) — impacto confinado ao funil O1 (super-contagem no cenário raro de 2 abas na mesma lição; a aba extra restaura a lição corrente, cenário alcançável por uso real).

**Limite explícito:** sob conclusões concorrentes multi-tab, o canal `lesson_completed` pode emitir 2× para uma primeira conclusão única; premiação permanece 1×.

**Adjudicação pedida ao PO (uma das):** (i) aceitar o limite documentado (impacto funil raro/limitado); (ii) autorizar correção atômica em `engines/literacyDojo` (owner LEE — ex.: read-modify-write em tx único ou idempotência na emissão; só então eu crio o child de delegação pelo fluxo nativo, sem duplicar AID-3731).

**Evidência:** `/paperclip/aid3718-evidence/s5/` — `S5_RACE.md` (relatório), `race_results.ndjson` (desfecho por execução), `race_run.log`, `s5race_tabA/B_result_r0..4.png`, `s5_race.spec.ts`.

Caminho de fechamento do achado permanece: gates AID-3731 (LEE/FSE) + merge FPE via `scripts/merge_pr.sh`. CI #655 HELD segue nessa trilha. Sem merge/deploy; nenhum teste protegido/gate tocado; nada editado em engines/.

## Comments (1)

**founder** · 2026-10-17T16:11:59.909806+00:00

✅ Adjudicado pelo Founder: guarda `once-per-first-completion` (PR #655/#657) preserva integridade de XP 5/5; limite multi-tab aceito para C0.

---

