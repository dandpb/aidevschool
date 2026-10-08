# Exemplo de SUCESSO — tp-d01 (EXEMPLO AUTORAL, NÃO resultado de aluno)

> **AVISO:** esta entrega foi ESCRITA PELO AUTOR DA PRÁTICA como exemplo
> calibrador de rubrica (nível suficiente), com execução real registrada pelo
> autor. Nunca foi produzida por um aprendiz real. Alvo: enunciado v1 ·
> rubrica v1.

## Entrega (exemplo bom) — nota de revisão

> **Julgamento contra a spec** (runs executados por mim, Python 3.13.5):
>
> | regra spec | entrada | esperado | obtido | veredito |
> |---|---|---|---|---|
> | tolerância 15 incluso (item 2) | `15` min | `0` | `500` | viola |
> | hora iniciada (item 3) | `61` min | `1000` | `500` | viola |
> | hora iniciada (item 3) | `90` min | `1000` | `500` | viola |
> | teto/bloco 24 h (item 4) | `1440` min | `5000` | `12000` | viola |
> | teto/bloco 24 h (item 4) | `1800` min | `10000` | `15000` | viola |
> | contrato de erro (item 1) | `-5` min | `ValueError` | retorna `0` | viola |
>
> Além disso a sugestão cobra "mínimo de 1 hora" (`max(1, …)`), regra que não
> está na spec — decisão além do contrato (aceitável só se justificada; não
> foi). A suíte sugerida está verde porque só testa caminho feliz (0/30/60/120
> min) — verde ilusório.
>
> **Meus testes** (`testes_tp_d01.py`): 14/15/16, 59/60/61/90, 1439/1440/1441,
> 1800, `-5`→ValueError, saída `int`. Run contra a sugestão original:
> `FAILED (failures=7)` (vermelho antes de corrigir). Run contra
> `tarifa_corrigida.py`: `Ran 14 tests — OK`.
>
> **Correção mínima** (`tarifa_corrigida.py`): `ValueError` se `< 0`;
> `<= TOLERANCIA_MIN`; `ceil(minutos/60)`; `min(valor, ceil(minutos/1440) ×
> teto)`; removi o `max(1, …)` por não estar na spec. Nada além.
>
> **Limites da cobertura:** não prova mudança de tarifa no meio da
> permanência (NÃO-META), nem consumidor que passe timestamps em vez de
> duração (premissa do contrato), nem tarifas/tetos ≤ 0 (contrato cala).
> Verde = "o que testei continua igual", não "nada mais pode dar errado".

## Marcação pela rubrica v1 (calibração)

| Critério | Veredito | Por quê |
|---|---|---|
| c1 | **suficiente** | cada violação com entrada→esperado(spec)→obtido(run próprio); regra inventada apontada |
| c2 | **suficiente** | run vermelho contra a sugestão original colado (7 failures) antes do fix |
| c3 | **suficiente** | diff mínimo; insumo intocado; suíte sugerida preservada |
| c4 | **suficiente** | 15 exato, 24 h exatas, 24 h+1 min, erro e mais fronteiras com assert de valor exato |
| c5 | **suficiente** | 3 limites reais vinculados ao contrato, sem claim de cobertura total |
| c6 | **suficiente** | todas as saídas são de execução própria; assistente não usado (ou seria citado) |

Nota de calibração: espelha a sequência de referência do
`guia-de-correcao/solucao.md` — corretores devem aceitar variações (outros
nomes de arquivo, ordem) enquanto as âncoras de evidência se mantêm.
