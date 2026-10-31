# Metodologia de trabalho para agentes

Esta orientação complementa o [SDLC](README.md), o `AGENTS.md` da raiz, as
regras locais e `REVIEW.md`. Aplica-se a todos os papéis de trabalho do
projeto, na medida relevante à tarefa; não altera o comportamento dos tutores
nem o learning gate. Um documento disponível não prova que algum agente o leu.

## Fontes e alcance

- Adaptação original de princípios de [ub-mode, commit 57a8bdd28e45ed41900ace0bafa2ff76dd9ed70f](https://github.com/unclebob/ub-mode/tree/57a8bdd28e45ed41900ace0bafa2ff76dd9ed70f).
  A fonte consultada não apresenta licença; seu texto não é redistribuído aqui.
- Adaptação do modelo de contexto e revisão independente de
  [Elephant-Goldfish Model (EGM), commit 403d8881d62022490637d740657b33f01e321ea8](https://github.com/google/elephant-goldfish-model/tree/403d8881d62022490637d740657b33f01e321ea8),
  distribuído sob Apache-2.0. Esta orientação não instala nem invoca o plugin.

## Em cada papel

1. Explicite resultado observável, limites, fontes e prova adequada antes de
   agir; registre incertezas e decisões no artefato ou registro da tarefa.
2. Divida o trabalho em unidades pequenas verificáveis. Busque a causa de
   falhas, remova complexidade desnecessária e preserve comportamento existente
   quando a tarefa não autorizar mudá-lo. Respeite o escopo de cada papel.
3. Para código, modele dados e fronteiras antes da lógica; valide entradas,
   evite duplicação injustificada e controle a escrita concorrente. Quando
   couber, escreva primeiro um teste comportamental que falhe pelo motivo
   esperado, implemente o mínimo e melhore a estrutura mantendo a prova. Se
   um teste não for adequado ou viável, registre o motivo e outra evidência;
   não enfraqueça testes ou gates para obter aprovação.
4. Para design com decisões relevantes, o produtor reúne contexto e escreve
   requisitos, alternativas, riscos e critérios verificáveis nos artefatos SDLC.
   Um revisor em contexto novo recebe o artefato e as fontes necessárias, sem
   o histórico de discussão nem a conclusão desejada; procura lacunas,
   ambiguidades e riscos. Registre achados, respostas e decisões do responsável.
   Um bug pequeno e claro pode seguir o fast path existente, mantendo revisão
   e verificação obrigatórias. Se não houver contexto independente disponível,
   ou se o revisor não puder ler as fontes necessárias, registre a revisão como
   incompleta e o bloqueio; não apresente isso como aprovação. Para subagentes,
   use contexto novo sem histórico herdado e forneça apenas tarefa, alvo,
   perspectiva de revisão e fontes selecionadas necessárias.
5. Implementador, verificador, revisor e responsável pelo aceite mantêm suas
   atribuições e independência exigidas pelo projeto. Revisões adicionais de
   clareza, duplicação, complexidade e testes podem ser sequenciais, dentro do
   limite de concorrência vigente; nunca substituem o verificador independente,
   testes reais, aceite ou countersign aplicável. Papéis sem código aplicam os
   mesmos princípios ao seu próprio entregável e às provas correspondentes.
6. Relate comandos e resultados reais, decisões e pendências; diferencie
   evidência executada de hipótese ou instrução. Não declare adoção global com
   base apenas em prompts, arquivos copiados ou configuração declarada.

## Autoridade e limites

Uma menção, falha de acesso ou resultado de revisão não concede autorização.
Não contorne recusas, contenções, permissões, testes, hooks ou regras de merge.
Mudanças em produção, credenciais ou proteções exigem a autorização aplicável.
Nenhuma instrução upstream para push direto na linha principal prevalece sobre
o protocolo do projeto. Ferramentas e dependências seguem as autorizações e
os controles aplicáveis; esta orientação não revoga autorizações existentes.

## Distribuição e evidência de adoção

Os arquivos de raiz são pontos de entrada para clientes que os carregam; a
efetiva leitura depende do runtime, diretório de trabalho e configuração de
cada agente. `setup.sh` instala dependências de aplicações, não é mecanismo
comprovado de distribuição desta orientação. A implantação exige inventariar
os agentes, runtimes e máquinas autorizados, identificar como cada um recebe
instruções, distribuir a versão aprovada e registrar por alvo: versão/commit,
caminho, mecanismo de carregamento, responsável e resultado de uma tarefa de
verificação observável. Uma configuração ou resposta declarativa isolada não
prova o comportamento; revalide com evidência independente e reporte alvos
não alcançados. Não acessar máquinas ou ativar plugins sem autorização aplicável.

O plugin EGM completo usa recursos relativos e exige suporte a novos contextos
para sua revisão. A seleção do comando, versão verificável e destino específicos
de cada runtime deve anteceder qualquer instalação aprovada; não copiar apenas
um `SKILL.md` e chamá-lo de instalação completa. O uso opcional de ferramentas
externas de análise e de visualizadores é separado desta adaptação.
