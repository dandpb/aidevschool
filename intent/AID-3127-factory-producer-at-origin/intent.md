# Intent: fábrica de re-grant registra o produtor NA ORIGEM (AID-3127)

Author: Platform & CI Engineer (agent 1e9be0fa, slug `platform-ci`) · Change-id:
AID-3127-factory-producer-at-origin · Status: accepted (producer design
decision; owner da fábrica AID-1357; gap reportado pelo drill AID-3121/PR
#597, unblock manual AID-3124)

> Paperclip carrier: AID-3127 (prioridade média, padrão). Evidência do gap:
> thread AID-3121 (disposição final) + recibo AID-3124 hb1.

## Problem

O drill AID-3121/PR #597 expôs um gap sistêmico da fábrica AID-1357: o PR de
re-grant nasce **sem nenhum trailer `Provenance:`** — o corpo é gerado pelo
template do workflow sem trailer, e o PR é aberto com `GITHUB_TOKEN` (nenhum
agente na conversa). O `countersign-gate` (AID-2768 §5,
`scripts/countersign_gate_check.py:198-217`) atribui o PRODUTOR pelo trailer
`Provenance:` **mais antigo** da conversa (corpo do PR primeiro, depois
comentários por `createdAt`); sem nenhum trailer → `producer unattributed`
(fail-closed, o shape F1/F2).

No drill real isso custou um unblock manual: a CEO precisou registrar o
produtor à mão no #597 (comentário GH 5857567068, AID-3124) antes de o QA
poder countersignar e o merge destravar — exatamente a toil manual que a
fábrica existe para eliminar. O watchdog Paperclip não é caminho confiável
para esse registro: seu comentário existe apenas no fluxo close+reopen (B1a),
que não ocorre quando os checks já reportaram (ex.: drill QA com credencial
de agente dispara CI via `synchronize`).

## Decision (design owner: producer da fábrica)

**Opção (a) do mandato — trailer no corpo, na origem**: o passo "build the
PR body" do `readiness-regrant.yml` passa a terminar com o trailer canônico
de produtor, fora de qualquer code fence:

```
Provenance: agent=readiness-regrant-factory task=AID-1357 run=gha-<run_id> session=gha-<run_id>.attempt<run_attempt>
```

Por que funciona sem credencial de agente e sem watchdog:

1. §5 é **textual**: a atribuição de produtor lê o corpo do PR primeiro
   (sortkey `(0, "")`), sempre mais antigo que qualquer comentário — o
   produtor fica atribuído a `readiness-regrant-factory` no instante de
   criação, qualquer que seja o token que abriu o PR.
2. O slug `readiness-regrant-factory` é uma automação dedicada: nunca
   countersigna; o countersign do QA (`qa-lead`) é sempre de agente distinto
   (§5 verde por construção).
3. Sem novos secrets, sem mudar o token da fábrica (restrição AID-1357:
   `GITHUB_TOKEN` apenas; novo secret exigiria aprovação CEO), sem mudar o
   watchdog. A opção (b) (comentário incondicional do watchdog) deixa de ser
   load-bearing para §5 — o close+reopen continua necessário só para disparar
   CI (B1a), como hoje.

Registro semântico correto: o produtor do PR de proposta **é** a fábrica;
quando o QA completa o re-grant na branch (fase de observação), o produtor
continua sendo a fábrica e o QA permanece o countersigner independente —
mesma semântica aceita no unblock AID-3124 (produtor atribuído ≠
countersigner).

## Non-goals

- Trocar `GITHUB_TOKEN` por PAT/credencial de agente na fábrica (sem novos
  secrets sem aprovação CEO; desnecessário — ver decisão).
- Mudar o watchdog Paperclip (fora do repo; sua função B1a de disparo de CI
  não muda).
- Mudar o gate AID-2768 (`scripts/countersign_gate_check.py` intocado).
- Drills adicionais da fábrica (AID-1669 replay/fixture já cobrem o caminho
  de produção; o próximo run real da fábrica valida o trailer in vivo).

## Verification (plan gate)

- Teste novo `docs/product-readiness/tests/test_factory_body_producer.py`
  (arquivo novo; suíte existente intocada): renderiza o corpo real a partir
  do workflow (executa o script bash do passo "build the PR body" com run id
  de amostra) e roda o núcleo do gate hermeticamente —
  - corpo novo, sem comentários: violação §1 (sem citação) mas **não**
    `producer unattributed` (o vermelho correto do estado pré-countersign);
  - corpo novo + countersign independente pinando o head: **PASS** completo;
  - corpo sem o trailer (o shape #597): `producer unattributed` (regressão
    guardada);
  - trailer dentro de code fence: `producer unattributed` (AID-2824
    fence-stripping guardado).
- `scripts/countersign_gate_check.py --self-test` → inalterado, verde.
- `python3 -m pytest docs/product-readiness/tests -q` → verde.
