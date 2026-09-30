# Plan: onda 1 — matriz, contrato de release e fatia vertical 1

Change-id: `AID-3453-unify-school` · From: intent/AID-3453-unify-school/spec.md · Status: draft (aguardando request_confirmation do CEO)

## Files that change

- `intent/AID-3453-unify-school/{intent,spec,plan,curriculum-matrix}.md` (new) — esta onda.
- Fatia 1 (PR próprio, frente CPE, só após aceitação deste plano):
  - `curriculum/ai-literacy/catalog.yaml` — campo `competency:` por lição (F/D ids).
  - `engines/codexdojo-os-prototype/config/mission-bindings.yaml` — bindings
    l25–l32 (ai-pratica) + campo `competency` opcional nos bindings novos.
  - `learner/substrate/mission_catalog*.py` — propagar campo se o read model
    consumir (sem quebrar schema v1; teste novo).
  - `engines/codexDojo/ecosystem/MANIFEST.md` — se contrato produto-facing muda.

## Ordem de trabalho

1. **Onda 1 (este change)**: matriz r1 + contrato de release + plano de fatia
   → PR draft (revisão independente; sem merge nesta onda).
2. **Frente CCE** (child issue): ratificar item a item a matriz (l25–l32,
   overlaps MVP/ZAI, divergência "27 ZAI", "6 gates") → matriz r2 decidida.
3. **Frente CPE** (child, depende de 2 só na parte de fusão; bindings l25–l32
   podem adiantar): fatia vertical 1 acima + regeneração de views.
4. **Frente UX** (child, paralela): aplicar identidade SDLCQuest v1.3 à
   superfície de entrada da escola única (sem novo sistema visual).
5. **Frente QA** (child, última): verificação independente das fatias —
   aprendizagem (evidência não-inflada), acessibilidade, retomada (RC-4..RC-6).

## Riscos

- **Maior risco:** campo novo em catalog.yaml quebrar consumidores do read
  model → mitigação: campo opcional + regeneração + suítes literacyDojo
  (`gen:content`, lint, test, build, e2e) antes de pedir review.
- Fusão ZAI↔literacy mexer em tests/e2e alheios → só gradual, por módulo,
  com prova de dependências (fora da fatia 1).
- Matriz virar “documento morto” → r2 decidida pela CCE é condição de release
  (RC-1); sem isso, nada funde.
- Alternativas NÃO escolhidas: (a) mover filtro `ia_pratica` para o compilador
  (vetado pela issue); (b) reescrever `curriculum-data.ts` do ZAI de uma vez
  (risco alto); (c) criar engine novo “escola” (viola one learner/many engines).

## Proof

- Onda 1 (docs): este PR + contagens re-executáveis da matriz (§1 da matrix).
- Fatia 1 (CPE, critério de pronto):
  - `python3 -m learner.substrate` → valida, views regeneradas sem erro.
  - `python3 -m pytest learner/substrate/tests -q` → verde.
  - `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build` → verde.
  - `python3 curriculum/ai-literacy/tools/validate.py` (ou entrypoint oficial do
    curriculum) → YAML canônico válido com campo novo.
  - Bindings l25–l32 presentes e validados pelo substrate (missões = 41→49).

## Verification split

Produtor: CPE (fatia 1) em PR draft próprio. Verificador: frente QA
(fresh-context) checa diff vs. spec R1–R7 + plano + RC-1..RC-6 e emite
veredito; countersign distinto é pré-condição de qualquer merge futuro
(`scripts/merge_pr.sh` — não executado nesta onda).
