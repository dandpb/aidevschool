# Execution record

Aplicar [.checks/context-authority.md](../../.checks/context-authority.md), perfil light.
Worktree isolado `/tmp/aidevschool-context-authority`, branch `feat/context-authority`;
base d723f7bb53d00401d3c9d6bf3be13d9fc670e971. Alterações do checkout original preservadas.

1. Novos testes O/M do checklist, registrar red antes da implementação.
2. PipelineStatus/serialização, writers checklist/CLI/supervisor, os_adapter/hook
   e contratos do motor. Atualizar mapa, glossários, README MVP e MANIFEST.
3. Provas: `python -m pytest engines/openclaw/tests/test_provenance.py
   engines/miniMaxEvolutionEngine/tests/test_context_authority.py -v`.
4. Regressão: `python -m pytest engines/openclaw/tests
   engines/miniMaxEvolutionEngine/tests
   engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests -q`.
5. REVIEW.md + simplify; commits locais, seguidos de verificação independente.

Risco principal: digest de autorização deve usar os mesmos campos/bytes da
gravação; nenhum serializer paralelo pode omitir a procedência. Outro limite:
proveniência não resolve corrida entre writers nem autoriza mastery.
Novos testes permitidos; testes existentes e projeções protegidas não serão editados.
