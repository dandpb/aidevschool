<!-- issue: AID-3710 | key: receipt-contract-inventory | doc_id: 27699e24-eb0c-4be8-bbd1-519864ce7d71 | updated: 2026-10-02 01:18:15.936+00 -->

# Inventário read-only: fonte/contrato do recibo (classes game) — subsídio à política da AID-3736

(AID-3710)

# AID-3710 — Inventário read-only: fonte/contrato do recibo para as classes game (pixelquest/gatekeeper)

**De:** CPE (`ac0ec540…`) — run `2d471068…` (continuação) — 2026-10-02
**Para:** subsidiar a escolha de política na AID-3736 (V&E) e a decisão PO. Read-only; nenhuma escrita no repo. Base de leitura: RC2 `e7071035` (e conferências na main `fcf84d3e` — sem diferença nos pontos citados).

## Contrato existente (o que já está em código)

1. **Recibo de verificador** — `learner/gate/verifier_receipt.py`: JSON `{verdict: PASS|FAIL, context_isolated: true, mutation_score, coverage_core, source, evidence_digest}`; **digest-bound** ao evidência canônica do produtor (`canonical_evidence_digest`); precisa residir sob `learner/verifier_receipts/` (path check anti-symlink/escape); thresholds vindos do seam da unidade (ex. mutation ≥ 0.65, coverage_core ≥ 0.8). Autoridade do recibo = acesso de escrita no diretório (fronteira CP-07, documentada; endurecer = F2, fora do escopo F1).
2. **Fluxo do gate** — `canonical_gate.py`: com recibo válido, `passed = receipt.passed` (independente do `pass` do produtor); sem recibo, depende de `independently_verified_pass` (onde mora o F1).

## Estado real dos artefatos no RC2

- **Existe exatamente 1 recibo** no repo: `learner/verifier_receipts/u2-warehouse-2026-08-13.json` (classe voxeldojo; `source: "prometor-warehouse-u2-2026-08-13"`; mutation 0.7059 / coverage 0.9154 — acima do seam).
- **Não existe produtor de recibo automatizado/determinístico commitado** para classes game (nenhuma ferramenta em `scripts/` ou `engines/` escreve `learner/verifier_receipts/`; o recibo u2 veio da persona **Promotor** — verificador adversarial do ÁGORA/minimaxDojo, `engines/minimaxDojo/agents/08_prometor/`, portão empírico mutation ≥ 0.60–0.65 / coverage ≥ 0.80, contexto isolado, cross-model).
- **Contrato de design já documentado para jogos pixelquest novos**: `engines/pixelDojo/docs/plans/07_rest_api_auth.md` §11 *Learning-gate hooks*: “The game emits evidence only; the verifier (separate context) decides mastery … A separate verifier supplies the gate receipt consumed by `learner/gate/`”. Ou seja, **o binding-a-recibo já é a arquitetura-alvo declarada** para as próximas métricas.kind — F1 é o gap das classes antigas (token-bucket, route-health, policy-gate, sequence-flow, task-queue, GATEKEEPER).
- **Artefatos de execução existentes para pixelquest/gatekeeper** são todos producer-side (`.logs/evidence.ndjson`, `last_run_evidence.json`, emissores em TS do jogo) — por definição autodeclarados; **não há hoje artefato independente executado** ao qual bindar sem construir o verificador.

## Implicação para a política (reporte, não decisão)

- O **único binding suportado por contrato/artefato existente** é o recibo digest-bound (`verifier_receipt.py`), reutilizando o mesmo formato/thresholds do seam — coerente com o plano já documentado (§11) e com voxeldojo.
- A **fonte** dos recibos para classes game hoje é manual/persona (Promotor) — não determinística. Isso NÃO invalida o binding (a regra de ouro é sobre o *gate* não confiar no produtor; o verificador do recibo é entidade separada), mas a fronteira CP-07 (recibo = arquivo escrevível) permanece aplicável e documentada — endurecer é o F2, separado.
- Alternativa “binding a artefato de execução verificado” exigiria **construir** o verificador de execução (replay/harness por jogo) — maior que o mínimo autorizado; ficaria como follow-up se o PO quiser fonte determinística para game class.

## Complemento ao handoff (nada muda nas P1–P4)

Este inventário responde ao ponto do PO na AID-3736 (“fonte/contrato ainda incerto exige reporte antes de escolher política”). As opções de design (Option 1 seam de decisão / Option 2 flag+grandfathering) permanecem como no doc `handoff-f1-minimal-binding`; este relato apenas confirma qual contrato o binding reutiliza.
