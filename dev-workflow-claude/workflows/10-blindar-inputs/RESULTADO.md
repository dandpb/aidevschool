# Workflow 10 — Hardening de fronteiras

## Problema que resolve

Todo programa tem fronteiras onde dados externos entram: argv, env, arquivos lidos, stdin. É exatamente aí que o código "que funciona" explode: JSON malformado, campo faltando, tipo errado, emoji onde se esperava número. O sintoma clássico é o stack trace cru na cara do usuário — que não diz o que fazer e vaza detalhes internos. O comando `/blindar` sistematiza o endurecimento: mapeia as fronteiras, bombardeia o programa real com entradas hostis (mini-fuzz caseiro, sem dependências), transforma cada crash em teste de regressão permanente e corrige com validação na fronteira (mensagem clara + exit code, nunca stack trace).

## O comando

`.claude/commands/blindar.md` — slash command genérico, reutilizável em qualquer projeto. Passos que ele codifica:

1. Mapear as fronteiras de entrada (argv, env, arquivos, stdin) e as suposições não validadas de cada uma.
2. Rodar mini-fuzz caseiro (~15 entradas hostis: vazio, unicode/emoji, caractere de controle, número gigante, string enorme, coisas que parecem flags, arquivo malformado...) classificando `ok` / `erro-controlado` / `CRASH`.
3. Todo crash não-controlado (stack trace cru) vira teste de regressão na suíte oficial.
4. Corrigir com validação na fronteira: mensagem de erro clara + exit code != 0, nunca stack trace.
5. Fuzz limpo no final: zero crashes, suíte inteira verde.

Aceita `$ARGUMENTS` para focar uma fronteira específica (ex.: `/blindar --arquivo`).

## Execução real

Demo: CLI `tempo` (time tracking, Node 22 puro). Foi adicionada uma fronteira nova sem validação nenhuma: `node src/cli.js --arquivo registros.json`, que lia o arquivo, fazia `JSON.parse` e acessava `r.duracao.trim()` direto, fora de qualquer try/catch.

**Passo 1 — Fronteiras mapeadas:** (a) argv com durações (`tempo 1h30m 45m`) — já protegida por try/catch; (b) arquivo JSON via `--arquivo` — nova, zero validação (assumia: arquivo existe, JSON válido, é lista, cada item é objeto com campo `duracao` string).

**Passo 2 — Mini-fuzz antes da correção** (`node tools/fuzz.mjs`, 16 casos, saída real):

```
erro-controlado argv vazio
erro-controlado argv unicode/emoji
erro-controlado argv caractere de controle
ok              argv número gigante
erro-controlado argv string enorme
erro-controlado argv parece flag
erro-controlado argv só traços
CRASH           arquivo inexistente
  └─ node:fs:440
CRASH           arquivo sem caminho
  └─ node:fs:438
CRASH           JSON malformado
  └─ <anonymous_script>:1
CRASH           JSON vazio
  └─ <anonymous_script>:1
CRASH           JSON não é lista
  └─ file:///.../demo/src/cli.js:15
CRASH           campo duracao faltando
  └─ file:///.../demo/src/cli.js:15
CRASH           duracao com tipo errado
  └─ file:///.../demo/src/cli.js:15
CRASH           duracao com emoji
  └─ file:///.../demo/src/duracao.js:6
CRASH           registro null na lista
  └─ file:///.../demo/src/cli.js:15

Resultado: 16 casos, 9 CRASH(es)
```

Exemplo do que o usuário via (stack trace cru, saída real de `node src/cli.js --arquivo sem-campo.json`):

```
file:///.../demo/src/cli.js:15
  const total = registros.reduce((soma, r) => soma + parseDuracao(r.duracao.trim()), 0);
                                                                            ^

TypeError: Cannot read properties of undefined (reading 'trim')
    at file:///.../demo/src/cli.js:15:77
    at Array.reduce (<anonymous>)
    at file:///.../demo/src/cli.js:15:27
```

E para JSON malformado:

```
SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
    at JSON.parse (<anonymous>)
    at file:///.../demo/src/cli.js:14:26
    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
```

**Passo 3 — Crashes viram testes de regressão:** `test/fronteiras.test.js` com 10 testes (FUZZ-1 a FUZZ-10). Cada um roda o binário real com a entrada hostil e assevera o contrato: exit 1, mensagem clara citando o problema, e `assert.doesNotMatch(stderr, /\n\s+at\s|node:internal/)` — stderr nunca pode conter stack trace. FUZZ-10 protege o caminho feliz da fronteira.

**Passo 4 — Correção na fronteira:** `src/cli.js` ganhou `somarArquivo()` que valida na entrada: leitura do arquivo com try/catch ("Não consegui ler o arquivo..."), `JSON.parse` com try/catch ("JSON inválido em..."), checagem de `Array.isArray` ("deve conter uma lista de registros, ex.: ..."), e por registro `typeof r.duracao === 'string'` ("Registro #N inválido: precisa do campo \"duracao\" como string"). Tudo desemboca no catch central: mensagem + `exit 1`. A lógica de negócio (`parseDuracao`/`formatDuracao`) não mudou.

**Passo 5 — Suíte verde + fuzz limpo** (saídas reais):

```
ok 1 - REQ-1: aceita horas, minutos e formato composto
ok 2 - REQ-2: entrada inválida lança Error citando o texto
ok 3 - REQ-3: formatDuracao faz o caminho inverso
ok 4 - REQ-4: CLI soma durações e imprime o total
ok 5 - FUZZ-1: arquivo inexistente → erro controlado (era ENOENT cru)
ok 6 - FUZZ-2: --arquivo sem caminho → erro controlado (era ENOENT cru)
ok 7 - FUZZ-3: JSON malformado → erro controlado (era SyntaxError crua)
ok 8 - FUZZ-4: arquivo vazio → erro controlado (era SyntaxError crua)
ok 9 - FUZZ-5: JSON que não é lista → erro controlado (era TypeError .reduce)
ok 10 - FUZZ-6: campo duracao faltando → erro controlado (era TypeError .trim)
ok 11 - FUZZ-7: duracao com tipo errado (número) → erro controlado (era TypeError)
ok 12 - FUZZ-8: registro null na lista → erro controlado (era TypeError)
ok 13 - FUZZ-9: duracao com emoji → erro controlado citando o valor
ok 14 - FUZZ-10: caminho feliz da fronteira continua funcionando
# tests 14
# pass 14
# fail 0
```

```
erro-controlado argv vazio
erro-controlado argv unicode/emoji
erro-controlado argv caractere de controle
ok              argv número gigante
erro-controlado argv string enorme
erro-controlado argv parece flag
erro-controlado argv só traços
erro-controlado arquivo inexistente
erro-controlado arquivo sem caminho
erro-controlado JSON malformado
erro-controlado JSON vazio
erro-controlado JSON não é lista
erro-controlado campo duracao faltando
erro-controlado duracao com tipo errado
erro-controlado duracao com emoji
erro-controlado registro null na lista

Resultado: 16 casos, 0 CRASH(es)
```

Placar: **9 CRASHes antes → 0 depois**; 10 testes de regressão novos; 14/14 testes verdes.

## Como reproduzir

```bash
cd workflows/10-blindar-inputs/demo
node --test            # 14 testes verdes (REQ-1..4 + FUZZ-1..10)
node tools/fuzz.mjs    # 16 casos hostis, "0 CRASH(es)" → termina com exit 0
```

## Valor para o dev

- **Crash de usuário vira contrato testado:** cada stack trace encontrado pelo fuzz existe agora como teste permanente — a regressão não volta despercebida.
- **Fuzz caseiro de ~40 linhas, sem dependências:** custo quase zero para bombardear qualquer CLI com entradas hostis antes que um usuário o faça, e fica no repo (`npm run fuzz`) para blindar a próxima fronteira.
- **Validação na fronteira, não no fundo da pilha:** o usuário recebe "Registro #1 inválido: precisa do campo \"duracao\" como string" em vez de `TypeError: Cannot read properties of undefined`, e o interior do código pode confiar nos dados.
