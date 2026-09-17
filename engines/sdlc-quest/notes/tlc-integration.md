# Mudança v1.2 — Integração TLC

## Intenção
Integrar as quatro skills indicadas pelo usuário ao jogo existente, como aprendizado acionável, sem retirar missões anteriores nem afirmar execução de agentes reais.

## Decisões
Manter JavaScript e Canvas existentes; oficina DOM opcional com quatro módulos e 16 desafios. Progresso TLC separado dentro do mesmo save version 1; não inserir desafios entre os IDs antigos, evitando invalidar a progressão contígua da campanha original. Portabilidade por backup com confirmação. Nenhuma instalação externa ou publicação autorizada por este pedido.

## Critérios
As quatro skills têm entrada, saída, fonte e prompt; jogos concretos e feedback gratuito; provas com fixtures reais locais; revisão simulada explicitamente rotulada; pontuação de replay idempotente; migração de v1.1; acessibilidade de controles e layout 320–1440 amostrados; relatório sem inventar independência.

## Verificação
Veja TEST-REPORT-v1.2.md e evidence-v1.2/artifact.json para a identidade e limites do candidato. Os testes fornecem evidência de comportamentos específicos, não de todas as propriedades possíveis.

## Limites remanescentes
Sem subagente, sem PR remota e sem revisão oficial the-judge. O check de regressão pré-patch da oficina se aplica a um bug conhecido; não ensina que todo teste novo deva falhar numa versão anterior. As metas de produto não viram unit tests. A convergência de revisão não rebaixa severidades para obter aprovação.
