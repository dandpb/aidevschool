---
name: workflow-lab-build
description: Adicione ou altere um ciclo do Workflow Lab com fixture, handler, contrato e teste focado, preservando o grafo cumulativo de requires.
---

# Construir ciclos do Workflow Lab

Use esta skill somente para evoluir o executor local em
`docs/curso/workflow_lab/`: um novo ou alterado ciclo deve entregar o contrato,
a fixture, o handler e o teste focado em uma mudança red-green-refactor.

## Limites

- Leia primeiro [`SPEC.md`](../../../docs/curso/workflow_lab/SPEC.md) e o
  [`README.md`](../../../docs/curso/workflow_lab/README.md).
- Preserve o envelope público e `requires`: uma lição só pode ser exigida por
  um ciclo posterior, e o conjunto canônico deve continuar tendo um consumidor
  para cada lição de `cycle-00` a `cycle-09`.
- Mantenha transformação determinística: sem rede, relógio implícito, arquivos
  reais ou estado em `learner/`.
- Não altere o HTML, `evidence/`, o relatório final ou emita o veredito
  independente; a validação de integração pertence a outro contexto.

## Ciclo de trabalho

1. Escolha o `cycle-NN` alvo; se for novo, confirme que o ID ainda não existe.
   Escreva o comportamento e o gate observável no teste focado correspondente.
2. Adicione ou ajuste a fixture JSON em
   `docs/curso/workflow_lab/fixtures/`, mantendo `cycle_id`, `handler`,
   `requires`, `lesson_id`, `lesson_text` e `artifact_path` válidos.
3. Implemente o handler em `handlers/` e registre-o em `registry.py`; faça o
   teste vermelho cobrir sucesso e uma entrada inválida que falha antes da
   persistência.
4. Rode o teste focado, depois a suíte do laboratório. Refatore apenas após o
   comportamento verde, mantendo imports de pacote e a serialização estável.
5. Confirme que o ciclo usa somente `requires` declarados e que não introduziu
   uma dependência adiantada, duplicada ou cíclica. Registre os comandos e
   resultados no handoff, mas deixe a execução canônica e os artefatos de
   evidência para o mantenedor do workflow.

## Comandos

```sh
python3 -m pytest docs/curso/workflow_lab/test_<ciclo>.py -q
python3 -m pytest docs/curso/workflow_lab -q
```

O teste focado precisa afirmar o artefato determinístico e o gate principal do
handler. Não use `report.md` como evidência independente: ele é uma projeção
derivada do ledger. Falhas entre escritas de arquivos podem deixar saída
parcial; não prometa atomicidade transacional.
