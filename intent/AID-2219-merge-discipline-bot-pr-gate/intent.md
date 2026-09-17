# Intent: merge-discipline binding para PRs de bot — veredito + registro de produtor ANTES do merge (AID-2219, achado AID-2217 #71 / classe AID-767-F1)

Author: CEO (Paperclip AID-2219) · Change-id: AID-2219-merge-discipline-bot-pr-gate · Status: accepted (decisão de owner neste issue; diff conta com countersign QA pré-merge por tocar autoridade de processo)

> Origem: auditoria AID-2217, instância #71 (F1 médio) — o texto do achado é
> a fonte primária (link, não reescrita). Recorrência da classe AID-767/F1
> ("merge de PR de bot antes do gate"), 2ª ocorrência window-auditável;
> caso âncora: PR #460 (Sentinel HIGH XSS dojoToday).

## Problem

O PR de bot #460 foi merged pelo CEO em 2026-09-16T20:35:27Z, **25 segundos
após** a abertura da triagem AID-2201 (20:35:02Z) — sem veredito first-hand e
sem registro de produtor pré-merge, exigidos pelo fast path canônico
(`docs/sdlc/README.md` §PRs automatizados, itens 1 e 3). O CI verde (39/39,
incl. `SDLC guardrails (diff)`) não segurou o gap: verde no head prova o
guardrail do diff, não a cadeia pedido → veredito → registro → merge.

Leitura ambígua do item 3: "founder merge no GitHub (aceite do dono humano no
próprio PR)" lista uma **forma de aceitação**, mas o texto atual não amarra
explicitamente que essa forma **não dispensa** os itens 1–2 (registro do
produtor antes do merge, CI verde) nem o veredito first-hand pré-merge. Na
pressão de um HIGH de segurança, o merge-writer leu "founder aceitou" como
gate completo. Não foi — mitigação retrofit seguiu §retrofit corretamente
(veredito FPE 20:48Z, ratificação CEO 21:00Z, retrospective record PR #463
21:05Z, mutation guard #465 21:33Z; sem rework — o fix era válido).

## Proposed outcome

A regra fica **binding e inambígua no ponto de decisão** (o momento do merge):

1. §PRs automatizados ganha parágrafo que amarra o **ordenamento**: qualquer
   forma de aceitação (founder merge ou countersign Paperclip) exige, ANTES do
   merge, (i) veredito first-hand FPE/QA postado no carrier e (ii) registro de
   produtor commitado. Aceite ≠ dispensa de cadeia.
2. §Merge protocol (higiene de runs, AID-1618) ganha o item de checklist
   pré-merge para todo bot PR: **"veredito postado? registro commitado?"** —
   dois checks binários antes de qualquer merge de PR de bot, ao lado das
   regras de re-read e guardrail no head.
3. Coaching registrado nos executores de merge (hoje CEO single-writer /
   founder-direct): CI verde no head não é o gate completo para PR de bot.

## Affected users and systems

`docs/sdlc/README.md` (autoridade de processo — por isso countersign QA
fresh-context pré-merge); merge-writers (CEO hoje); fluxo de bot PRs
(Sentinel/Bolt/Palette). Nenhum código de engine é tocado; diff docs-only.

## Constraints

- Docs-only; sem mudança de comportamento de CI/hooks nesta alteração.
- Preservar o precedente AID-1136: founder merge permanece forma válida de
  **aceitação** — o emendo é o ordenamento (aceite não substitui veredito +
  registro pré-merge).
- Não reabrir histórico; #460 fica como caso âncora citado, já mitigado per
  §retrofit.

## Open questions

Nenhuma — o escopo pedido (forma da emenda) foi decidido no AID-2219: emenda
de parágrafo no §PRs automatizados **e** item de checklist no §Merge protocol
(as duas formas, não ou/ou: a primeira amarra a norma, a segunda pega o
merge-writer no ponto de execução).
