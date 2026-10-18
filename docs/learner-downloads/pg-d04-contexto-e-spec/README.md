# Kit offline — pg-d04: contexto e SPEC (U09)

Prática guiada da unidade **U09** (contexto e PRD/SPEC de tarefa pequena),
empacotada para uso **100% offline**: você baixa este diretório (ou só o
ZIP), extrai em uma pasta limpa e trabalha sem acesso ao repositório da
escola. Nenhum runtime, catálogo, schema, progresso ou mastery está
envolvido — o kit não emite nota nem acompanha você.

## Pré-requisito

- **U03 / pg-d02** (prática guiada anterior) **ou equivalente**: saber ler a
  estrutura de um repositório pequeno e executar um script Python com
  `python3` no terminal.

## Conteúdo (6 arquivos learner)

| Caminho | Papel |
| --- | --- |
| `enunciado.md` | ciclo guiado: objetivo observável, bordas B1–B3, tentativa, feedback, retry, takeaway |
| `exemplo-trabalhado.md` | fontes reais citadas + saídas reais executadas |
| `insumos/PEDIDO.md` | fixture fictícia: e-mail-vago com 5 entregas embutidas |
| `insumos/inventario-repo.txt` | fixture fictícia: inventário neutro do repo `rodadia` |
| `insumos/verifica_contexto_spec.py` | verificador mecânico offline do piso de formato |
| `rubrica-v1.md` | 7 critérios objetivos com perChecks |

## Como começar

1. Extraia `zips/pg-d04-contexto-e-spec.zip` em uma **pasta limpa**.
2. Leia `enunciado.md` e siga a ordem dos passos.
3. Use `insumos/PEDIDO.md` e `insumos/inventario-repo.txt` como matéria-prima
   da seleção de contexto (incluir/excluir é parte do exercício; os cortes de
   30 min do PRD e as decisões de SPEC fazem parte do ciclo).
4. Produza **`CONTEXTO.md`**, **`PRD.md`** e **`SPEC.md`** na sua pasta de
   trabalho — apenas esses 3 arquivos são exigidos e avaliados.
5. Rode `python3 insumos/verifica_contexto_spec.py` para checar o **piso de
   formato**. O verificador não julga qualidade substantiva nem implementação
   de código — a avaliação de qualidade segue a `rubrica-v1.md`.
6. Consulte `exemplo-trabalhado.md` depois da sua primeira tentativa (o
   enunciado indica o momento certo do feedback).

## Integridade

- `manifests/SHA256SUMS.txt`: hash e tamanho byte a byte de cada arquivo do
  payload learner e do ZIP.
- `manifests/pins.json`: pin da fonte imutável (PR #643 @
  `32888d9f03006f3dbcdaa57811b29c54a2c09146`), allowlist exata e política do
  ZIP.
- Rebuild determinístico: `python3 tools/build-kit.py` reconstroi o ZIP com
  os mesmos bytes (entradas ordenadas, timestamp fixo, deflate nível 9).

## Limites declarados

- Dados 100% sintéticos (repo `rodadia` fictício); nenhuma eficácia real de
  modelo/prompt é alegada.
- Conteúdo docente (`guia-de-correcao/**`, incluindo solução e
  contraexemplos) **não faz parte** deste kit.
- O kit não controla quando você abre cada arquivo: disciplina declarada,
  não barreira segura.
