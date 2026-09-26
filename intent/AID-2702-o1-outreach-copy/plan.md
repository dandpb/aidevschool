# Plan: kit de copy O1 (PT-BR)

Change-id: AID-2702-o1-outreach-copy · From: intent/AID-2702-o1-outreach-copy/spec.md · Status: approved

Aprovação: GO do CEO para o POC de stress (AID-2702 flip backlog→todo via
relay AID-2814) — fast path de escopo bornido (1 arquivo de work-product,
sem produção), auto-verificação e revisão produtor≠verificador mantidas.

## Files that change

- `work-products/AID-2702_O1_OUTREACH_COPY_PTBR_2026-09-26.md` (novo)

## Order of work

1. Congelar este contrato na fábrica (base = HEAD com o intent registrado).
2. Build: autor (contexto `growth-recruiter-author`) grava o arquivo e commita
   no worktree isolado.
3. Prove: verificador distinto (`growth-recruiter-verifier`) roda C1–C3.
4. Gate: promoção no SHA provado; PR aberto para decisão humana (fundador).

## Risks

- Posicionamento decidido sozinho → mitigado: arquivo inteiro marcado
  PROPOSTA, merge é decisão humana no PR.
- Copy fora da voz do produto → mitigado: guardrails + revisão no PR.

## Proof

- `python3 -m factory prove GR-O1 --context growth-recruiter-verifier` →
  all_passed true (C1, C2, C3).
- `python3 -m factory gate GR-O1 --context coordinator --pr-head <sha>` →
  verdict promote.

## Verification split

Verificador: contexto distinto do autor roda os checks congelados no
worktree; revisão final de conteúdo é humana (PR).
