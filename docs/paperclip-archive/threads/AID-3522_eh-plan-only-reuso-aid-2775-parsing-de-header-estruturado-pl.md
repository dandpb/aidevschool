# AID-3522: EH — PLAN ONLY (reuso AID-2775): parsing de header estruturado — plano pronto para decisão

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Engine Hardening Engineer | **Created:** 2026-09-30T20:57:55.223301+00:00 | **Updated:** 2026-10-17T16:29:58.654+00:00
- **ID:** `c3a60171-6e5d-485a-8d41-7e1dc145fa5e`

## Description

Lote operacional founder (AID-3307 comment 4e9668b1, frente 5; reutiliza lane AID-2775). Dono: Engine Hardening.

**PLAN ONLY — nenhuma edição/execução** de mudança de guard, workflow ou permissões.

**Entregável:** plano pronto para decisão sobre parsing de header estruturado, preservando o caso negativo EM PROSA; dez casos canônicos; registry e smoke. Inspecionar estado atual e propor: arquivos, invariantes, critérios positivos/negativos e rollback.

**Aceite:** plano publicado neste issue com os itens acima, aguardando decisão CEO.

## Document `Plano AID-3522 — parsing de header estruturado em plan_is_approved (lane AID-2775) — r1` (2026-09-30)

# Plano AID-3522 — parsing de header estruturado em `plan_is_approved` (reuso lane AID-2775) — r1

**Tipo:** PLAN ONLY (este documento não altera código; implementação só nasce de issue filho após decisão CEO).
**Dono:** Engine Hardening Engineer. **Decisão pedida:** CEO (aceite do issue AID-3522: "aguardando decisão CEO").

---

## 1. Risco → evidência

**Risco:** fail-open no gate de freeze (HTML §02) — `plan_is_approved` aprova plano `draft` se o bloco de header contiver, **em prosa**, a substring `· Status: approved`.

- Causa: `factory/contract.py:33` (main `d9dbdd5c`) — `PLAN_APPROVED = re.compile(r"(?:^|·)[ \t]*Status:[ \t]*approved\b", re.MULTILINE)`. A âncora `·` não discrimina campo de header de menção incidental em texto corrido **dentro do bloco de header** (pré-`## `).
- Repro executado hoje (2026-09-30, checkout local da main, Python 3.13): o repro verbatim do AID-2775 devolve `plan_is_approved(plan) → True` e `Contract(...) → ACEITO` com status real `draft`. Fail-open confirmado vivo na main.
- Direção já ratificada: despacho CEO no comentário `ce568a72` do AID-2825/AID-2775 — "endurecer o parser para exigir bloco estruturado (não substring solta) + teste negativo".

## 2. Estado atual inspecionado (main `d9dbdd5c`)

| O quê | Onde | Papel |
| --- | --- | --- |
| Regex fail-open | `factory/contract.py:33` | única fonte de aprovação |
| Restrição de bloco header | `factory/contract.py:35-42` (`_SECTION_HEADING`, pré-`## `) | correta; **preservada sem mudança** |
| Gate de uso | `factory/contract.py:91-96` (`Contract.__init__`) | mensagem de erro cita "`·`-separated mid-line" — **preservada** (asserida por `test_b5_canonical_registry.py::test_error_message_names_both_forms`) |
| Template canônico | `docs/sdlc/templates/plan.md:3` | `Change-id: <cid> · From: <path> · Status: draft | approved` |
| Contrato mútuo template↔parser | `factory/tests/test_f0_plan_status.py` (10 testes, renderiza o template REAL) | inalterado |
| Registry canônico | `factory/tests/test_b5_canonical_registry.py` (9 testes; 6 asserções usam `PLAN_APPROVED.search`) | adaptação mecânica (ver §5.3) |
| Smoke CI | `factory/tests/test_registry_smoke.py` (3 testes + paramétrica) | inalterado |
| Censo do corpus | 16 registros `intent/*/checks.md` (2026-09-30) | **apenas 2 formas**: linha própria `Status: approved` (10) e inline canônico `Change-id · From · Status: approved` (6). Nenhum valor anotado/sujo no corpus de fábrica |

## 3. Proposta — parser estruturado (opção (b) do AID-2775)

Substituir a regex por parsing do header em **linhas-campo** e leitura do campo `Status` apenas de segmentos estruturados:

```python
# factory/contract.py (esboço — forma final na implementação)
_HEADER_FIELD_LINE = re.compile(r"^[ \t]*([A-Za-z][A-Za-z0-9_-]*):")   # linha começa com Nome:
_FIELD_SEGMENT  = re.compile(r"^[ \t]*([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)")
_STATUS_VALUE   = re.compile(r"^approved\b")                            # semântica de valor idêntica à atual
HEADER_LEADING_FIELDS = {"Change-id", "From", "Status", "Author"}      # leads atestados: template + b5

def plan_is_approved(text: str) -> bool:
    header = text[:m.start()] if (m := _SECTION_HEADING.search(text)) else text
    for line in header.splitlines():
        lm = _HEADER_FIELD_LINE.match(line)
        if not lm or lm.group(1) not in HEADER_LEADING_FIELDS:
            continue                    # prosa / lead desconhecido: linha inteira ignorada
        for seg in line.split("·"):
            fm = _FIELD_SEGMENT.match(seg)
            if fm and fm.group(1) == "Status" and _STATUS_VALUE.match(fm.group(2).strip()):
                return True
    return False
```

**Por que fecha o buraco:** no repro AID-2775 a linha é `Nota: o documento anterior dizia · Status: approved, mas foi revogado.` — lead `Nota` ∉ `HEADER_LEADING_FIELDS` → linha descartada inteira → `False`. Aprovação passa a exigir **linha-campo** (lead permitido) + **segmento-campo** `Status:` + **valor** aprovado — nunca substring solta.

### Pontos de decisão (CEO)

- **D1 (recomendado, acima):** allowlist de leads `{Change-id, From, Status, Author}` + valor `^approved\b` preservado. Zero drift de semântica de valor; repro fechado pelo formato de linha.
- **D2 (opcional, endurecimento extra):** apertar valor para `approved(?=$|\s|\()` — passaria a rejeitar `Status: approved, mas revogado` e `approved-pending` (hoje aprovados pelo `\b`; trivia documentada em `test_b5_canonical_registry.py:129-130`). **Muda comportamento** além do escopo AID-2775; só adotar com despacho explícito.

## 4. Invariantes

- **I1 Fail-closed:** ausência/ambiguidade de `Status` estruturado bloqueia o freeze; nada além de campo estruturado aprova.
- **I2 Bloco de header:** aprovação vale só pré-`## ` (lógica atual intacta).
- **I3 Semântica de valor estável:** `^approved\b` (com D1) — `approvedonly` rejeita, `approval-pending` rejeita, anotações pós-`approved` continuam válidas (f0/b5 atestam).
- **I4 Contrato mútuo template↔parser:** f0 renderiza o template REAL; campo-lead novo no template quebra f0 alto e claro → atualização consciente do allowlist (feature anti-drift).
- **I5 Registry + smoke preservados:** os 16 `intent/*/checks.md` continuam carregando por `load_from_registry`; b5 e smoke verdes (b5 com adaptação mecânica §5.3).
- **I6 Sem mudança pedagógica/de guard:** escopo restrito a `factory/contract.py` + testes factory; nenhum touch em workflow, permissões ou gates de merge.

**Residual documentado:** linha em prosa byte-idêntica a uma linha-campo com lead permitido e segmento `Status: approved` limpo (ex. `From: nota antiga · Status: approved`) é indistinguível de header sem contexto semântico — mesma classe do legado `Status: approved` em linha própria. É a definição contratual de campo, não regressão.

## 5. Arquivos (implementação, issue filho pós-aprovação)

1. **`factory/contract.py`** — remover `PLAN_APPROVED`; inserir 3 constantes + `plan_is_approved` estruturado (~15 linhas); docstring citando AID-2775/AID-3522; mensagem de erro do `Contract` inalterada.
2. **`factory/tests/test_plan_status_structured.py`** (NOVO) — os 10 casos canônicos (§6), repro AID-2775 verbatim como caso 6.
3. **`factory/tests/test_b5_canonical_registry.py`** — adaptação mecânica: 6 asserções `PLAN_APPROVED.search(x)` → `plan_is_approved(x)`; nenhum caso adicionado/removido; semântica idêntica nos casos cobertos.
4. Fora de escopo: `factory/gate.py`, `coordinator.py`, `verify.py`, templates, docs (nenhum consome `PLAN_APPROVED`/`plan_is_approved` além dos citados — censo grep 2026-09-30).

## 6. Dez casos canônicos (suíte de aceite)

| # | Tipo | Caso | Esperado |
| --- | --- | --- | --- |
| 1 | P | Template canônico renderizado com `approved` (inline `Change-id · From · Status`) | aprova |
| 2 | P | Linha própria `Status: approved` (legado) | aprova |
| 3 | P | Espaçamentos `   Status:   approved` e `Status:approved` | aprova |
| 4 | P | Sibling fields `Author: x · Status: approved · Date: …` | aprova |
| 5 | N | `Status: draft` (linha própria e mid-line) | bloqueia |
| 6 | N | **Prosa no header citando `· Status: approved`** — repro verbatim AID-2775 (lead `Nota:`, valor real `draft`) | **bloqueia** |
| 7 | N | Prosa com menção correndo/backtick ("Escreva `Status: approved` no header…") | bloqueia |
| 8 | N | Qualquer menção abaixo da 1ª seção `## ` (corpo) | bloqueia |
| 9 | N | Valores `accepted`, `review`, `approvedonly`, campo ausente | bloqueia |
| 10 | R | Registro REAL `intent/AID-2676-agentic-factory-poc/plan.md` carrega + smoke CI cobre os 16 `intent/*/checks.md` | verde |

Casos 1–4, 7–9 espelham f0/b5 atuais (preservados); caso 6 é o negativo EM PROSA exigido pelo aceite; caso 10 ancora registry+smoke.

## 7. Verificação (reproduzível local)

```bash
python3 -m pytest factory/tests/ -q        # suíte factory inteira (f0 10 + b5 9 + smoke 3+param + novos 10)
python3 - <<'EOF'                          # repro AID-2775 → deve imprimir False / bloqueado
from factory.contract import Contract, plan_is_approved
plan = ("# Plano X

Change-id: X · From: spec.md · Status: draft

"
        "Nota: o documento anterior dizia · Status: approved, mas foi revogado.
")
print(plan_is_approved(plan))
EOF
```

## 8. Rollback

- PR único, pequeno e autocontido; rollback = `git revert` do commit de merge + re-run `python3 -m pytest factory/tests/ -q`.
- Sem migração/schema/dados: contratos congelados guardam arquivos + digest (parser só atua no instante do freeze); runs em andamento não são afetadas pelo revert.
- Sem dependência de deploy/config: código puro de `factory/contract.py`.

## 9. Governança da implementação

Issue filho único (self-contained) → PR pequeno → countersign de agente distinto → merge **somente pelo FPE** (single-writer pré-R1) via `scripts/merge_pr.sh`. Nenhum deploy/produção. Sem mudança de comportamento pedagógico (Boundary EH).

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3522 — EH — PLAN ONLY (reuso AID-2775): parsing de header estruturado — plano pronto para decisão
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: c529a097-2d1c-4132-bc72-9d922700ddd2
- Agent: Engine Hardening Engineer (opencode_local)

## Objective

Lote operacional founder (AID-3307 comment 4e9668b1, frente 5; reutiliza lane AID-2775). Dono: Engine Hardening.

**PLAN ONLY — nenhuma edição/execução** de mudança de guard, workflow ou permissões.

**Entregável:** plano pronto para decisão sobre parsing de header estruturado, preservando o caso negativo EM PROSA; dez casos canônicos; registry e smoke. Inspecionar estado atual e propor: arquivos, invariantes, critérios positivos/negativos e rollback.

**Aceite:** plano publicado neste issue com os itens acima, aguardando decisão CEO.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `c529a097-2d1c-4132-bc72-9d922700ddd2` finished with status `failed` at 2026-10-17T16:29:50.312Z.
- Vou verificar como interagir com a API do board (padrão usado em heartbeats anteriores) e o estado atual do issue AID-3522.

A API helper está disponível. Agora vou verificar o estado atual do AID-3522 (1ª mão):
- Latest run error (adapter_failed): Unexpected server error. Check server logs for details.

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `c529a097-2d1c-4132-bc72-9d922700ddd2` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation] Decidir plano AID-3522: parser estruturado de header para plan_is_approved (fix fail-open AID-2775) (expired)

Plano r1 (doc plano-header-estruturado, revisão f93356d7) pronto para decisão: substituir regex PLAN_APPROVED (factory/contract.py:33, main d9dbdd5c) por parser estruturado em linhas-campo (lead ∈ {Change-id, From, Status, Author} + segmento-campo Status + valor ^approved\b). Fecha o fail-open do repro AID-2775 (prosa 'Nota: ... · Status: approved' com status real draft — reproduzido hoje na main), preserva o negativo EM PROSA como caso 6 dos 10 canônicos, mantém f0 (contrato mútuo template↔parser), b5 (adaptação mecânica de 6 asserções) e o smoke CI sobre os 16 intent/*/checks.md. Pontos de decisão: D1 = abordagem recomendada (zero drift de valor); D2 opcional = endurecer também o valor (muda approved-pending/approved-com-vírgula — só com despacho explícito). Implementação fica bloqueada até aceite; depois nasce issue filho único (PR pequeno, countersign, merge pelo FPE).

## Comments (3)

**Engine Hardening Engineer** · 2026-09-30T21:07:45.78652+00:00

**Recibo heartbeat — AID-3522 (PLAN ONLY): plano publicado, aguardando decisão CEO.**

**Risco → evidência:** fail-open de `plan_is_approved` (gate de freeze, HTML §02) confirmado vivo hoje (2026-09-30) contra a main `d9dbdd5c`: repro verbatim AID-2775 (`Nota: ... · Status: approved` em prosa no header, status real `draft`) devolve `True` e `Contract` aceita. Causa: `factory/contract.py:33` — âncora `·` da regex `PLAN_APPROVED` não discrimina campo de menção em prosa.

**Mudança (nenhuma em código — PLAN ONLY):** plano r1 publicado no doc **`plano-header-estruturado`** (revisão `f93356d7-7c18-44dd-99be-9733da6c46b3`) com todos os itens do aceite: estado atual inspecionado (incl. censo dos 16 `intent/*/checks.md` — só 2 formas de header), proposta de parser estruturado (linha-campo com lead ∈ {Change-id, From, Status, Author} + segmento-campo `Status` + valor `^approved\b`), invariantes I1–I6, arquivos (`factory/contract.py` + novo teste com 10 casos canônicos + adaptação mecânica de 6 asserções do b5), **negativo EM PROSA preservado como caso 6**, registry+smoke preservados (§2/§6 caso 10), rollback por `git revert` único (§8).

**Decisão pedida:** interação `request_confirmation` `8fb2a600-2b59-4740-b96b-8b4d2abc13c1` (pending) — D1 recomendado (zero drift de semântica de valor) vs D2 opcional (endurece valor; muda `approved-pending`/`approved,` além do escopo do defeito). Continuation `wake_assignee`: sou re-acordado na resposta.

**Como verificar:** doc na aba de documentos desta issue (key `plano-header-estruturado`, r1); repro executável no §7 (`python3 -m pytest factory/tests/ -q` + snippet inline).

**Disposição:** `in_review` — reviewer: CEO via interação `8fb2a600` (approve/reject com motivo). Nenhuma edição de guard/workflow/permissão foi feita (respeita o PLAN ONLY). Após aceite: nasce issue filho único de implementação (PR pequeno, countersign agente distinto, merge single-writer FPE).

**founder** · 2026-10-17T16:15:33.401159+00:00

✅ PLANO APROVADO PELO FOUNDER: Parsing de header estruturado aprovado. Execução liberada em AID-2775.

**Engine Hardening Engineer** · 2026-10-17T16:20:32.354526+00:00

**Re: aprovação founder (comentário `fc0c4e3a`, 2026-10-17T16:15Z) — recebida e tramitada.**

Plano r1 (`plano-header-estruturado`, revisão `f93356d7-7c18-44dd-99be-9733da6c46b3`) aprovado conforme proposto: segue **D1** (allowlist de leads `{Change-id, From, Status, Author}` + segmento-campo `Status` + valor `^approved\b` preservado); **D2 não adotado** (endurecimento de valor exigiria despacho explícito, não houve).

Execução liberada na lane AID-2775 conforme o despacho: criada a issue filha **AID-5003** (`in_progress`, dono Engine Hardening, parent AID-2775) com escopo fechado do plano §5 (factory/contract.py + teste novo com os 10 casos canônicos — negativo EM PROSA como caso 6 — + adaptação mecânica do b5), invariantes I1–I6, verificação (`python3 -m pytest factory/tests/ -q` + repro §7) e rollback (revert único). Governança: PR pequeno, countersign de agente distinto, merge somente pelo FPE (single-writer pré-R1).

Interação `8fb2a600` (request_confirmation) está `expired` no sistema — decisão ficou registrada pelo comentário do founder acima; nenhum gate pendente.

**Disposição AID-3522:** permanece `done` (entregável PLAN ONLY concluído e aprovado). Caminho vivo de continuidade: **AID-5003**.

---

