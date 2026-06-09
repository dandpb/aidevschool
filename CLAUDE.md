# AI DevSchool — Ecossistema (Claude Code, nível raiz)

- [docs/PROMPTS/-01_GOAL.md](docs/PROMPTS/-01_GOAL.md) — FOCO PRINCIPAL
- [docs/PROMPTS/00_IDEIAS.md](docs/PROMPTS/00_IDEIAS.md) — IDEIAS INICIAIS DE PROJETOS

> **`aidevschool/` é o ecossistema** (guarda-chuva), não um único produto. As convenções completas
> estão em [AGENTS.md](AGENTS.md). Este arquivo é o contexto de raiz para o Claude Code.

## Estrutura

```
aidevschool/                 # ECOSSISTEMA
├── engines/                 # aplicações (motores) — cada uma um projeto separado
│   ├── miniMaxEvolutionEngine/   # motor no Claude Code: .claude/ + CLAUDE.md (loop 5 fases + verifier + gate)
│   ├── minimaxDojo/              # tutoring-core (14 agentes)
│   ├── codexDojo/                # app user-facing (pnpm)
│   └── polyglotEvolutionArena/
├── curriculum/              # COMPARTILHADO: desafios + catalog.md
├── learner/                 # COMPARTILHADO: jornada do aprendiz (state, profile, pitfalls, journal, pipeline_status)
├── docs/PROMPTS/            # metas, ideias, seeds do ecossistema
└── .mavis/ .opencode/ .Codex/ .playwright-mcp/   # tooling de plataforma
```

Princípio: **1 aprendiz, 1 currículo, vários motores.** `curriculum/` e `learner/` vivem só na raiz
e nunca são duplicados por motor. Symlinks de compatibilidade na raiz (`projects→curriculum`,
`.agora→learner`, `learning_journal.md→learner/journal.md`, `project_proposal.md→curriculum/catalog.md`)
mantêm plataformas legadas funcionando.

## Como trabalhar

- **Para o motor Claude Code** (agentes/comandos de 5 fases): abra o Claude Code com raiz em
  **`engines/miniMaxEvolutionEngine/`**. Lá estão `.claude/` (subagents, comandos `/devschool-*`,
  skill `agora-continuum`, hook de briefing) e o `CLAUDE.md` detalhado do orquestrador. O motor
  acessa o substrato compartilhado via symlinks internos (`curriculum/`, `learner/`, `docs/`, `.mavis/`).
- **Para o app codexDojo:** trabalhe em `engines/codexDojo/` (`pnpm run lint|test|build`).

## Regras de ouro (ecossistema)

1. **Learning gate:** o aprendiz tenta e é avaliado (evidência executável) antes de a IA marcar `mastered`.
2. **Produtor ≠ verificador.** Nada de auto-verificação.
3. **Sem afirmações sem evidência** (mastery, paridade, benchmark, robustez).
4. **Filesystem é a fonte da verdade**; estado auditável em Markdown/YAML/NDJSON.
5. Antes de commit: rode `/simplify` no diff, aplique as recomendações, **depois** commite.
