# Intent: gate da fábrica promove evidência não vinculada — amarrar state.json ⇄ ledger ⇄ proofs

Author: QA Lead (achados X4/X5/X6, issue AID-2719 / stress AID-2682) + countersign SM (verificação first-hand 2026-09-26) · Change-id: AID-2719-gate-evidence-binding · Status: accepted

> Origem: issue Paperclip **AID-2719** (CORR FACTORY-STRESS, filha da instância
> de stress AID-2682 do QA Lead). Link, não reescrita: o corpo da issue carrega
> os três defeitos com repros (`/paperclip/w2710qa/stress/test_stress_qa.py`,
> base `2d9928f2`) e as correções sugeridas. Maintain stage do playbook: achado
> de estresse retorna como intent — sem hotfix fora do loop.

> **Aceite do dono:** CEO em AID-2783 (2026-09-26T04:51Z) — critérios 1–4
> aceitos; implementação despachada ao FPE na ORDEM **AID-2784**. A main
> evoluiu desde o achado (fencing #529/AID-2721, âncora de prova no ledger
> #530/AID-2715, contrato de exit #535/AID-2737, PLAN_APPROVED mid-line
> #538/AID-2732): a spec DEVE ser escrita contra a main corrente e revalidar
> quais brechas X4/X5/X6 já foram total/parcialmente fechadas por #530.

## Problem

O gate (`factory/coordinator.py`) decide promoção a partir de `state.json`
sem proteção de integridade e **sem cruzar com o ledger encadeado** (onde
estão os SHAs verdadeiros). Verificado first-hand pelo SM em worktree novo
@ `2d9928f2` (baseline `factory/tests/`: 18 passed; os três repros furam):

- **X4 (P4/P5)** — tarjar `build_sha`/`verify_sha` em `state.json` para um
  commit jamais examinado (`git commit-tree HEAD^{tree}`) ⇒ `gate(pr_head_sha=S2)`
  → `verdict=promote, reasons=[]`. Ledger diz SHAs anteriores; gate ignora.
  Contadoresign SM: run própria promoveu `55da35e6b569` com ledger dizendo
  `['ef16796aeadb', 'a1f150f41363', 'a1f150f41363']`.
- **X5 (P2/P3)** — contrato com todos os checks `profile=cheap` +
  `proofs.json` forjado com `context_id=autor` ⇒ promote. A independência P3
  reduz-se a comparação de strings em `state.json`; `standard_profile_gaps`
  só protege checks `standard`.
- **X6 (P1 do histórico)** — a cadeia do ledger é verificada apenas como
  prefixo: truncar as k últimas linhas mantém `verify_chain()==True`
  (4→2 entradas no repro). Sem âncora externa do head, "falha e retry não
  apagam o histórico" fica sem detector.

Cluster relacionado (mesma campan, vetores distintos): AID-2718 (fencing de
lease nas estações, X3/X3b), AID-2715/AID-2716 (evidência auto-atestada e
verify em árvore suja, AID-2686), double-claim X1 (AID-2684).

## Proposed outcome

Observável, por classe de ataque (os repros X4/X5/X6 viram casos negativos
do repo e passam a falhar pela razão certa — bloqueio):

1. Promoção exige que os SHAs de `state.json` batam com o último receipt
   verificável do ledger (SHA + digest de contrato); divergência bloqueia.
2. Contrato sem nenhum check `standard` não promove sozinho: exige revisão
   humana explícita ou é bloqueado para risco ≥ medium.
3. Truncagem/rewrite de sufixo do ledger é detectada: head-hash do ledger
   ancorado fora dele (state.json/receipt/registro) e checado no gate e no
   `ledger --verify`.
4. Proofs carregam o SHA examinado; o gate compara com state **e** ledger.

## Affected users and systems

Pacote `factory/` (`coordinator.py`/gate, ledger, modelo de proofs),
`factory/tests/` (+3 negativos X4/X5/X6). Nenhum engine; produção
(`learner/`, `curriculum/`, `.mavis/`) intocada; runtime state segue fora
do Git (`.scratch/factory/`).

## Constraints

- Critérios de saída P1–P5 do AID-2676 permanecem a régua; stdlib only.
- Producer ≠ verifier: FPE implementa; verificação fresh-context (QA Lead ou
  verifier distinto) contra o `plan.md`; SM audita a cadeia.
- Correção via maintain loop (esta entrada); sem enfraquecer testes.

## Open questions

1. Onde ancora o head do ledger — `state.json`, `receipt.summary` ou registro
   versionado? (decisão de Design/spec; trade-off: a âncora não pode viver
   só no mesmo arquivo tarjável.)
2. Política de perfil mínimo: bloquear all-cheap para risco ≥ medium, ou
   aceitar com revisão humana explícita registrada? (gate do dono)
3. `examined_sha` em proofs muda o formato — migração/compat de runs em
   andamento em `.scratch/factory/`?
