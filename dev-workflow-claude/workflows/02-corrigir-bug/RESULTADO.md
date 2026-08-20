# Workflow 02 — Correção de bug com teste de regressão

## Problema que resolve

O jeito comum de corrigir bug com IA é colar o report e aceitar o patch. Três coisas dão
errado nesse atalho: (1) a correção é feita sem ninguém provar que o bug se reproduz, então
às vezes "corrige" o problema errado; (2) sem teste de regressão escrito ANTES (vermelho),
não há prova de que o teste detecta o bug — um teste escrito depois pode passar por acidente;
(3) o modelo aproveita para "melhorar" código em volta, e o diff vira uma refatoração com um
fix escondido dentro. O comando `/corrigir-bug` codifica a disciplina: reproduzir → teste
vermelho citando o bug → correção mínima na causa raiz (checando os chamadores) → suíte
inteira verde → revisão do diff por um revisor independente.

## O comando

Ativos permanentes deste workflow:

- **`.claude/commands/corrigir-bug.md`** — slash command genérico (`/corrigir-bug <report>`),
  com os 5 passos em ordem obrigatória: reprodução manual, teste de regressão vermelho,
  correção mínima na causa raiz (listando todos os chamadores antes de editar), suíte
  completa verde, revisão do diff.
- **`.claude/agents/revisor-de-diff.md`** — subagente revisor independente (produtor ≠
  verificador): audita o diff final com o critério "cada linha é necessária para a correção
  ou para o teste — nada além", e verifica que o teste falharia se o fix fosse revertido.

## Execução real

Demo: `demo/` é a CLI de time tracking `tempo` (Node puro, `node:test`) com um bug latente
introduzido em `src/duracao.js` — um único `?` a mais na regex tornou os dígitos antes de
`m` opcionais: `/^(?:(\d+)h)?(?:(\d+)?m)?$/`. Report do usuário em `demo/BUGREPORT.md`:
o typo `1hm` (queria digitar `1h5m`) foi aceito em silêncio como 1h.

### Passo 1 — Reproduzir o bug manualmente

Cenário exato do report:

```
$ node src/cli.js 2h 1hm 30m
Total: 3h30m
exit=0

$ node -e "import('./src/duracao.js').then(d => console.log('parseDuracao(\"1hm\") =', d.parseDuracao('1hm')))"
parseDuracao("1hm") = 60
```

Bug confirmado: `1hm` é aceito como 60 minutos em vez de dar erro. E a suíte existente
estava VERDE com o bug presente (é por isso que ele existia):

```
$ npm test
# tests 4
# pass 4
# fail 0
```

### Passo 2 — Teste de regressão que falha (vermelho)

Criado `test/bug-001-regressao.test.js` citando o bug no nome, cobrindo a unidade
(`parseDuracao`) e o ponto onde o usuário viu o sintoma (CLI + exit code). Saída real:

```
$ npm test
not ok 1 - BUG-001 (regressão): "m" sem dígitos antes deve ser rejeitado
  error: 'Missing expected exception: deveria rejeitar "1hm"'
  name: 'AssertionError'
not ok 2 - BUG-001 (regressão): CLI rejeita "1hm" com exit code 1
    esperava exit 1, veio 0 (stdout: Total: 3h30m)
  name: 'AssertionError'
ok 3 - REQ-1: aceita horas, minutos e formato composto
ok 4 - REQ-2: entrada inválida lança Error citando o texto
ok 5 - REQ-3: formatDuracao faz o caminho inverso
ok 6 - REQ-4: CLI soma durações e imprime o total
# tests 6
# pass 4
# fail 2
```

Vermelho pelo motivo certo: o sintoma do report (`veio 0 (stdout: Total: 3h30m)`).

### Passo 3 — Correção mínima na causa raiz

Causa raiz: na regex `PADRAO`, o grupo de minutos estava `(?:(\d+)?m)?` — o `?` interno
torna os dígitos opcionais, então `1hm` casa com minutos vazios. O sintoma aparece na CLI,
mas a causa vive em `parseDuracao`. Antes de editar, todos os chamadores foram levantados:

```
$ grep -rn "parseDuracao" src test
src/cli.js:11:  const total = args.reduce((soma, arg) => soma + parseDuracao(arg), 0);
test/bug-001-regressao.test.js:10:    assert.throws(() => parseDuracao(ruim), ...)
test/duracao.test.js:9-18: REQ-1 e REQ-2
```

Único chamador de produção é `cli.js`, que depende do contrato "entrada malformada lança
Error" — a correção RESTAURA esse contrato, não o quebra. Fix de 1 caractere:

```diff
-const PADRAO = /^(?:(\d+)h)?(?:(\d+)?m)?$/;
+const PADRAO = /^(?:(\d+)h)?(?:(\d+)m)?$/;
```

(Uma correção de sintoma seria, por exemplo, um `if (arg === '1hm')` na CLI — bloquearia o
caso do report e deixaria `2hm`, `10hm` etc. passando.)

### Passo 4 — Suíte inteira verde

```
$ npm test
# tests 6
# pass 6
# fail 0
```

Reprodução manual do report agora se comporta como esperado, sem quebrar o caminho feliz:

```
$ node src/cli.js 2h 1hm 30m
Duração inválida: "1hm" (use formatos como 2h, 45m, 1h30m)
exit=1

$ node src/cli.js 2h 1h5m 30m
Total: 3h35m
exit=0
```

### Passo 5 — Revisão do diff: só o necessário mudou

```
$ git diff --stat        # código (vs. baseline com o bug)
src/duracao.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Diff completo do commit de correção (código + teste novo):

```
$ git show --stat HEAD
 src/duracao.js                 |  2 +-
 test/bug-001-regressao.test.js | 18 ++++++++++++++++++
 2 files changed, 19 insertions(+), 1 deletion(-)
```

Revisão pelo critério do `revisor-de-diff`: os 2 arquivos tocados são exatamente a causa
raiz (1 linha) e o teste de regressão (arquivo novo); zero refatoração oportunista; se o
fix for revertido, o teste volta a falhar (foi visto vermelho no passo 2); o contrato dos
chamadores foi preservado. Veredito: APROVADO. Histórico do demo:

```
$ git log --oneline
14b4d65 fix: reject durations with 'm' but no digits (BUG-001)
c98056b chore: baseline with latent BUG-001 (malformed duration accepted)
```

## Como reproduzir

```bash
cd workflows/02-corrigir-bug/demo && npm test && { node src/cli.js 2h 1hm 30m && exit 1 || echo "OK: '1hm' segue rejeitada (regressão protegida)"; } && node src/cli.js 2h 1h5m 30m
```

Esperado: suíte com 6 testes verdes (incluindo os 2 `BUG-001 (regressão)`), a entrada
malformada `1hm` rejeitada com erro, e o caminho feliz imprimindo `Total: 3h35m` — exit 0.
(O estado ANTES da correção está preservado no commit `c98056b` do repositório git de
`demo/`: `git show c98056b:src/duracao.js` mostra a regex com o bug, e
`git diff c98056b HEAD` mostra que a correção tocou só a regex + o teste novo.)

## Valor para o dev

- **O bug nunca volta:** o teste de regressão nasceu vermelho reproduzindo o report — é
  prova executável de que ele detecta o bug, e fica na suíte para sempre.
- **Causa raiz em vez de band-aid:** o passo de listar chamadores antes de editar força a
  correção no mecanismo (`(\d+)?m` → `(\d+)m`), não um `if` para o caso relatado — aqui o
  fix verdadeiro foi 1 caractere, e cobriu `2hm`, `10hm` e todos os typos da mesma família.
- **Diff auditável:** a revisão final com critério "só o necessário mudou" (2 arquivos:
  1 linha de fix + o teste) mantém o histórico limpo e o review humano trivial.
