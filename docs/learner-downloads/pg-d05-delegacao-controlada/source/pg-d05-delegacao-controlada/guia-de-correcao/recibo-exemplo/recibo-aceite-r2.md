# Recibo de aceite da fatia 2 (r2) — exemplo de referência do controlador

> Modelo de recibo que passa em `python3 insumos/verifica_delegacao.py
> evidencia <recibo>`: cada validação com comando executado PELO
> CONTROLADOR, exit code e saída colada. V3 bate com o congelado.

## V1 — suíte existente verde (com testes.py intocado)

comando: `PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py`

exit: 0

saída:

```
ok test_categoria_desconhecida_sozinha
ok test_isbn_vazio_sozinha
ok test_recibo_com_renovacao
ok test_recibo_simples
ok test_renovacoes_invalidas_sozinha
ok test_trilha_registra_apenas_sucesso
6 testes passaram
```

sha256(`insumos/fixture/testes.py`) = `e1deddbf8e2f9834406d1d4d9da1f707bd06b3b8188c7dd79ca1a50819605432` (idêntico ao MANIFEST.md)

## V2 — teste novo da fatia verde

comando: `PYTHONPATH=insumos/fixture python3 insumos/fixture/teste_validacao.py`

exit: 0

saída:

```
ok test_pedido_valido_passa
ok test_prioridade_categoria_antes_de_isbn_vazio
ok test_validacao_categoria_desconhecida
ok test_validacao_renovacoes_fora_do_limite
4 testes passaram
```

## V3 — aceite congelado (comportamento real)

comando: `PYTHONPATH=insumos/fixture python3 -c "import biblioteca; ..."` (comando integral no PLANO-APROVADO.md §V3)

exit: 0

saída:

```
erro1: categoria desconhecida: rabisco
erro2: renovacoes invalidas: 3
EMPRESTIMO 978-85 reserva 14d
[('aberto', '978-85', 'reserva', 14)]
```

Igual linha a linha ao bloco `aceite-v3` do plano ⇒ C1/C2/C3 preservados.
