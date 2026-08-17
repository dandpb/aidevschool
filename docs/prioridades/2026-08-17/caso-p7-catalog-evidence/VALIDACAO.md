# VALIDAÇÃO — P7: catálogo vs evidência (projeto 02)

## RED

```bash
python3 docs/prioridades/2026-08-17/caso-p7-catalog-evidence/verify_catalog.py
```

```text
catalog evidence verification: FAIL
- 02_key_value_store: catalog claims go-impl/ exists but directory is absent
- 02_key_value_store: catalog claims rust-impl/ exists but directory is absent
```

Causa raiz: o commit `1b0a309` ("quality cuts") removeu os backfills Go/Rust do projeto 02, mas
o catálogo continuou dizendo "code exists, unverified".

## Correção

- `curriculum/catalog.md` (bloco do projeto 02): Status/Evidence/Go coverage/Rust tests agora
  dizem que as implementações Go/Rust foram **removidas** em `1b0a309` e não existem em disco.
- `python3 -m learner.substrate` regenerou 30 projeções derivadas (o catálogo alimenta views).

## GREEN

```text
catalog evidence verification: PASS
directory-existence claims match the filesystem
Canonical learner state and generated projections are in sync.
```

## Entregue

Catálogo honesto sobre o projeto 02 + verificador genérico que falha se qualquer projeto
voltar a afirmar que `go-impl/`/`rust-impl/` existe sem o diretório em disco.

## Limites

- O verificador cobre apenas afirmações de existência de diretório; não valida números de
  cobertura nem status `scaffolded` dos outros 16 projetos.
- Nenhum status foi promovido; o projeto 02 continua Node.js-only certificado.
