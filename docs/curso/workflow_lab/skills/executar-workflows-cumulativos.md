# Executar workflows cumulativos

Este arquivo é o índice humano. As instruções operacionais canônicas ficam em
três skills separadas para que quem produz não aprove a própria entrega e quem
promove documentação não esconda um defeito do runtime.

## Escolha pela responsabilidade

1. [`workflow-lab-build`](../../../../.agents/skills/workflow-lab-build/SKILL.md)
   adiciona ou altera fixture, contrato, handler e teste focado. Pare quando a
   mudança estiver verde e restrita; não publique evidência ou veredito.
2. [`workflow-lab-verify`](../../../../.agents/skills/workflow-lab-verify/SKILL.md)
   verifica em contexto separado, somente leitura, com duas saídas temporárias.
   Pare com um relatório PASS/FAIL; não corrija o que falhar.
3. [`workflow-lab-maintain`](../../../../.agents/skills/workflow-lab-maintain/SKILL.md)
   sincroniza evidência durável, ensinamentos, links e manifesto somente após
   um Verify independente em PASS. Defeito de runtime volta para Build.

```text
Build produz → Verify prova → Maintain promove → novo Verify confirma
```

## Fonte de verdade

Leia o estado nesta ordem:

1. [`SPEC.md`](../SPEC.md), fixtures e registry definem o contrato executável.
2. Verify independente confirma o comportamento atual.
3. `learning.ndjson` e os artefatos registram resultados duráveis;
   `report.md` é apenas uma projeção derivada.
4. `VALIDACAO.md`, HTML, este índice e `MANIFEST.md` explicam o estado provado.

As skills não são um agendador. Invoque Build ao mudar o runtime, Verify após
qualquer mudança e Maintain apenas quando houver uma prova independente válida.
O laboratório continua local, sem rede e sem mutação em `learner/`; escritas
são atômicas por arquivo, não uma transação do conjunto inteiro.
