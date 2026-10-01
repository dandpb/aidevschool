# pg-d03 — Rúbrica de avaliação v1 (objetiva; mesma forma de pg-d01/pg-d02/tp-c01)

Veredito por critério: `met` | `partial` | `not_met` — sempre com evidência
(comando/saída/diff citado). Sem nota agregada: a prática é concluída com
os 7 critérios `met` ou `partial` justificado. A rúbrica avalia o
**processo de refatoração com rede de segurança**, não a elegância do
código final.

| # | Critério | Pergunta de verificação (perCheck executável) |
| --- | --- | --- |
| c1-baseline-verde | Suíte existente registrada verde **antes** de qualquer edição (pré-condição do wf 03, regra 1) | O registro (recibo) mostra a execução de `PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py` com `6 testes passaram` anterior a qualquer diff? |
| c2-caracterizacao-antes **(objetivo (a))** | Teste de caracterização em arquivo NOVO cobrindo ≥1 observável do CONTRATO.md que a suíte não cobre, **verde sobre o original**, escrito antes de aplicar a proposta | O revisor roda o teste do aluno contra `insumos/fixture`: termina verde? O teste exerce um caso que `testes.py` não cobre (ex.: dois erros no mesmo pedido; trilha `AUDITORIA` após rejeição)? Cita a cláusula (C1–C5)? |
| c3-armadilha-executada **(objetivo (b))** | A proposta do assistente foi julgada com evidência: suíte existente VERDE **e** caracterização VERMELHA sob a proposta, com as duas saídas registradas | O revisor aplica a proposta (cópia de `insumos/proposta-refatoracao.md`) e reproduz: `PYTHONPATH=<copia> python3 insumos/fixture/testes.py` → `6 testes passaram`; `PYTHONPATH=<copia> python3 <teste-do-aluno>` → falha citando o observável (ordem de erro C2 e/ou trilha C3)? Sem as duas saídas, `not_met` |
| c4-veredito-fundamentado | Decisão sobre a proposta cita a(s) cláusula(s) do contrato violada(s) e a ação tomada (rejeitar/retrabalhar), não gosto | O texto do aluno nomeia C2/C3 (ou o observável equivalente por extenso) e define o próximo passo? "Ficou melhor/parei" sem cláusula ⇒ `not_met` |
| c5-passos-pequenos **(objetivo (c))** | ≥2 passos nomeados, suíte + caracterização após CADA passo, com registro; vermelho ⇒ passo revertido (não consertado pra frente) | O recibo mostra, por passo, nome + saída da suíte E da caracterização? Algum passo vermelho aparece seguido de reversão (não de ajuste no teste)? |
| c6-testes-existentes-intocados | Nenhum teste existente editado; caracterização só em arquivo novo (wf 03, regra 4) | `git diff -- insumos/fixture/testes.py` (ou equivalente do recibo) vazio? `testes.py` byte-idêntico ao entregue? |
| c7-comportamento-preservado | Resultado final: suíte E caracterização verdes no código final; diff confinado ao objetivo do pedido; smoke observável idêntico | Revisor roda no código final do aluno: `6 testes passaram` + caracterização verde; `diff` entre original e final toca apenas o que o pedido pedia (validação extraída, loops deduplicados, formatação fora do `fechar_pedido`); `python3 -c "…fechar_pedido([('cafe',2)])"` → `R$ 24,00` |

## Notas de aplicação

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a prática **inconclusa** (ver enunciado §Retry).
- A rúbrica não mede tempo nem estilo de código; duração é guia de cadência.
- Evidência textual (comando + saída colada no recibo) basta; não exige
  captura de imagem.
- Referência completa (caracterização, armadilha aplicada, solução em
  passos e saídas reais): `guia-de-correcao/` — **após** a tentativa.
- v1 — revisões futuras versionam este arquivo (v2, v3) sem editar a v1,
  mesmo padrão de `curriculum/praticas-transferencia/`, pg-d01 e pg-d02.
