# pg-d05 — Allowlist explícita (mundo fechado da prática)

O que a prática pode usar/tocar — tudo fora daqui é proibido por
padrão (fail-closed, mesma semântica do ciclo 07 do workflow_lab).

## Caminhos que o ALUNO pode criar/editar no SEU espaço de trabalho

| Caminho | Papel |
| --- | --- |
| `recibo-pg05.md` (nome livre, no espaço do aluno) | recibo do controlador: preparação, r1 (escopo, V1, sha256, V3, veredito, retrabalho), r2 (escopo, V1, V2, V3, aceite) |
| `skill-verificar-delegacao.md` (espaço do aluno) | skill extraída da sessão (c6) |
| cópia descartável da fixture (ex.: `/tmp/…`) | para aplicar `diff-r1.patch`/`diff-r2.patch` sem sujar o pacote |

## Comandos permitidos (todos offline, Python 3 stdlib + git local)

```
python3 insumos/fixture/testes.py                       # V1 (com PYTHONPATH=insumos/fixture)
python3 insumos/fixture/teste_validacao.py              # V2 (com PYTHONPATH=insumos/fixture)
python3 -c "…"                                          # V3 — comando integral no PLANO-APROVADO.md
python3 insumos/verifica_delegacao.py escopo <patch>
python3 insumos/verifica_delegacao.py evidencia <recibo>
python3 insumos/verifica_delegacao.py selftest          # revisor/V&E
git apply <patch> · git checkout -- insumos/fixture · git clean -fd insumos/fixture
sha256sum insumos/fixture/testes.py
```

## Proibições (para o aluno e para o produtor simulado)

1. Editar qualquer arquivo do pacote (fixture, patches, plano, contrato,
   verificador, rúbrica, guia) — o pacote é somente-leitura.
2. Rede, contas, chaves, segredos, dependências novas, LLM pago: nada
   aqui precisa disso (o "produtor" é um insumo de papel).
3. Consultar `guia-de-correcao/` antes de emitir os próprios vereditos.
4. Marcar progresso/mastery: esta prática não toca `learner/`, gates,
   catálogo, bindings, lessonIDs ou defaults de nenhum sistema.
