# Definir a autoridade de promoção da trilha não-técnica

Type: grilling
Status: open
Blocked by: 09

## Question

O verificador independente da trilha não-técnica existe, é determinístico e tem 27 testes verdes
(`learner/gate/literacy_verifier.py`), e emite `mastery_eligible` num recibo. **Nenhum código
consome esse campo** — grep no repo inteiro só encontra o próprio módulo, seus testes e docs. O
produtor no LiteracyDojo para em `completed` por decisão registrada
(`docs/design/ai-literacy/evidence-contract.md:17-20`), e a evidência sequer chega ao filesystem:
os três `EvidenceSink` escrevem em console, memória e `window`/`sessionStorage`.

Quem — se alguém — tem autoridade para promover competência na trilha não-técnica, e o que a
pessoa vê quando alcança o teto atual (`completed`) sem que nada a promova? Decidir entre: teto
declarado em `completed` como resposta final; um consumidor do `mastery_eligible` que escreve no
substrato; ou uma terceira categoria de reconhecimento que não é `mastered`.

Decisão adjacente que a resposta precisa cobrir: o elo produtor→verificador é hoje manual e não
documentado (nenhum exportador materializa o `LiteracyEvidenceRecord` em arquivo). Fechar esse elo
é pré-requisito de qualquer promoção — ou a promoção não acontece.

Contexto: [Delimitar o contrato pedagógico compartilhado](02-delimitar-o-contrato-pedagogico-compartilhado.md),
seções (c) e (e).
