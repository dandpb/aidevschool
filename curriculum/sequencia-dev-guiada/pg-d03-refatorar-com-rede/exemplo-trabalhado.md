# pg-d03 — Exemplo trabalhado: refatoração com rede de segurança (fonte real do repo)

> **Fonte primária** (não reescrita aqui; consulte o original):
> `dev-workflow-claude/workflows/03-refatorar-seguro/RESULTADO.md`
> (blob `93087764ac38`, base `d9dbdd5c504e`, `main`). Demo executável em
> `dev-workflow-claude/workflows/03-refatorar-seguro/{antes,demo}/`
> (blobs de `demo/src/duracao.js` `be5ea5792f37`, `demo/src/cli.js`
> `6cae0259aabf`, `demo/test/duracao.test.js` `415065ed00c5`).
> O que segue é o roteiro pedagógico do exemplo, com as saídas reais citadas
> pelo original — para reproduzir, use a demo no caminho acima.

## O caso

CLI de time tracking `tempo` (Node 22 puro, `node:test`, zero
dependências): `parseDuracao` acumulava validação + conversão na mesma
função, e `cli.js` reimplementava a formatação h/m que já existia em
`formatDuracao`. Alvo declarado: **"extrair a validação de `parseDuracao`
para função própria e eliminar a duplicação de formatação entre `cli.js` e
`duracao.js`"**.

## O protocolo com rede de segurança (5 regras do workflow)

1. **Baseline 100% verde antes de tocar** (senão, pare).
2. **Objetivo declarado + lista explícita do que NÃO muda** — "minutos
   retornados, mensagem de erro, saída do CLI (`Total: 2h15m`), exit
   codes, API exportada".
3. **Passos pequenos, suíte completa após CADA passo** — vermelho ⇒
   reverte o passo (não "conserta pra frente").
4. **`test/` é intocável** — os testes são o contrato de comportamento.
5. **Diff antes/depois no final** — mudança mínima, testes idênticos.

## A execução real (saídas do RESULTADO.md)

**Passo 1 — baseline:** `npm test` no estado inicial → `# tests 4 ·
pass 4 · fail 0` (exit 0). Snapshot do estado preservado em `antes/`.

**Passos da refatoração (2 passos, suíte no meio de cada):**

- *passo 1* — `duracao.js`: regex para a constante `PADRAO`, validação
  extraída para `validarDuracao(texto)`, `parseDuracao` vira composição
  (valida → converte). Suíte: `1..4 · pass 4 · fail 0`.
- *passo 2* — `cli.js`: as 6 linhas que reimplementavam formatação
  (`Math.floor`, `%`, cadeia de `if/else`) viram uma chamada a
  `formatDuracao(total)`. Suíte: `1..4 · pass 4 · fail 0`.

**Smoke do comportamento observável (idêntico ao antes):**

```
$ node src/cli.js 1h30m 45m
Total: 2h15m
$ node src/cli.js abc
Duração inválida: "abc" (use formatos como 2h, 45m, 1h30m)   # exit 1
```

**Passos 4–5 — prova de diferença mínima:** `diff -ru antes/test
demo/test` → exit 0 (testes intocados); `diff -ru antes demo` → só os 2
arquivos de `src/` aparecem.

## O que o exemplo ensina — e onde a SUA prática é mais difícil

No exemplo do wf 03, a suíte existente (4 testes) cobria o comportamento
cobrado pelo objetivo: saída, erro e inversão de formato. Por isso "suíte
verde após cada passo" foi prova suficiente **lá**.

Na sua tentativa, **a suíte existente NÃO cobre todo o contrato**: há
cláusulas do `CONTRATO.md` (da fixture `pedidos.py`) que nenhum teste
enxerga — e a proposta do assistente do `PEDIDO.md` passa por cima delas
sem acordar a suíte. É exatamente o alerta da lição-âncora `l28`
(atividade `l28-a1`, feedback `opt-b`): "rewrite de uma vez troca
comportamento invisível junto — inclusive a parte que ninguém pediu para
mudar". E o aviso simétrico: **suíte verde não é ausência de regressão;
é ausência de evidência** — a suíte só prova o que ela cobre.

Por isso o seu ciclo tem um passo que o exemplo não precisou explicitar:
**caracterizar o comportamento não coberto ANTES de aceitar qualquer
proposta** (passo 3 da tentativa). O exemplo dá o método; a prática te
obriga a fechar o buraco da rede primeiro.

## Como reproduzir o exemplo (offline, sem instalar nada)

```bash
cd dev-workflow-claude/workflows/03-refatorar-seguro
npm test --prefix demo                 # suíte DEPOIS: 4/4 verde
diff -ru antes/test demo/test          # exit 0 ⇒ test/ intocado
node demo/src/cli.js 1h30m 45m         # Total: 2h15m
```
