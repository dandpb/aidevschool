# Exemplo de FALHA — tp-d01 (EXEMPLO AUTORAL, NÃO resultado de aluno)

> **AVISO:** esta entrega foi ESCRITA PELO AUTOR DA PRÁTICA como exemplo
> calibrador de rubrica (nível insuficiente). Nunca foi produzida por um
> aprendiz real; não é evidência de desempenho de ninguém. Alvo: enunciado v1
> · rubrica v1.

## Entrega (exemplo ruim)

> Achei o bug: as horas tavam truncadas. Corrigi o `tarifa_sugerida.py`
> direto (mudei `//` por ceil e aproveitei pra renomear as variáveis pra
> inglês e tirar aquele teto que complicava — ninguém usa). Testes: pedi pro
> assistente gerar 10 casos e ele disse que passam todos. Agora tá 100%
> coberto, pode mergear.

*(patch anexado: reescrita completa do arquivo, suíte sugerida deletada)*

## Marcação pela rubrica v1 (calibração)

| Critério | Veredito | Por quê |
|---|---|---|
| c1 julgamento com prova | **insuficiente** | acusou truncação sem `entrada→esperado→obtido`; não viu tolerância 15 min, teto, nem contrato de erro; citou "assistente disse que passa" |
| c2 vermelho antes | **insuficiente** | nenhum run vermelho próprio; correção veio antes de qualquer teste |
| c3 correção mínima | **insuficiente** | editou o insumo `tarifa_sugerida.py`, renomeou por gosto e REMOVEU o teto (regra da spec) "para simplificar" |
| c4 casos-limite | **insuficiente** | nenhum limite do contrato testado (15 exato, 24 h exatas, 24 h+1 min, erro) |
| c5 limites da cobertura | **insuficiente** | declarou cobertura 100% — o oposto do critério |
| c6 execução própria | **insuficiente** | nenhum comando executado/colado; evidência de terceiro aceita sem verificação |

Nota de calibração: o patch até "funciona" para 61 min — e ainda assim a
entrega falha em 6/6, porque a prática mede a DISCIPLINA de
julgar→provar→corrigir→limitar, não só o artefato final.
