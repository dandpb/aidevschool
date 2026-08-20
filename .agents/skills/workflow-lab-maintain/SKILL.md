---
name: workflow-lab-maintain
description: Sincronize contratos, evidências e documentação do Workflow Lab após um verify independente PASS, sem mascarar defeitos de runtime.
---

# Manter o Workflow Lab

Use esta skill somente depois de receber um `workflow-lab-verify` independente com
veredito `PASS`, comando executado e artefato de evidência. Ela mantém a coerência
entre o contrato do laboratório, sua apresentação e os ativos duráveis; não corrige
handlers nem substitui a verificação independente.

## Fontes e limites

Leia primeiro:

- [`SPEC.md`](../../../docs/curso/workflow_lab/SPEC.md), fonte do contrato e do grafo de `requires`;
- [`README.md`](../../../docs/curso/workflow_lab/README.md), superfície operacional;
- [`registry.py`](../../../docs/curso/workflow_lab/registry.py) e as fixtures em
  [`fixtures/`](../../../docs/curso/workflow_lab/fixtures/), fontes do comportamento executável;
- [`VALIDACAO.md`](../../../docs/curso/workflow_lab/VALIDACAO.md) e
  [`evidence/full-run-final/`](../../../docs/curso/workflow_lab/evidence/full-run-final/), resultados observados;
- [`index.html`](../../../docs/curso/index.html), página inicial do curso;
- [`README.md`](../../../docs/curso/README.md), [`WORKFLOW-PERMANENTE.md`](../../../WORKFLOW-PERMANENTE.md)
  e [`executar-workflows-cumulativos.md`](../../../docs/curso/workflow_lab/skills/executar-workflows-cumulativos.md),
  índice e instruções humanas;
- [`MANIFEST.md`](../../../engines/codexDojo/ecosystem/MANIFEST.md), mapa do ecossistema.

Não mude código de execução, testes ou fixtures para fazer a documentação passar.
Se o verify falhar por handler, contrato, import, persistência ou outro defeito de
runtime, pare e encaminhe para [`workflow-lab-build`](../workflow-lab-build/SKILL.md).

Atualizações nos arquivos do produto só são autorizadas quando o pedido atual disser
para manter, atualizar ou sincronizar o workflow. Sem esse pedido, produza apenas um
relatório de drift. Nunca invente adoção, satisfação ou aprendizado humano.

## Procedimento de sincronização

1. Registre a evidência do verify: SHA/estado revisado, comando, saída e caminho do
   artefato. Se qualquer um faltar, não considere o pré-requisito atendido.
2. Extraia a matriz canônica dos `cycle_id`, handlers, `lesson_id`, `requires` e
   `artifact_path` das fixtures e compare-a com `SPEC.md` e `registry.py`. Confirme
   também que cada lição de `cycle-00` a `cycle-09` tem consumidor posterior.
3. Compare o ledger e os artefatos duráveis com a matriz: ciclos, ordem, hashes,
   caminhos, status e rótulo de `report.md`. Se a evidência estiver velha, execute o
   CLI em uma saída nova e compare os bytes; só promova a saída para `evidence/` com
   autorização explícita.
4. Compare os números, nomes, exemplos, links e resultados publicados em
   `VALIDACAO.md`, `README.md`, `WORKFLOW-PERMANENTE.md` e `index.html`. A página pode
   explicar o porquê e o valor de cada workflow, mas só pode afirmar resultados
   presentes no ledger, nos artefatos ou no verify.
5. Confira que o índice humano aponta para as três skills canônicas e que o
   `MANIFEST.md` continua mapeando os arquivos realmente existentes. Valide cada
   pasta com o `quick_validate.py` do Skill Creator disponível no harness. Corrija
   links quebrados e referências desatualizadas apenas dentro do pedido de
   manutenção.
6. Registre o que foi comparado, cada mudança e cada limite. Depois das edições,
   peça um novo `workflow-lab-verify` independente; não transforme a própria
   sincronização em prova de funcionamento.

## Regras de evidência

- `SPEC.md`, fixtures e registry são fontes de contrato; `learning.ndjson` é o
  registro durável; artefatos são resultados executáveis; `report.md` é projeção
  derivada e não evidência independente.
- Uma falha de preflight ou handler deve ocorrer antes das escritas previstas. As
  trocas de arquivo são atômicas por arquivo, mas uma falha de sistema operacional
  entre arquivos pode deixar saída parcial; não prometa transação global.
- O laboratório é local, determinístico, sem rede, sem segredos reais e sem mutar
  `learner/`. Não promova uma fixture sintética ou um hash como prova de produção.
- A saída canônica é a execução completa das 11 fixtures. Modo parcial só é válido
  quando o ledger já contém os requisitos anteriores e não deve ser confundido com
  a prova canônica.

## Comandos de conferência

Na raiz do repositório, adapte a saída para um diretório temporário novo:

```sh
python3 -m pytest docs/curso/workflow_lab -q
python3 docs/curso/workflow_lab/lab.py \
  --fixtures docs/curso/workflow_lab/fixtures \
  --output "$(mktemp -d)/workflow-lab"
```

Use os comandos acima apenas para confirmar uma mudança autorizada ou preparar o
handoff ao verify. Se o teste ou o CLI falhar, relate a mensagem exata e roteie o
defeito para `workflow-lab-build`; não ajuste `VALIDACAO.md`, HTML ou MANIFEST para
esconder a falha.
