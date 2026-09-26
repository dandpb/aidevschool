# Checks — AID-2697-lesson-privacidade-dados

Provas executadas pela estação Provar no worktree da run.
Formato: `C<n> | profile=<cheap|standard> | <comando shell>` — sem operadores
de pipe `|`/`||` nos comandos (parser de checks.md; fricção #1 do programa
FACTORY-STRESS).

C1 | profile=cheap | python3 -c "import pathlib,re,sys; c=pathlib.Path('engines/zai-duolingo-like/src/lib/curriculum-data.ts').read_text(encoding='utf-8'); t=pathlib.Path('engines/zai-duolingo-like/tests/unit/curriculum-privacy-lesson.test.ts'); ok='privacidade-dados' in c and t.exists() and len(re.findall('m9l3e[0-9]', c))>=5; print('C1 structural:', 'OK' if ok else 'FAIL', '- lesson present, test file present, 5 exercises'); sys.exit(0 if ok else 1)"
C2 | profile=standard | bash -c "cd engines/zai-duolingo-like && env -u NODE_ENV npm ci --no-audit --no-fund --include=dev && env -u NODE_ENV npm test"
C3 | profile=standard | bash -c "cd engines/zai-duolingo-like && env -u NODE_ENV npx tsc --noEmit"
C4 | profile=standard | bash -c "cd engines/zai-duolingo-like && env -u NODE_ENV npm run lint"

## Notas

- C2–C4 (standard) exigem prova produzida pelo contexto verificador (P2/P3):
  instalação limpa + suíte completa (128 testes existentes + regressão nova)
  + typecheck + lint, os gates declarados no QWEN.md do engine.
- `env -u NODE_ENV` em C2–C4: prova não depende do ambiente do operador —
  NODE_ENV=production no shell que invoca a fábrica omite devDeps e a run
  morre em "vitest: not found" (fricção #3, observada na run FE-2697-retry1).
- npm 11.17 gate `allow-scripts` bloqueia postinstall de prisma/esbuild com
  WARNING apenas; suíte comprovadamente verde nesse regime (mesma prova C2).
- C1 é estrutural e roda sem dependências: presença da lição, do arquivo de
  teste e dos 5 ids de exercício no mesmo commit.
- `npm run test:e2e` fica fora do corte (requer `next build`; custo alto para
  o verificador desta run — anotado como fricção no receipt da issue).
