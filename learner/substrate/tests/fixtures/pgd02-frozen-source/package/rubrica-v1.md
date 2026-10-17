# pg-d02 — Rúbrica de avaliação v1 (objetiva; mesma forma de tp-c01/tp-d01/pg-d01)

Veredito por critério: `met` | `partial` | `not_met` — sempre com evidência
(comando/saída/citação de campo e linha do pedido). Sem nota agregada: a
prática é concluída com os 7 critérios `met` ou `partial` justificado.
A rúbrica avalia o **pedido escrito**, não a implementação nem a elegância.

| # | Critério | Pergunta de verificação (perCheck executável) |
| --- | --- | --- |
| c1-cinco-campos | Pedido reescrito contém os 5 campos rotulados, cada um não-vazio e conciso (≤6 linhas/campo, ≤30 linhas no arquivo) | `python3 insumos/verifica_pedido.py pedido.md` termina `veredito: met`, exit 0? |
| c2-contexto-por-caminho | CONTEXTO referencia arquivos por caminho (não por descrição) e os caminhos existem na árvore | `python3 insumos/verifica_pedido.py --caminhos pedido.md` lista `ok caminho …` para cada citação, sem `FALHA`? |
| c3-objetivo-unico | OBJETIVO declara UM resultado observável (passa no teste "e aproveita?" — M3 regra 1 de conduta) | Cada linha do OBJETIVO descreve a mesma entrega? Se o revisor acha duas entregas (ex.: filtrar E redesenhar breaking), `not_met` |
| c4-aceite-executavel **(objetivo (a))** | ACEITE contém comando executável local, offline, com saída esperada declarada — e hoje, sem a mudança, falha/incompleta pelo motivo certo | O revisor executa cada comando do ACEITE nesta árvore (ex.: `python3 release_notes.py … --types feat,fix`): roda offline? a saída esperada é checável (ex.: `grep -c '^## '`)? algum comando ainda não passa hoje? |
| c5-resticoes-do-contrato | RESTRIÇÕES cita ≥2 restrições reais do contrato existente (PRD.md/SPEC.md), por referência | `grep -n "stdlib\|silenciosamente\|determin" docs/curso-simples/workflow-exemplo/PRD.md docs/curso-simples/workflow-exemplo/SPEC.md` retorna as regras citadas no pedido? Restrição inventada que contradiz o PRD ⇒ `not_met` |
| c6-nao-meta-explicita **(objetivo (b))** | NÃO-META exclui ≥1 escopo adjacente que está de fato no pedido original (não espantalho) | `grep -n "<escopo excluído>" insumos/pedido-original.md` casa (ex.: Slack, esconder fora-do-padrão, destaque de breaking)? A exclusão é acionável (encadear depois), não vaga? |
| c7-casos-borda-decidiveis **(objetivo (c))** | O pedido sozinho decide B1 e B2: revisor independente emite `dentro`/`fora` por caso citando campo+linha | Revisor lê apenas o pedido e escreve o veredito de B1 e B2. Se precisar perguntar ao autor (ou os dois tirarem vereditos diferentes do mesmo texto), `not_met` |

## Notas de aplicação

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a prática **inconclusa** (ver enunciado §Retry).
- A rúbrica não mede tempo, estilo nem qualidade da implementação (a
  prática não exige implementar); duração é guia de cadência.
- Evidência textual basta; não exige captura de imagem.
- Vereditos de referência para B1/B2 e erros plausíveis: ver
  `guia-de-correcao/` (após a tentativa).
- v1 — revisões futuras versionam este arquivo (v2, v3) sem editar a v1,
  mesmo padrão de `curriculum/praticas-transferencia/` e pg-d01.
