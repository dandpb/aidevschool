---
description: Gera documentação de API com exemplos executáveis (doc-test) — documentação que mente quebra o build
---

# /documentar — Documentação com exemplos executáveis

Documente a API pública de $ARGUMENTS (se vazio, documente todos os módulos públicos do projeto). A regra central: **todo exemplo da documentação é executado por um doc-test**. Se um exemplo divergir do comportamento real, o build quebra.

## Passos

1. **Ler o código público e extrair os contratos.**
   Leia os módulos exportados (e os testes existentes, se houver) e liste, para cada função pública: assinatura, tipos de entrada/saída, erros lançados e casos de borda relevantes. Não invente comportamento — o que você não conseguir confirmar lendo o código, confirme executando `node -e` antes de documentar.

2. **Escrever `API.md` com pelo menos um exemplo executável por função.**
   Cada função documentada ganha: assinatura, descrição de 1-3 linhas e um bloco ```js com exemplos no formato *entrada → saída*:
   ```
   funcao('entrada') // => resultado esperado
   ```
   Convenções que o doc-test entende:
   - `expressao // => valor` — o valor é comparado com `assert.deepStrictEqual`.
   - `expressao // => throws` — a expressão deve lançar erro.
   - Linhas sem `// =>` (imports, declarações) são executadas como código normal.
   Os imports nos exemplos devem funcionar a partir da raiz do projeto (caminhos relativos ao `API.md`).

3. **Criar o doc-test** em `tools/doctest.mjs` (se ainda não existir): um script sem dependências externas que extrai os blocos ```js do `API.md`, transforma cada linha `// =>` em um `assert` e executa tudo. Saída: contagem de exemplos ok/falha, com arquivo:linha de cada falha, e exit code 1 se qualquer exemplo mentir.

4. **Rodar e corrigir até passar.**
   Execute `node tools/doctest.mjs API.md`. Para cada falha, decida: o exemplo está errado (corrija a documentação) ou revelou um bug real (avise o usuário antes de tocar no código). Repita até o doc-test sair com exit 0. Nunca "corrija" enfraquecendo o exemplo — o exemplo deve continuar mostrando entrada e saída concretas.

5. **Plugar no `npm test`.**
   Acrescente o doc-test ao script `test` do `package.json` (ex.: `"test": "node --test && node tools/doctest.mjs API.md"`), rode `npm test` e confirme que a suíte inteira passa. A partir daqui, documentação e código não divergem sem quebrar o build.

## Critério de pronto

- `API.md` cobre todas as funções públicas pedidas, com ≥1 exemplo executável cada.
- `node tools/doctest.mjs API.md` sai com exit 0.
- `npm test` roda testes unitários **e** doc-test, e passa.
