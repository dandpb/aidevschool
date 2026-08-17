# SPEC — consistência da entrada pública

## Estado atual

O README em `HEAD` contém:

```text
There is no public, browser-only learner route yet.
```

A visão em `docs/VISION.md` aponta para:

```text
https://aidevschool-literacydojo.netlify.app
```

Nesta rodada, `curl` retornou HTTP 200 para essa URL.

## Estado desejado

A seção de caminhos do README informa que LiteracyDojo possui uma rota pública verificável,
local-first e sem conta. O OS/Trilha Dev permanece com suas próprias condições e limites.

## Interface do verificador

```text
python3 docs/prioridades/2026-08-17/caso-p3-public-entry/verify_public_entry.py
```

O script aceita um caminho opcional de README para permitir o ciclo RED contra `git show HEAD`.

## Limites

Texto consistente e HTTP 200 provam encontrabilidade e disponibilidade no momento da checagem.
Não provam que um aluno completou uma lição, voltou depois ou aprendeu.
