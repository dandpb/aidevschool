# Plan: agentic factory — MOTOR da POC

Change-id: AID-2676-agentic-factory-poc · From: intent/AID-2676-agentic-factory-poc/spec.md · Status: approved

Aprovação: diretriz explícita do dono no corpo da issue AID-2676
("implemente na pratica os conceitos") sobre a proposta anexa; decisões
pendentes remanescentes (item real do piloto, extensão staging) seguem no
gate de confirmação da issue, não implícitas aqui.

## Files that change

- `factory/__init__.py`, `factory/model.py`, `factory/queue.py`,
  `factory/ledger.py`, `factory/contract.py`, `factory/gitwork.py`,
  `factory/verify.py`, `factory/gate.py`, `factory/coordinator.py`,
  `factory/__main__.py`, `factory/README.md` (new)
- `factory/tests/test_factory_poc.py` (new) — critérios P1–P5
- `intent/AID-2676-agentic-factory-poc/{intent,spec,plan,checks}.md` (new)
- `pyproject.toml` — acrescenta `factory/tests` aos testpaths
- `AGENTS.md` — estrutura: linha do pacote `factory/`

## Order of work

1. Registro versionado da mudança (intent/spec/plan/checks) — contrato antes
   do código.
2. Pacote `factory/` por estação (queue/lease → ledger → contract → gitwork
   → verify → gate → coordinator/CLI).
3. Suite de testes com casos negativos P1–P5 + caminho feliz ponta-a-ponta.
4. Fiação: pyproject testpaths + AGENTS.md + README.
5. Verificação local (pytest) → commit → push → PR para decisão humana.

## Risks

- **Risco maior:** gates falsos-positivos (promover sem evidência). Mitigado
  por fail-closed default e testes negativos por critério.
- Worktrees em ambientes sem git configurado: testes fixture inicializam
  repo temporário com user.name/email locais.
- Ledger em disco sem lock de escrita: piloto é single-writer por run
  (lease); concorrência multi-run fica fora do corte.
- Alternativas consideradas e NÃO escolhidas: estender o supervisor do
  miniMaxEvolutionEngine (fronteira de domínio do HTML); usar SQLite
  (dependência de binário/lock pouco auditável em Markdown/NDJSON-first).

## Proof

- `python3 -m pytest factory/tests/ -q` → all green, incluindo os 6 casos
  negativos (P1–P5) e o fluxo ponta-a-ponta com ledger íntegro.
- `python3 -m factory ledger <event-id> --verify` na run de demonstração →
  `{"chain_ok": true}`.
- `git status --porcelain` limpo no checkout antes do fim do task record.

## Verification split

Producer (CEO, esta mudança) ≠ verifier: veredito fresh-context countersign
em issue filha antes de qualquer merge — gate P3 aplicado a nós mesmos.
