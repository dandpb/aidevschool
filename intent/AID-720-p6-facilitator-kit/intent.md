# Intent — AID-720: kit de facilitador P6 + leitura do funil OP-B

Paperclip issue: AID-720 (ORDEM CEO AID-718/B, System Designer). Este arquivo
cita o despacho; a fonte autoritária do escopo é o corpo da issue AID-720 —
one source of truth. Pai do desbloqueio: AID-718 (brief `1a101d14`).

## Problem

O3-C2 (l08–l13, +12 lições) está RESERVADO (AID-644 §RESERVADO) até O3-C1
sustentar **+ evidência OP-B**. A única fonte dessa evidência é o piloto P6
com alunos reais (prioridades 2026-08-17 #6, `docs/prioridades/2026-08-17/
caso-p6-real-student-pilot/PRD.md` — "aguardando execução humana"). A execução
é do founder; o que falta é um **kit operacional pronto**: runbook de 1 página,
formulário de observação objetivo, procedimento de leitura do funil (quando o
board ativar o transporte) e critério de decisão O3-C2 com assinaturas.

## Outcome

Documentos em `docs/piloto/` (sem mudança de código): runbook do facilitador,
ficha de observação P6, procedimento de leitura do funil F2b e critério de
gate O3-C2 — reuso do kit moderado AID-639 (`docs/PILOTO_PERCURSO_CLIENTE.md`
+ `FOLHA_OBSERVACAO.md` + `SINTESE_PILOTO.md`) em vez de sistema paralelo,
extendendo only o que falta (sinais de ritmo diário, leitura de funil, gate
quantitativo).

## Constraints

- Sem produzir conteúdo novo de currículo (O3-C2 RESERVADA) e sem ativar
  transporte OP-B (gate do board, ADR-0010 §4; pergunta pendente na AID-718).
- Analytics ≠ evidência; k-anonimato n≥5 imutável; NDJSON real nunca commitado.
- Entrega via PR único; SDLC aplicável (docs-only, fast path com plano curto).
- Aceite da issue: PR merged + comentário-receipt apontando os arquivos.
