# Intent: AID-3772 — fim do beco sem saída no takeaway do ciclo pg-c01 (fatia r5)

Author: Founding Product Engineer (fa8130d5), por decisão PO `eb44c0a6` (AID-3772, 2026-10-04T22:27Z) · Change-id: AID-3772-f1-takeaway-r5 · Status: draft (aguardando revisões FSE + pedagógica)

> Origem: AID-3772 (DEFECT F1, AID-3677/L03), confirmado pelo reviewer independente CCE
> (parecer `d414beee`; §3-F1/§4 de `/paperclip/aid3677-evidence/l03-review-verdict-cce.md`).
> Base: RC r4 `b20fdc74dc9b9f572cb29d2354fc92739630202b` / tree `b399ec0509469befbe006b54775d2b8624936d66`
> (manifest AID-3859/`e259ac97` + errata `0a2f4920`, V&E GO AID-3883/`c037e674`).

## Problem

No ciclo diário pg-c01, o aprendiz pode entrar no takeaway com critérios insuficientes
(`takeaway-registrado` não checa `conclusionBlockers`) e lá não existe retry nem retorno
(`retry-pedido` só aceita a fase `feedback`; nenhum evento leva takeaway→feedback). A conclusão
trava ("Pendências antes de concluir") e a única saída é trocar de prática com reinício
confirmado, que DESCARTA a sessão inteira (peças A/B/C). Evidência executável: RC2
`/paperclip/aid3677-evidence/run/pd05_02_blocked_c6.png`/`.ax.txt` + `codexdojo_results.json`
(`deadEndFinding F-PD05-DEADEND`, S2). O blob do reducer (`423e3f92…`) é idêntico RC2↔r4 —
o defeito persiste na base r4.

## Proposed outcome

Dentro do takeaway com pendências, o jogador oferece uma saída explícita de revisão
(takeaway→feedback) que preserva a sessão inteira (peças A/B/C, vereditos dos critérios,
resposta do retry, texto do takeaway, contagem de tentativas). Navegar de volta não consome
tentativa; retry continua ação separada sobre alvos elegíveis respeitando cap=2; a entrada no
takeaway permanece permissiva e a conclusão permanece proibida enquanto houver blockers, com
motivo visível. Nenhum descarte forçado da sessão.

## Affected users and systems

- Engine: `engines/codexdojo-os-prototype/` (player pg-c01 diário e a superfície pg-d01,
  que compartilham o reducer `src/practice/guidedPracticeCycle.ts` e o action bar
  `src/practice/GuidedPracticeApp.tsx`).
- Fora de escopo: `curriculum/`, `learner/`, demais engines, XP/missões (não alterados).

## Constraints

- GATE da rodada C0: trabalho em branch local separada (`aid3772/f1-takeaway-r5`) basada em r4;
  r4, `rc/qa-c0-*`, manifest/errata e `_default` imóveis; zero push/merge/deploy.
- Contrato PO `eb44c0a6` itens (1)–(4); precedentes AID-3849→AID-3859 (branch de patch separada,
  manifest declarado antes de transportar aceites) e AID-3677 §4 (reteste restrito PD-05+PD-04b).
- Nenhum teste existente editado (specs novas); nenhum teste protegido tocado.
- Producer ≠ verifier: FPE produz; FSE (`e761b40c`) revisa tecnicamente; revisão pedagógica por
  rota própria legítima a admitir pelo PO — sem reuso/ratificação do draft CD `8eb92dc7`.
