# Workflow 05 — Documentação com exemplos executáveis

## Problema que resolve

Documentação de API envelhece: o código muda, o `README`/`API.md` não, e o exemplo que o dev copia
da doc simplesmente não funciona mais. Ninguém percebe porque nada executa a documentação.
O comando `/documentar` inverte isso: todo exemplo do `API.md` vira uma asserção executada por um
doc-test plugado no `npm test`. **Documentação que mente quebra o build** — a doc e o código não
conseguem mais divergir silenciosamente.

## O comando

`.claude/commands/documentar.md` — genérico, reutilizável em qualquer projeto Node. Codifica 5 passos:

1. Ler o código público e extrair assinaturas/contratos (confirmando comportamento com `node -e` quando necessário).
2. Escrever `API.md` com ≥1 exemplo executável por função no formato `expressao // => valor` (e `// => throws` para erros).
3. Criar `tools/doctest.mjs`: extrator + executor caseiro (36 linhas, zero deps) que transforma cada linha `// =>` em `assert.deepStrictEqual`/`assert.throws` e reporta arquivo:linha das falhas.
4. Rodar e corrigir a documentação até o doc-test sair com exit 0 (sem enfraquecer exemplos; falha que revelar bug real é escalada, não escondida).
5. Plugar no `npm test` (`"test": "node --test && node tools/doctest.mjs API.md"`).

## Execução real

Fluxo executado no `demo/` (cópia do projeto `tempo`: `parseDuracao`/`formatDuracao`, Node 22, zero deps).

**Passo 1 — contratos extraídos de `src/duracao.js`:** `parseDuracao(texto) → number` (minutos; lança
`Error` fora do padrão `NhNm`) e `formatDuracao(minutos) → string` (formato compacto, omite parte zero).

**Passos 2-3 — `API.md` v1 (com duas mentiras propositais) + `tools/doctest.mjs`.** A v1 afirmava
`parseDuracao('90m') // => 60` e `formatDuracao(90) // => '90m'` — ambos falsos.

**Passo 4 — doc-test pega as mentiras** (`node tools/doctest.mjs API.md`, saída real):

```
FAIL API.md:18  parseDuracao('90m')     // => 60
       código devolve: 90  |  doc afirma: 60
FAIL API.md:33  formatDuracao(90)  // => '90m'
       código devolve: "1h30m"  |  doc afirma: "90m"
doc-test: 11 exemplos em API.md — 9 ok, 2 falha(s)
exit=1
```

**Passo 5 — integrado ao `npm test`, ainda com a doc mentirosa:** os 4 testes unitários passam,
mas o build quebra por causa da doc (saída real, resumida):

```
> tempo-doc-demo@1.0.0 test
> node --test && node tools/doctest.mjs API.md
...
# tests 4
# pass 4
# fail 0
FAIL API.md:18  parseDuracao('90m')     // => 60
       código devolve: 90  |  doc afirma: 60
FAIL API.md:33  formatDuracao(90)  // => '90m'
       código devolve: "1h30m"  |  doc afirma: "90m"
doc-test: 11 exemplos em API.md — 9 ok, 2 falha(s)
exit=1
```

**Correção da documentação** (`// => 90` e `// => '1h30m'`) e rerun do `npm test` (saída real, resumida):

```
> tempo-doc-demo@1.0.0 test
> node --test && node tools/doctest.mjs API.md
...
# tests 4
# pass 4
# fail 0
doc-test: 11 exemplos em API.md — 11 ok, 0 falha(s)
exit=0
```

Estado final do `demo/`: `API.md` correto (11 exemplos), doc-test no `npm test`.

## Como reproduzir

```bash
cd workflows/05-documentar-codigo/demo

# 1) Recria a mentira original numa cópia da doc e prova que o doc-test a pega
sed "s|formatDuracao(90)  // => .1h30m.|formatDuracao(90)  // => '90m'|" API.md > API.mentirosa.md
if node tools/doctest.mjs API.mentirosa.md; then
  echo "ERRO: doc-test deixou a mentira passar"; rm API.mentirosa.md; exit 1
else
  echo "OK: doc-test pegou a doc mentirosa (exit 1)"
fi
rm API.mentirosa.md

# 2) Suíte completa com a doc correta: testes unitários + doc-test (exit 0)
npm test
```

## Valor para o dev

- **Doc que não apodrece:** qualquer mudança de comportamento em função pública quebra o `npm test` até a doc ser atualizada — a divergência doc/código morre no CI, não na mão do usuário.
- **Exemplos copiáveis garantidos:** todo snippet do `API.md` foi executado de verdade; o dev pode colar qualquer exemplo e ele funciona.
- **Custo quase zero:** 36 linhas de script sem dependências, uma convenção (`// =>`) e uma linha no `package.json` — funciona em qualquer projeto Node.
