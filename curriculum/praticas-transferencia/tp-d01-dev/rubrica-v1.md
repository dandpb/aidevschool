# Rubrica TP-D01 (dev) — v1

> **versão: v1** · emitida em 2026-09-30 por CCE · escopo: nota de revisão +
> testes + correção + limites da prática tp-d01, enunciado v1.
> Regra de versionamento: qualquer mudança de critério, peso ou âncora de
> evidência gera v2 com changelog; correções tipográficas não. Toda aplicação
> declara a versão usada.
> Aplicador: revisor humano (ou corretor treinado). Esta prática NÃO gera
> `mastered`, score de progresso ou certificação; suíte verde não é promessa
> de comportamento total.

## Como aplicar

Cada critério recebe `suficiente` / `insuficiente` com a evidência anotada
(commit/patch + saída de comando citada). Aprovado na prática = 6/6
suficientes na primeira tentativa, ou na segunda com os insuficientes
recuperados + regra nova (tarifa noturna) completa.

## Critérios separáveis

### c1 — Julgamento contra a spec, com prova entrada→esperado→obtido (D4)

- **Suficiente:** cada violação apontada (ou a ausência dela) vem com
  `entrada · valor esperado pela regra da spec (regra citada) · valor obtido
  em comando executado`. Decisões que a sugestão tomou além da spec são
  apontadas como tal (não como "erro de estilo").
- **Insuficiente:** acusação sem reprodução ("o teto está errado" sem comando
  e sem números), ou julgamento por estilo/opinião fora da spec.

### c2 — Teste vermelho ANTES da correção (D4)

- **Suficiente:** existe run dos testes do aluno contra a sugestão original
  mostrando `FAIL` antes de qualquer fix; os testes codificam a SPEC (não o
  comportamento da sugestão).
- **Insuficiente:** testes escritos depois/sobre a versão corrigida apenas,
  ou vermelho que não aparece em saída executada, ou teste que aceita o
  comportamento errado para passar.

### c3 — Correção mínima e sem "melhorias" não pedidas (D4/D3)

- **Suficiente:** o diff toca somente o necessário para a spec; nomes,
  estrutura e a suíte sugerida permanecem; qualquer mudança além vem
  justificada contra uma regra.
- **Insuficiente:** reescrita da função, renomeações cosméticas, exclusão de
  regra "para simplificar" (ex.: remover o teto), ou edição dos arquivos
  insumo (`tarifa_sugerida.py`/`testes_sugeridos.py`).

### c4 — Casos-limite do contrato cobertos nos testes (D4)

- **Suficiente:** testes para ≥ 4 dos limites nomeados, incluindo
  **exatamente 15 min** (tolerância inclusiva) e **exatamente o teto** (24 h
  exatas) e **o minuto seguinte do teto** (24 h + 1 min), e o contrato de
  erro (minuto negativo → `ValueError`).
- **Insuficiente:** só caminhos felizes (1 h, 2 h), ou limites testados sem
  assert do valor exato da spec.

### c5 — Limites da cobertura declarados (D4)

- **Suficiente:** ≥ 2 limites reais do que a suíte não prova (ex.: mudança de
  tarifa no meio da permanência, períodos > 48 h com blocos múltiplos,
  comportamento com entradas não-inteiras se o contrato calar), sem tratar o
  verde como prova absoluta.
- **Insuficiente:** "os testes cobrem tudo", limites genéricos sem vínculo
  com o contrato, ou nenhum limite declarado.

### c6 — Evidência de execução própria / uso disciplinado de assistente (D3)

- **Suficiente:** saídas coladas são de comandos executados pelo aluno; se
  usou assistente em qualquer parte, cita o trecho gerado e o que fez para
  verificá-lo; a nota de revisão é do aluno.
- **Insuficiente:** saída "esperada"/inventada sem run, código de assistente
  apresentado como execução própria, ou assert de terceiro sem verificação.

## Erros plausíveis (para o corretor esperar — não exaustivos)

- Corrigir direto "por leitura" e nunca mostrar o vermelho.
- Testar depois do fix e achar que o verde retrospectivo prova o bug.
- Tratar `max(1, ...)` como "detalhe de estilo" sem notar que não está na spec.
- Cobar o minuto 15 como cortesia apenas via o caso 14 min.
- Declarar cobertura total porque "são só contas".
- Editar `tarifa_sugerida.py` no lugar (insumo) em vez de corrigir em arquivo
  próprio.

## Feedback explicativo (modelo por critério — segunda tentativa)

- c1: "Sua acusação não tem reprodução: rode um comando com a entrada exata e
  cole esperado-da-spec vs obtido — sem isso o revisor não consegue aceitar."
- c2: "Mostre o run vermelho contra a sugestão original: o teste precisa
  falhar em 15 min exatos / 61 min / 24 h para valer como prova."
- c3: "Seu diff renomeou e reorganizou além do fix — volte ao mínimo que a
  spec exige e justifique qualquer linha extra regra por regra."
- c4: "Faltam os limites do contrato: minuto 15 exato, 24 h exatas e 24 h + 1
  min são três asserts de valor exato."
- c5: "O verde da suíte diz 'o que testei continua igual' — nomeie dois
  cenários do NÃO-META da spec que ela não prova."
- c6: "Cole a saída do SEU terminal (comando + resultado); gerar saída é
  diferente de executar."

## Controles negativos (autocheque do corretor)

- Entrega com patch correto mas sem run vermelho → c2 insuficiente; aprovação
  bloqueada mesmo com o código certo (critérios separáveis).
- Entrega onde `tarifa_sugerida.py` foi editado → c3 insuficiente (insumo
  adulterado invalida a prova de vermelho).
- Suíte verde + "cobertura completa" declarada → c5 insuficiente.
