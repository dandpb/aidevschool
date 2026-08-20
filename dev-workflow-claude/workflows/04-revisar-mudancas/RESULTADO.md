# Workflow 04 — Code review multi-dimensão

## Problema que resolve

Review de PR feito "no olho" mistura tudo numa passada só e deixa passar exatamente o que mais custa caro: o caso de borda que nenhum teste cobre e a abstração que ninguém pediu. Pior: achado crítico vira debate de opinião. O comando `/revisar` separa a revisão em 3 lentes independentes (corretude, simplicidade, testes), exige `arquivo:linha` em cada achado e impõe a regra que muda o jogo: **achado crítico só existe se houver um teste executável que falha na versão proposta**.

## O comando

`.claude/commands/revisar.md` — genérico, funciona em qualquer repositório git:

1. **Delimitar o diff** (`$ARGUMENTS` = range git; default `git diff HEAD`) — só o diff é revisado.
2. **Lente 1 — Corretude:** enumerar entradas-limite (vazio, zero, um elemento, não-inteiro…) de cada função tocada.
3. **Lente 2 — Simplicidade:** caçar abstrações de uso único, parâmetros sem chamador, caches que nunca acertam — e dizer o que deletar.
4. **Lente 3 — Testes:** comparar os testes do diff com os casos de borda da Lente 1; listar o que falta.
5. **Tabela de achados:** `arquivo:linha` | problema | correção | gravidade (CRÍTICO/MÉDIO/BAIXO).
6. **Prova executável:** todo CRÍTICO ganha um teste mínimo que falha na versão proposta; se passar, o achado é rebaixado.
7. **Veredito:** APROVAR ou PEDIR MUDANÇAS; o teste-prova fica no repo como critério de aceite da correção.

## Execução real

Demo: cópia do projeto `tempo` (CLI de time tracking, Node 22 puro, `node:test`). Mudança proposta: nova função `mediaDuracoes` em `src/duracao.js`.

**Passo 1 — diff delimitado** (`git diff HEAD` sobre o commit base `8e03ee5`):

```
 src/duracao.js       | 14 ++++++++++++++
 test/duracao.test.js |  7 ++++++-
 2 files changed, 20 insertions(+), 1 deletion(-)
```

Trecho central da proposta (`src/duracao.js`):

```js
const ESTRATEGIAS = {
  aritmetica: (total, n) => total / n,
};

export function mediaDuracoes(textos, { estrategia = 'aritmetica', cache = new Map() } = {}) {
  const chave = textos.join('|');
  if (cache.has(chave)) return cache.get(chave);
  const total = textos.reduce((soma, t) => soma + parseDuracao(t), 0);
  const media = Math.round(ESTRATEGIAS[estrategia](total, textos.length));
  const resultado = formatDuracao(media);
  cache.set(chave, resultado);
  return resultado;
}
```

Detalhe importante: a suíte da proposta estava **verde** — `npm test` na versão proposta:

```
# tests 5
# pass 5
# fail 0
```

Ou seja: CI verde não é aprovação. A revisão começa aí.

**Passos 2–4 — as 3 lentes** aplicadas ao diff:

- Corretude: entradas-limite de `mediaDuracoes` → lista vazia (`0/0`!), um elemento, média não-inteira.
- Simplicidade: registry `ESTRATEGIAS` com 1 estratégia; parâmetro `cache` com default `new Map()` recriado a cada chamada (nunca acerta, nenhum chamador o passa).
- Testes: o teste novo (REQ-5) só cobre o caminho feliz com 2 elementos.

**Passo 5 — tabela de achados:**

| # | Local (versão proposta) | Problema | Correção sugerida | Gravidade |
|---|---|---|---|---|
| 1 | `src/duracao.js:19` | `mediaDuracoes([])` divide `0/0` → retorna a string `"NaNm"` silenciosamente | Guarda no topo: `if (textos.length === 0) throw new Error('mediaDuracoes: lista vazia')` | **CRÍTICO** |
| 2 | `src/duracao.js:11-13` | Registry `ESTRATEGIAS` com uma única estratégia e parâmetro `estrategia` que nenhum chamador passa — flexibilidade especulativa | Deletar o registry; dividir inline | MÉDIO |
| 3 | `src/duracao.js:15-17,21` | `cache` com default `new Map()` criado por chamada: nunca há hit; código morto que esconde o cálculo | Deletar o cache; função vira 4 linhas | MÉDIO |
| 4 | `test/duracao.test.js:27` | REQ-5 cobre só o caminho feliz; faltam: lista vazia, 1 elemento, média não-inteira (arredondamento) | Adicionar os 3 casos de borda | MÉDIO |

**Passo 6 — prova executável do achado crítico.** Evidência bruta do bug na versão proposta:

```
$ node -e "import('./src/duracao.js').then(m => console.log('mediaDuracoes([]) →', JSON.stringify(m.mediaDuracoes([]))))"
mediaDuracoes([]) → "NaNm"
```

Teste-prova `test/media.test.js` criado e executado contra a versão proposta — **falha**:

```
not ok 1 - PROVA-CRÍTICO: mediaDuracoes([]) deve lançar Error, nunca retornar "NaNm"
  ---
  failureType: 'testCodeFailure'
  error: 'Missing expected exception.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  operator: 'throws'
  ...
ok 2 - COBERTURA: lista com um único elemento retorna o próprio valor
ok 3 - COBERTURA: média não-inteira é arredondada para minuto inteiro
```

**Passo 7 — veredito: PEDIR MUDANÇAS.** Achado #1 é crítico e provado por teste; #2/#3 são deleções diretas; #4 fica coberto pelo próprio teste-prova.

**Correção aplicada** (achados 1–3: guarda de lista vazia + deleção do registry e do cache — a função caiu de 13 para 5 linhas):

```js
export function mediaDuracoes(textos) {
  if (textos.length === 0) throw new Error('mediaDuracoes: lista vazia');
  const total = textos.reduce((soma, t) => soma + parseDuracao(t), 0);
  return formatDuracao(Math.round(total / textos.length));
}
```

`npm test` após a correção — suíte completa, incluindo o teste-prova:

```
# tests 8
# pass 8
# fail 0
```

Histórico do demo (a branch `proposta` preserva a versão com bug para reprodução):

```
d2c74d1 wip: proposed mediaDuracoes as submitted for review (bug + over-engineering)   [branch proposta]
6fcb196 feat: mediaDuracoes (reviewed: empty-list guard, over-engineering removed)     [master]
8e03ee5 chore: base project
```

## Como reproduzir

```bash
cd workflows/04-revisar-mudancas/demo
# 1) Versão PROPOSTA (branch 'proposta'): o teste-prova FALHA — achado crítico provado
git checkout -q proposta
node --test test/media.test.js && echo "ERRO: deveria falhar" || echo ">> bug provado: teste-prova FALHA na versão proposta"
# 2) Versão FINAL revisada (master): suíte completa passa (8/8), incluindo o teste-prova
git checkout -q master
npm test
```

Saída esperada: a etapa 1 termina com a mensagem `>> bug provado...` e a etapa 2 termina com `# pass 8 / # fail 0` (exit 0).

## Valor para o dev

- **Crítico sem prova não bloqueia merge:** cada achado grave vira um teste que falha — o review deixa de ser opinião e o teste fica no repo como critério de aceite da correção.
- **CI verde ≠ aprovado:** a proposta passava 5/5 nos próprios testes e ainda assim devolvia `"NaNm"`; a lente de corretude por entradas-limite pega o que o autor não testou.
- **A lente de simplicidade paga o review:** deletou registry de estratégia única e cache que nunca acertava — a função caiu de 13 para 5 linhas e ficou mais fácil de revisar da próxima vez.
