# Spec: agentic factory — MOTOR da POC

Change-id: AID-2676-agentic-factory-poc · From: intent/AID-2676-agentic-factory-poc/intent.md · Status: accepted

## Requisitos

R1 **Estações como código.** Evento (ID, origem, risco; fila + lease
exclusivo) → Contrato (registro versionado `intent/<change-id>/` congelado
com digest; `checks.md` com IDs de obrigação e comando executável) →
Construir (worktree git isolado na base acordada; autor commita; recibo com
SHA + snapshot da árvore) → Provar (contexto verificador distinto executa os
checks e grava provas com exit code e digest do output) → Gate (fail-closed,
P1–P5) → PR (head = SHA provado; merge é decisão humana).

R2 **Estado recuperável.** Estado da run em `state.json` + recibos
append-only encadeados por hash em `ledger/<run-id>.jsonl`; retomada
(`resume`) não reexecuta estações concluídas nem apaga histórico; item
bloqueado volta como novo evento rastreável.

R3 **Casos negativos como critério de aceite.** Suite de testes demonstra
cada bloqueio: P1 duplicata de claim; P2 check sem prova/vermelho e perfil
standard por contexto errado; P3 mesmo contexto assinando build e veredito;
P4 SHA divergente, contrato divergente e arquivo não-rastreado novo; P5 head
de PR ≠ SHA provado.

R4 **Fronteiras.** Sem tocar `learner/`, `curriculum/`, `.mavis/`; sem novas
dependências; runtime state em `.scratch/factory/` (gitignored); promoção
nunca automática para produção.

## Design

- Pacote `factory/` no repo-raiz (ao lado de `learner/`, `engines/`), CLI
  `python3 -m factory`. Módulos finos por estação (`queue`, `contract`,
  `gitwork`, `verify`, `gate`, `coordinator`) para revisão por superfície.
- Ledger encadeado: cada recibo carrega `prev_hash` e `hash` (SHA-256 do
  JSON canônico) — tamper-evidente e auditável com `ledger --verify`.
- Lease via `O_CREAT|O_EXCL` (atomicidade do SO), TTL + heartbeat.
- Contrato: digest cobre change-id + base SHA + conteúdo dos arquivos;
  divergência run↔registro bloqueia a promoção.
- Compatibilidade tlc-spec-lean: registrada como spike em
  `checks.md`/README (adaptar formato ou validação explicitamente; não
  duplicar diretório).

## Concerns flagged

- `standard` profile: a revalidação independente de cobertura completa
  (mutantes) fica fora deste corte; o gate exige prova do verificador e
  revalidação de digest (P2 parcial declarado).
- Uma tarefa em voo por vez (piloto); paralelismo vem depois da evidência.
