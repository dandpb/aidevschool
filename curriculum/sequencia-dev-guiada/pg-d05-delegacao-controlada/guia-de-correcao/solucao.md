# pg-d05 — Guia de correção (consulte APÓS a tentativa)

Este guia é **separado** do enunciado de propósito: nada no caminho do
aluno o referencia. Contém as saídas reais de todas as verificações,
executadas first-hand na árvore desta entrega (worktree
`/paperclip/tmp/opencode/wt-aid3647`, base `e01d9d42`, offline, Python
3.13 + git local; os patches r1/r2 foram gerados com `git diff` real a
partir da fixture entregue). Nenhum resultado de aluno é relatado ou
presumido aqui.

## 0. Preparação (c1)

Allowlist E1: `insumos/fixture/biblioteca.py`,
`insumos/fixture/teste_validacao.py`. Proibições: E2.1 `testes.py`,
E2.2 arquivos fora da allowlist, E2.3 mudança de mensagens/prioridade,
E2.4 dependências/rede. Validações: V1 suíte (sha256 de `testes.py` =
`e1deddbf…`), V2 teste novo, V3 aceite congelado (bloco `aceite-v3`).

## 1. Escopo (c2) — saídas reais

```
$ python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r1/diff-r1.patch
ok escopo insumos/fixture/biblioteca.py (+11 -5)
FALHA proibido: insumos/fixture/testes.py (suíte existente é contrato)
FALHA fora da allowlist: insumos/fixture/util_texto.py
FALHA 3 arquivos no diff (máx 2)
escopo: REPROVADO
exit=1

$ python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r2/diff-r2.patch
ok escopo insumos/fixture/biblioteca.py (+5 -1)
ok escopo insumos/fixture/teste_validacao.py (+43 -0)
escopo: APROVADO
exit=0
```

## 2. Alegação → evidência própria na r1 (c3) — saídas reais

Aplicação em árvore limpa (`git apply insumos/delegacao-r1/diff-r1.patch`
a partir do diretório do pacote; restaurar depois com
`git checkout -- insumos/fixture` + remover `util_texto.py`):

```
$ PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
ok test_categoria_desconhecida_sozinha
ok test_isbn_vazio_sozinho
ok test_recibo_com_renovacao
ok test_recibo_simples
ok test_renovacoes_invalidas_sozinha
ok test_trilha_registra_apenas_sucesso
6 testes passaram
exit=0                          # ← a alegação do produtor REPRODUZ: a suíte roda verde

$ sha256sum insumos/fixture/testes.py
41c0669da40070ad75461d4e1643ad3ca5e23fc96cedcb593ee84ba31b9d56cf  insumos/fixture/testes.py
                                # ≠ e1deddbf… (MANIFEST) → o verde é manufaturado:
                                # o produtor editou as 3 asserções de mensagem de erro

$ PYTHONPATH=insumos/fixture python3 -c "…V3 do plano…"
erro1: categoria invalida: rabisco        # ≠ "categoria desconhecida: rabisco" (C2)
erro2: renovacoes fora do limite: 3       # ≠ "renovacoes invalidas: 3" (C2)
EMPRESTIMO 978-85 reserva 14d
[('aberto', '978-85', 'reserva', 14)]
exit=0                          # ← saída DIVERGE do aceite congelado (bloco aceite-v3)
```

Leitura: a alegação era verdadeira **e irrelevante** — o "verde" existe
porque o teste que denunciaria a troca de mensagens foi reescrito no
mesmo diff; e a alegação omitiu exatamente a validação que provaria o
comportamento (V3). Veredito de referência completo em `veredito-r1.md`.

## 3. Aceite da r2 (c5) — saídas reais

```
$ escopo r2 → APROVADO (exit 0)                    # §1 acima
$ PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
6 testes passaram
exit=0
$ sha256sum insumos/fixture/testes.py
e1deddbf8e2f9834406d1d4d9da1f707bd06b3b8188c7dd79ca1a50819605432  insumos/fixture/testes.py
                                # = MANIFEST → suíte intocada
$ PYTHONPATH=insumos/fixture python3 insumos/fixture/teste_validacao.py
ok test_pedido_valido_passa
ok test_prioridade_categoria_antes_de_isbn_vazio
ok test_validacao_categoria_desconhecida
ok test_validacao_renovacoes_fora_do_limite
4 testes passaram
exit=0
$ V3 → erro1: categoria desconhecida: rabisco / erro2: renovacoes invalidas: 3 /
       EMPRESTIMO 978-85 reserva 14d / [('aberto', '978-85', 'reserva', 14)]
exit=0                          # ← IGUAL linha a linha ao bloco aceite-v3
```

Recibo de referência que passa no verificador:
`recibo-exemplo/recibo-aceite-r2.md` →
`python3 insumos/verifica_delegacao.py evidencia …` = `evidencia:
APROVADO` (exit 0).

## 4. Skill de referência (c6) — esqueleto esperado do aluno

`skill-verificar-delegacao.md` com: **Quando usar** (receber entrega
delegada/PR de produtor); **Procedimento** (1. contrato e allowlist
antes do diff; 2. escopo por política fail-closed; 3. re-executar V1/V2/
V3 com sha256 dos testes; 4. veredito por cláusula + retrabalho; 5.
aceitar só com recibo próprio); **Armadilha já paga** (suíte verde
manufaturada por teste editado + alegação sem aceite congelado). A
checagem dupla esperada: `escopo` r1 → REPROVADO e `escopo` r2 →
APROVADO (visto falhando e passando — wf 11, passo 5).

## 5. Prova congelada p/ V&E (selftest) — saída real

```
$ python3 insumos/verifica_delegacao.py selftest
ok selftest escopo r1 (deve REPROVAR) (exit=1)
ok selftest escopo r2 (deve APROVAR) (exit=0)
ok selftest evidencia recibo-falso (deve REPROVAR — negativo) (exit=1)
ok selftest evidencia recibo-exemplo (deve APROVAR) (exit=0)
selftest: APROVADO (4 sondas)
exit=0
```

O `recibo-falso` (`exemplos/recibo-falso.md`) aceita a r1 citando a
saída do produtor — o verificador reprova com 11 FALHAs (seções sem
comando/exit, V3 divergindo, "produtor ≠ verificador"): é o negativo
que rejeita falsa comprovação.

## 6. Erros plausíveis do aluno (para quem corrige)

- Aceitar a r1 pela suíte verde colada (falha c3/c5): aplicar a r1 e
  mostrar o sha256 e a V3 divergente costuma resolver a convicção.
- Rejeitar a r1 "por instinto" sem política (falha c2): pedir para rodar
  o `escopo` e citar as violações impressas.
- Rejeitar e **não dizer o retrabalho** (falha c4): o veredito sem
  retrabalho não ensina o produtor — comparar com `veredito-r1.md`.
- Validar a checagem só no sentido que passa (falha c6): rodar `escopo`
  com r1 até ver REPROVADO.
- Esquecer de restaurar a fixture após aplicar patches (falha c7):
  sha256s do MANIFEST não batem — `git checkout -- insumos/fixture` e
  remover arquivos novos.
