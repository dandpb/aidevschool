# Workflow 03 — Refatoração com rede de segurança

## Problema que resolve

Refatoração sem disciplina é a forma mais comum de quebrar código que funcionava: a IA (ou o dev)
"melhora" a estrutura, ajusta um teste "que estava errado" para o novo código passar, e o
comportamento muda em silêncio. O comando `/refatorar` codifica a rede de segurança:

1. Baseline 100% verde antes de tocar em qualquer coisa (senão, pare).
2. Objetivo declarado + lista explícita do que NÃO muda.
3. Passos pequenos, suíte completa após CADA passo (vermelho ⇒ reverte o passo).
4. `test/` é intocável — os testes são o contrato de comportamento.
5. Diff antes/depois no final, confirmando mudança mínima e testes idênticos.

## O comando

`.claude/commands/refatorar.md` — slash command genérico (`/refatorar <o que refatorar>`),
reutilizável em qualquer projeto/stack. Recebe o alvo via `$ARGUMENTS` e impõe o protocolo
acima, incluindo a regra de reverter (não "consertar pra frente") quando um passo quebra a suíte.

## Execução real

Demo: `demo/` — CLI de time tracking em Node 22 puro (`node:test`, zero dependências).
Estado inicial preservado em `antes/`. Alvo da refatoração:
**"extrair a validação de `parseDuracao` para função própria e eliminar a duplicação de
formatação entre `cli.js` e `duracao.js`"**.

### Passo 1 do protocolo — baseline verde

`npm test` no estado inicial:

```
> tempo-demo-refatoracao@1.0.0 test
> node --test

TAP version 13
# Subtest: REQ-1: aceita horas, minutos e formato composto
ok 1 - REQ-1: aceita horas, minutos e formato composto
# Subtest: REQ-2: entrada inválida lança Error citando o texto
ok 2 - REQ-2: entrada inválida lança Error citando o texto
# Subtest: REQ-3: formatDuracao faz o caminho inverso
ok 3 - REQ-3: formatDuracao faz o caminho inverso
# Subtest: REQ-4: CLI soma durações e imprime o total
ok 4 - REQ-4: CLI soma durações e imprime o total
1..4
# tests 4
# pass 4
# fail 0
# skipped 0
```

Baseline: **4/4 verde** (exit 0). Snapshot criado: `cp -R demo antes`.

### Passo 2 do protocolo — plano declarado

- **Objetivo:** (a) extrair a validação inline de `parseDuracao` para `validarDuracao`;
  (b) fazer `cli.js` reutilizar `formatDuracao` em vez de reimplementar a formatação h/m.
- **O que NÃO muda:** minutos retornados por `parseDuracao`, mensagem de erro
  (`Duração inválida: "..." ...`), saída do CLI (`Total: 2h15m`), exit codes, API exportada.
- **Passos:** 2 passos independentes, suíte completa entre eles.

### Passo 3 do protocolo — refatorar em passos pequenos

**Refactor passo 1** — `src/duracao.js`: regex movida para a constante `PADRAO`; validação
extraída para `validarDuracao(texto)`; `parseDuracao` vira composição (valida → converte).
Suíte após o passo:

```
1..4
# tests 4
# pass 4
# fail 0
```

**Refactor passo 2** — `src/cli.js`: removidas as 6 linhas que reimplementavam a formatação
(`Math.floor`, `%`, cadeia de if/else); agora importa e usa `formatDuracao(total)`.
Suíte após o passo:

```
1..4
# tests 4
# pass 4
# fail 0
```

Smoke manual do comportamento observável (idêntico ao antes):

```
$ node src/cli.js 1h30m 45m
Total: 2h15m
$ node src/cli.js abc
Duração inválida: "abc" (use formatos como 2h, 45m, 1h30m)   # exit 1
```

### Passo 4 do protocolo — testes intocados

Nenhum arquivo de `test/` foi editado durante o fluxo (prova no diff abaixo).

### Passo 5 do protocolo — diff antes/depois

`diff -ru antes demo` (saída real, íntegra — só os 2 arquivos de src aparecem):

```
diff -ru antes/src/cli.js demo/src/cli.js
--- antes/src/cli.js	2026-08-19 16:09:14
+++ demo/src/cli.js	2026-08-19 16:09:37
@@ -1,5 +1,5 @@
 #!/usr/bin/env node
-import { parseDuracao } from './duracao.js';
+import { parseDuracao, formatDuracao } from './duracao.js';
 
 const args = process.argv.slice(2);
 if (args.length === 0) {
@@ -9,13 +9,7 @@
 
 try {
   const total = args.reduce((soma, arg) => soma + parseDuracao(arg), 0);
-  const h = Math.floor(total / 60);
-  const min = total % 60;
-  let texto;
-  if (h && min) texto = `${h}h${min}m`;
-  else if (h) texto = `${h}h`;
-  else texto = `${min}m`;
-  console.log(`Total: ${texto}`);
+  console.log(`Total: ${formatDuracao(total)}`);
 } catch (erro) {
   console.error(erro.message);
   process.exit(1);
diff -ru antes/src/duracao.js demo/src/duracao.js
--- antes/src/duracao.js	2026-08-19 16:09:14
+++ demo/src/duracao.js	2026-08-19 16:09:23
@@ -1,8 +1,15 @@
-export function parseDuracao(texto) {
-  const m = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(texto);
+const PADRAO = /^(?:(\d+)h)?(?:(\d+)m)?$/;
+
+function validarDuracao(texto) {
+  const m = PADRAO.exec(texto);
   if (!m || (m[1] === undefined && m[2] === undefined)) {
     throw new Error(`Duração inválida: "${texto}" (use formatos como 2h, 45m, 1h30m)`);
   }
+  return m;
+}
+
+export function parseDuracao(texto) {
+  const m = validarDuracao(texto);
   return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
 }
 
```

E a prova de que os testes são idênticos:

```
$ diff -ru antes/test demo/test; echo $?
0
```

Diff mínimo confirmado: 2 arquivos de `src/`, zero arquivos de `test/`, nenhuma mudança
oportunista fora do objetivo declarado.

## Como reproduzir

```bash
cd workflows/03-refatorar-seguro
npm test --prefix demo                 # suíte DEPOIS da refatoração: 4/4 verde
diff -ru antes/test demo/test          # exit 0 ⇒ test/ intocado (contrato preservado)
diff -ru antes/src demo/src || true    # o diff da refatoração (só src/ mudou)
node demo/src/cli.js 1h30m 45m         # comportamento observável: Total: 2h15m
```

## Valor para o dev

- **Comportamento garantido por construção:** baseline verde + testes intocáveis + verde após
  cada passo tornam mudança silenciosa de comportamento praticamente impossível.
- **Passos pequenos com reversão barata:** se um passo quebra a suíte, reverte-se só aquele
  passo — nunca se depura uma bola de neve de mudanças acumuladas.
- **Diff auditável:** a comparação antes/depois final prova que só o objetivo declarado mudou,
  o que acelera code review e evita refatoração misturada com feature/fix.
