# pg-d01 — Exemplo trabalhado: bug aceito em silêncio pela suíte (fonte real do repo)

> **Fonte primária** (não reescrita aqui; consulte o original):
> `dev-workflow-claude/workflows/02-corrigir-bug/RESULTADO.md`
> (blob `bdfab8fb6160`, base `d9dbdd5c504e`, `main`).
> Demo executável em `dev-workflow-claude/workflows/02-corrigir-bug/demo/`.
> O que segue é o roteiro pedagógico do exemplo, com as saídas reais citadas
> pelo original — para você reproduzir, use a demo no caminho acima.

## O caso

CLI de time tracking `tempo` (Node puro, `node:test`). Um único `?` a mais
na regex de `src/duracao.js` tornou os dígitos antes de `m` opcionais:
`/^(?:(\d+)h)?(?:(\d+)?m)?$/`. O typo `1hm` (o usuário queria `1h5m`) era
aceito em silêncio como 1h. A suíte existente estava **verde com o bug
presente** — é por isso que ele existia.

## A disciplina em 5 passos (obrigatórios, nesta ordem)

### Passo 1 — Reproduzir o bug manualmente (antes de perguntar qualquer coisa)

Cenário exato do report, comando executado, saída real:

```
$ node src/cli.js 2h 1hm 30m
Total: 3h30m
exit=0        ← bug: "1hm" somado como 1h, sem erro
```

E o caso mínimo isolado (unidade, não CLI):

```
$ node -e "...parseDuracao('1hm')"
parseDuracao("1hm") = 60
```

Esperado-vs-observado definido **antes** de qualquer pedido de correção:
esperado = entrada malformada lança `Error` citando o texto; observado =
`1hm` vale 60 minutos em silêncio.

### Passo 2 — Teste de regressão VERMELHO citando o bug

`test/bug-001-regressao.test.js` cobrindo a unidade e o ponto onde o usuário
viu o sintoma (CLI + exit code). Vermelho pelo motivo certo (saída real):

```
not ok 1 - BUG-001 (regressão): "m" sem dígitos antes deve ser rejeitado
not ok 2 - BUG-001 (regressão): CLI rejeita "1hm" com exit code 1
    esperava exit 1, veio 0 (stdout: Total: 3h30m)
# tests 6 · pass 4 · fail 2
```

### Passo 3 — Correção mínima na causa raiz (checando os chamadores)

Causa raiz vive em `parseDuracao`, não na CLI. Todos os chamadores listados
antes de editar (`grep -rn "parseDuracao" src test`): único chamador de
produção é `cli.js`, cujo contrato ("entrada malformada lança Error") é
**restaurado**, não quebrado. Fix de 1 caractere:

```diff
-const PADRAO = /^(?:(\d+)h)?(?:(\d+)?m)?$/;
+const PADRAO = /^(?:(\d+)h)?(?:(\d+)m)?$/;
```

Correção de sintoma seria `if (arg === '1hm')` na CLI: bloquearia o caso do
report e deixaria `2hm`, `10hm` etc. passando.

### Passo 4 — Suíte inteira verde

```
$ npm test
# tests 6 · pass 6 · fail 0
```

E a reprodução manual do report agora se comporta como esperado (`1hm` →
`Duração inválida`, exit 1; `2h 1h5m 30m` → `Total: 3h35m`, exit 0).

### Passo 5 — Revisão do diff: só o necessário mudou

```
src/duracao.js | 2 +-                      (o fix)
test/bug-001-regressao.test.js | 18 +++    (o teste novo)
```

Critério do revisor independente: cada linha é necessária para a correção ou
para o teste — nada além.

## Como este exemplo se transporta para a sua tentativa

A mesma disciplina, num problema **novo** (fronteira de comparação, não
regex): o seu bug report está em `insumos/bugreport.md`, a autoridade da
regra em `insumos/REGRA.md`, e a fixture em `insumos/fixture/`. Os cinco
passos são os mesmos; a tecnologia muda (Python, sem framework).
