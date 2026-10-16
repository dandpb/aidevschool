# pg-d04 — Rúbrica de avaliação v1 (objetiva; mesma forma de pg-d01/pg-d02/pg-d03/tp-c01)

Veredito por critério: `met` | `partial` | `not_met` — sempre com evidência
(comando/saída/documento citado). Sem nota agregada: a prática é concluída
com os 7 critérios `met` ou `partial` justificado. A rúbrica avalia o
**pacote de contexto e o fechamento de PRD/SPEC**, não a implementação nem
elegância de escrita.

| # | Critério | Pergunta de verificação (perCheck executável) |
| --- | --- | --- |
| c1-contexto-duas-tabelas **(objetivo (a))** | CONTEXTO.md com duas tabelas (Incluído/Excluído), cada linha com justificativa própria | `python3 insumos/verifica_contexto_spec.py <dir>` nãoreporta nenhuma FALHA `contexto:`? Cada tabela tem ≥2 linhas e nenhuma justificativa genérica ("importante", "relevante") sem dizer **por que para esta tarefa**? |
| c2-contexto-resolve-sem-ruido **(objetivo (a))** | Todo caminho citado consta do `insumos/inventario-repo.txt`; zero categorias de exclusão do checklist M4 §4.2 na tabela Incluído; nenhum indispensável omitido | O verificadorreporta `falhas: 0` nas famílias `fora do inventário`/`ruído incluído`? O revisor confere contra o inventário: o núcleo da mudança, o modelo de dados, o contrato visível e a suíte existente estão todos na tabela Incluído? A view gerada (`relatorios/plano.view.md`) está na Excluído com o porquê (M4 §4.4)? |
| c3-limite-30min **(objetivo (b))** | PRD declara o limite de tarefa ≤30 min e o Escopo cabe nele (uma entrega coerente, não cinco) | O PRD contém linha com `30 min` (verificador: família `limite`)? O Escopo nomeia **uma** entrega (ordenação por dependência + total do dia) sem arrastar renames/cores/Windows? |
| c4-fora-de-escopo-real **(objetivo (b))** | Fora de escopo corta ≥2 extras embutidos do PEDIDO, com motivo | O revisor cruza a lista de 5 entregas do `PEDIDO.md` com o Fora de escopo: ≥2 nomeadas (ex.: renomear `docs/`, relatório colorido, Windows)? O motivo de cada corte aparece (M5 §5.1: campo mais subestimado)? |
| c5-aceite-verificavel **(objetivo (c))** | Cada critério de aceite é um teste em linguagem humana; ≥3 critérios; ≥1 cita comando executável offline com resultado esperado | O verificadorreporta `falhas: 0` nas famílias `aceite` (contagem, vagueza <4 palavras, comando)? Nenhum critério é "não quebrar nada"/"ficar bonito" sem definição? O revisor consegue imaginar o teste de cada um (M5 §5.3)? |
| c6-spec-fecha-decisoes **(objetivo (c))** | SPEC com interface exata, ≥3 bordas numeradas decidindo B1/B2/B3, allowlist de arquivos permitidos, não-metas e estratégia de teste — sem decisão importante aberta | Verificador: famílias `spec:` e `bordas` com `falhas: 0`? O revisor lê a SPEC respondendo só com ela: o que acontece em ciclo (B1), dependência inexistente (B2), lista vazia (B3)? Em **quais arquivos** o implementador pode mexer (allowlist) e o que é proibido (não-metas) — a solução que extrapola SPEC fica sem espaço? |
| c7-recibo-honesto | Recibo da prática com contagens do pedido, classificação do inventário e saída do verificador arquivada; sem alegação de eficácia | O recibo traz as contagens (5 entregas embutidas; decisões implícitas), a saída real do verificador e o takeaway? Nenhuma frase afirma eficácia, transferência comprovada ou resultado de alunos? |

## Notas de aplicação

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a prática **inconclusa** (ver enunciado §Retry).
- O verificador é **piso mecânico** das c1/c2/c3/c5/c6: passar nele não
  basta para `met` — o revisor responde a pergunta de substância de cada
  critério. Falhar nele já é `not_met` no critério correspondente.
- Alternativas fundamentadas que cumprem o objetivo observável são aceitas
  (ex.: tabela única com coluna "entra/sai", SPEC com bordas além de B1–B3,
  PRD com seções extras) — desde que as decisões B1/B2/B3, o limite de
  30 min, o allowlist e o aceite executável estejam explicitamente fechados.
- A rúbrica não mede tempo nem estilo de escrita; duração é guia de cadência.
- Evidência textual (documento + saída colada no recibo) basta; não exige
  captura de imagem.
- Referência completa (documentos-modelo, contraexemplos rejeitados e saídas
  reais): `guia-de-correcao/` — **após** a tentativa.
- v1 — revisões futuras versionam este arquivo (v2, v3) sem editar a v1,
  mesmo padrão de `curriculum/praticas-transferencia/`, pg-d01, pg-d02 e
  pg-d03.
