# AID-182 — proposta de desbloqueio das próximas tarefas

Data: 2026-08-25

## Resultado executivo

A cadeia técnica do primeiro piloto da AiDevSchool está pronta somente para a jornada
`IA Prática`, missão `l02` v3. AID-178 emitiu GO independente para os permalinks imutáveis do
OS e do LiteracyDojo, confirmou recibo isolado, documentos legais, ausência de `mastered` e
imutabilidade do learner canônico. AID-180 repetiu o preflight e preservou os mesmos hashes.

A trilha Dev ainda não possui candidato imutável e QA independente equivalentes. Portanto, a
proposta de menor risco é reduzir a primeira execução a **uma sessão IA Prática (`l02` v3)** e
manter a sessão Dev em HOLD até existir candidato próprio aprovado.

## Proposta sujeita a aprovação

1. Aprovar o protocolo AID-142 somente para uma sessão IA Prática, sem alegação de eficácia.
2. Nomear o agente PM/Curriculum Lead como moderador operacional.
3. Nomear o QA Lead como revisor independente da execução.
4. Usar armazenamento de pesquisa restrito, fora de issue/git, com exclusão em 30 dias.
5. Autorizar recrutamento/agendamento de no máximo um participante elegível em sistema separado.
6. Manter a trilha Dev, novos deploys, ampliação de público e qualquer escrita de mastery em HOLD.

## Por que esta sequência

- Usa somente o candidato e a missão cobertos pelo GO independente de AID-178.
- Produz evidência real da usabilidade do protocolo sem confundir uma sessão com eficácia.
- Preserva separação produtor/verificador e os limites de privacidade definidos em AID-142.
- Evita bloquear todo o aprendizado operacional enquanto a trilha Dev aguarda candidato e QA.

## Critério de conclusão do desbloqueio

Após aprovação humana, a interação deve acordar o Release Engineer em AID-180. O responsável
executa uma única sessão dentro dos limites acima, registra apenas dados allowlisted e encaminha
a evidência ao QA Lead para recomendação independente de continuar ou pausar.

Sem aprovação, nenhum convite é enviado e AID-180 permanece bloqueada com owner CEO/board.
