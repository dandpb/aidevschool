# 00 — AI na Prática (trilha Nível 0)

**Status:** planned · **Público:** pessoas não tecnológicas · **Criado:** 2026-07-19
**Base:** `docs/VISION.md` (visão dual-audience), AD-004/AD-005/AD-006 em `.specs/STATE.md`.

## O que é

A trilha de entrada do ecossistema para quem não programa: aprender a **aplicar IA no dia a
dia com critério** — pedir bem, verificar o que recebeu, desconfiar produtivamente — em
**lições pequenas** (pegada Duolingo: unidades curtas, revisão espaçada, streak).

O conteúdo-semente é a Parte 2 de `docs/FUNDAMENTOS.md` (protocolo de comunicação com IA),
traduzida de "dev que referencia arquivos" para "pessoa que pede e confere em linguagem
natural".

## Formato de lição

- Uma unidade = um átomo aplicável (ex.: "peça com critério de aceite", "confira uma
  afirmação da IA na sua realidade").
- Sem código, sem toolchain. A superfície de exploração associada é `engines/miniTown/`
  (Nível 0 cozy); a lição em si vive no fluxo de tutoria (roster com modo `non_developer`).
- Revisão espaçada e streak usam o mesmo substrato dos demais níveis (1 aprendiz, 1 currículo).

## Gate (como uma unidade é dominada)

Unidades desta trilha usam o **gate no-code** definido em
[`docs/design/adr/0004-no-code-empirical-gate.md`](../../../docs/design/adr/0004-no-code-empirical-gate.md):
attempt = log escrito em `learner/attempts/`; evidência = checklist de afirmações
falsificáveis verificado pelo Prometor; registrado com `gate_kind: no_code`. Explicitamente
mais fraco que evidência executável de código e **nunca** promove unidades dos níveis 1–6.

## Fora de escopo desta identidade

Unidades concretas, diagnósticos e material de lição — chegam por ciclos futuros pelo fluxo
gateado normal (AD-002: status só avança com verificação; este projeto nasce `planned`).
