# Persona Mneme — Deliverable (root copy)

> Cópia canônica em
> `/Users/danielbarreto/.mavis/plans/plan_8da356e9/outputs/persona-mneme/deliverable.md`.
> Esta cópia extra está em
> `/Users/danielbarreto/Development/aidevschool/.mavis/plans/persona-mneme-deliverable.md`
> (path pedido pela task).

## Summary
Criei os 4 arquivos canônicos (agent.md + PERSONA.md em Mavis e no repo) para o agente
**Mneme** (repetição espaçada) do ÁGORA Continuum. Os arquivos seguem o formato do
`cartografo` (7 seções em `agent.md`, 6 em `PERSONA.md`), em pt-BR, alinhados com as fontes
canônicas (`00_IDEIAS.md` § MNEME, `engines/minimaxDojo/prompts/per_agent/mneme.md` e
`engines/minimaxDojo/agents/07_mneme/README.md`). O modelo segue o README: **sonnet**.

## Changed files
- `/Users/danielbarreto/.mavis/agents/mneme/agent.md` (108 linhas, 7 seções H2)
- `/Users/danielbarreto/.mavis/agents/mneme/PERSONA.md` (155 linhas, 6 seções H2)
- `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/07_mneme/agent.md`
  (119 linhas, 7 seções H2)
- `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/07_mneme/PERSONA.md`
  (164 linhas, 6 seções H2)

## Notes
Ver `deliverable.md` (canônica) para notas detalhadas. Resumo:
- **Path correction:** task disse `engines/minimaxDojo/agents/07_mneme/` mas o caminho real é
  `engines/minimaxDojo/agents/07_mneme/` (ver `CLAUDE.md` linhas 12–22). Usei o real.
- **Section count:** `rg` reporta 11 hits de `^## ` em PERSONA.md, mas 5 são headings
  ilustrativos dentro de um fenced code block (template Mneme Session). Top-level real =
  6 seções.
- **Modelo:** sonnet (per `07_mneme/README.md` linha 14).
- **Idioma:** pt-BR com termos técnicos preservados (retrieval, interleaving, cron,
  handoff, etc.).
- **Boundary clara:** Mneme revisa; não ensina (→ `mestre_conteudo`), não julga (→
  `verifier`/`critico`), não trilha (→ `cartografo`), não reflete (→ `ouroboros`).
