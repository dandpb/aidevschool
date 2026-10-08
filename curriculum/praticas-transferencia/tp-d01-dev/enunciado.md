# TP-D01 (dev) — A sugestão que passaria no review: tarifa do estacionamento

> Prática de transferência inédita · público **dev** · evidência-alvo **T3**
> (problema novo, execução real sua, verificável por terceiro).
> Competências (glossário `intent/AID-3453-unify-school/spec.md:7-21`
> @579ce995): **P D4** teste/debug/review · **S D3** construção.
> Versão do enunciado: v1 (2026-09-30). Solução e gabarito ficam FORA deste
> enunciado, em `../guia-de-correcao/`.

## Objetivo observável

Dado um **contrato (spec) escrito** e uma **sugestão de implementação de IA**
que vem com testes verdes, você (1) julga a sugestão contra a spec produzindo
evidência `entrada → esperado pela spec → obtido`, (2) escreve testes que
**falham na sugestão** ANTES de corrigir (vermelho), (3) aplica a correção
**mínima**, (4) cobre os casos-limite do contrato e (5) declara em texto o que
a sua suíte **não prova** — executando tudo na sua máquina, sem delegar a
execução ao assistente.

## Cenário

O time de backoffice do estacionamento parceiro definiu o contrato de cálculo
de tarifa (`fixture/spec.md`, formato de 5 campos) e um dev do time pediu a
implementação a um assistente de IA, anexando a spec. A resposta chegou como
`fixture/tarifa_sugerida.py` **junto com testes** (`fixture/testes_sugeridos.py`)
— e os testes estão **verdes**. O PR foi aberto. Você é o revisor.

Você não sabe quantos defeitos há (pode não haver nenhum). Sua função é julgar
contra a spec — não contra o estilo do código, e não contra a sua memória de
"como costuma ser".

## Insumos

| Arquivo | O que é |
|---|---|
| `fixture/spec.md` | Contrato do time: CONTEXTO, OBJETIVO, RESTRIÇÕES, ACEITE, NÃO-META |
| `fixture/tarifa_sugerida.py` | A sugestão do assistente, tal como chegou (NÃO edite este arquivo) |
| `fixture/testes_sugeridos.py` | Os testes que vieram junto (NÃO edite este arquivo) |

Comandos para reproduzir o estado inicial (a partir de `fixture/`):

```
python3 -m unittest testes_sugeridos -v
```

Requisitos de execução: Python 3 da sua máquina (stdlib apenas). Sem rede,
sem API paga, sem conta, sem segredo — se algo pediu isso, você saiu da tarefa.

## Entrega esperada (no seu repositório de trabalho)

1. **Nota de revisão** (arquivo curto): cada regra da spec que a sugestão
   viola, ou nenhuma — com a prova `entrada → esperado (spec, regra citada) →
   obtido (comando executado por você)`. Inclua o que a sugestão DECIDIU que a
   spec não pedia, se houver.
2. **Seus testes** (arquivo próprio, ex.: `testes_tp_d01.py`): escritos
   ANTES da correção, falhando na sugestão original; cobrindo também os
   casos-limite do contrato (tolerância no minuto exato, hora iniciada na
   virada, teto no bloco exato e no minuto seguinte, contrato de erro).
   Guarde a saída do run **contra a sugestão** (vermelho) e **contra a sua
   correção** (verde).
3. **Correção mínima** (arquivo próprio, ex.: `tarifa_corrigida.py`):
   altere o mínimo para a spec; sem reescrever nomes, sem "melhorias" extras,
   sem mexer na suíte sugerida.
4. **Limites da cobertura** (seção da nota de revisão): pelo menos 2 exemplos
   que a sua suíte verde NÃO prova (a suíte verde diz "o que testei continua
   igual", não "nada mais pode dar errado").

Evidência válida = saídas de comandos QUE VOCÊ EXECUTOU (cole o output real).
Código gerado por assistente que você não executou não é evidência nesta
prática; se usar assistente em qualquer parte, cite o trecho e o porquê — a
execução e o julgamento continuam seus.

## Segunda tentativa

Se um critério da rubrica ficar `insuficiente`, você recebe o feedback por
critério e refaz apenas o insuficiente — mais um obstáculo novo: a spec ganha
UMA regra adicional (tarifa noturna) e você repete o ciclo julgar → vermelho →
correção mínima → limites só para ela.
