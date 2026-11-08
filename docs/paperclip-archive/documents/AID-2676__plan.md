<!-- issue: AID-2676 | key: plan | doc_id: ba86d24e-a400-48d9-ad7d-09bd1308cb98 | updated: 2026-09-26 01:48:05.087+00 -->

# AID-2676 — Agentic factory POC: plano de implementação prática

(AID-2676)

# AID-2676 — Agentic factory: implementação prática dos conceitos do HTML

**Fonte primária:** anexo `agentic-factory-poc-aidevschool.export.html` ("Da sequência de skills à fábrica agente", 25 set 2026). **Diretriz do dono** (corpo da issue): "leia o html e implemente na pratica os conceitos."

## Plano executado (entregas do HTML §05)

### 00 · BASE — fixar um caso e um contrato ✅
- Registro canônico versionado: `intent/AID-2676-agentic-factory-poc/` com `intent.md`, `spec.md`, `plan.md` + **`checks.md`** (acréscimo do piloto: IDs de obrigação C1–C3 + comando executável + perfil cheap/standard).
- Checks congelados **antes** do código; spike de compatibilidade tlc-spec-lean declarado explicitamente (sem `.specs/` concorrente, sem symlink).

### 01 · MOTOR — executar e retomar ✅
- Pacote `factory/` (stdlib only, Python ≥3.11) com as estações:
  - **Evento**: fila + lease exclusivo atômico (`O_CREAT|O_EXCL`, TTL+heartbeat); reenvio idempotente por ID. (P1)
  - **Contrato**: congela `intent/<change-id>/` com digest SHA-256; plano precisa `Status: approved` para liberar build.
  - **Construir**: worktree git isolado na base acordada; autor commita; recibo grava SHA + snapshot da árvore (rastreados + não-rastreados).
  - **Provar**: Verifier de contexto distinto executa os checks; provas com exit code, digest do output e contexto. Perfil `standard` exige prova produzida pelo verificador. (P2/P3)
  - **Gate**: fail-closed P1–P5 — SHA build==verify==PR-head, drift de não-rastreados, divergência contrato↔registro, prova ausente/tampered, autor≠verificador. (P4/P5)
  - **Ledger**: recibos append-only encadeados por hash (`ledger --verify`); `resume` retoma sem reexecutar/apagar; item bloqueado volta como novo evento rastreável.
- Runtime state fora do Git: `.scratch/factory/` (já gitignored).
- CLI: `python3 -m factory intake|claim|freeze|build|prove|gate|status|resume|ledger`.

### 02 · PR — fechar com evidência ✅ (aberto)
- PR **#527** `aid-2676/agentic-factory-poc` → `main`, head `c53542b0`.
- Veredito independente (producer ≠ verifier) despachado em issue filha; merge só após countersign (gate Stage-2 `sdlc-guards`).

## Evidência

- `python3 -m pytest factory/tests/ -q` → **18 passed** (casos negativos P1–P5 inclusos).
- Checks congelados: C1 18 passed · C2 import OK · C3 (e2e|negative|ledger) 6 passed.
- Demo CLI ponta-a-ponta (contextos distintos): intake idempotente → claim duplicado recusado (exit 2) → freeze (digest `1e1d5163…`) → build (`d0dae604…`) → prove all_passed [C1,C2] → gate **promote** → ledger `{"entries":4,"hashes_ok":true,"chain_ok":true}`.

## Decisões pendentes (gate humano — HTML §06)

1. **Escopo da POC**: confirmar "terminar em PR/CI" (recomendação) — staging/produção ficam de fora até haver sinais/autorização próprios.
2. **Item real do primeiro ciclo ponta-a-ponta**: bug/melhoria pequena em um engine com teste executável, fora de `learner/` e `curriculum/` (o MOTOR roda; falta escolher o caso real).

## Follow-ups declarados

- Cobertura por mutantes do perfil `standard` (spec: concerns flagged).
- Paralelismo multi-run (piloto: 1 tarefa em voo) e lock de escrita do ledger.
