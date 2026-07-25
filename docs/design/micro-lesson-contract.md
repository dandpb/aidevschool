# Contrato de microlição

| Campo | Valor |
| --- | --- |
| Status | Contrato pedagógico cross-surface |
| Escopo | LiteracyDojo, jogos de ensino e experiências futuras |
| Não define | Um schema único de evidência ou uma autoridade única de progresso |

## Propósito

Transformar a visão do AI DevSchool em uma experiência reconhecível nos dois
públicos: pessoas não técnicas e programadores. Cada superfície pode usar uma
atividade diferente, mas uma microlição deve preservar o mesmo ciclo de
aprendizagem.

## Ciclo mínimo

1. **Objetivo.** Declare uma habilidade observável em linguagem simples. A
   lição introduz um conceito principal e busca caber em 3–5 minutos quando a
   atividade permitir.
2. **Tentativa.** A pessoa faz algo antes de receber a solução completa. Pode
   comparar respostas, montar um prompt, classificar um risco, jogar uma
   mecânica ou executar código.
3. **Feedback imediato.** A superfície informa o que passou, o que faltou e o
   próximo passo. Critérios de aprovação são determinísticos sempre que
   possível.
4. **Dica e nova tentativa.** Dicas são progressivas e preservam o raciocínio
   da pessoa. Uma falha abre uma nova tentativa; não vira uma resposta pronta.
5. **Evidência bruta.** Toda tentativa avaliada produz um registro estruturado,
   sem texto livre sensível por padrão. A superfície produtora não verifica a
   própria evidência.
6. **Progresso da experiência.** A UI pode registrar `completed`, pontuação,
   sequência e revisão. Esses sinais ajudam a pessoa a voltar, mas não provam
   competência.
7. **Revisão.** O conteúdo reaparece conforme a agenda da superfície. Streak,
   XP e repetição espaçada nunca substituem uma nova tentativa.
8. **Verificação.** Somente um verificador independente pode promover uma
   competência a `mastered`, usando a evidência adequada à atividade.

## Adaptação por público

| Trilha | Tentativa típica | Evidência | Limite de conclusão |
| --- | --- | --- | --- |
| Alfabetização em IA | Atividade tipada com avaliação determinística | `LiteracyEvidenceRecord`; aplicação aberta pode ser `application_reported` | O app registra no máximo `completed` |
| Programação e jogos | Código executado, diagnóstico ou playthrough | Saída executável ou registro de jogo entregue ao verificador | `mastered` exige recibo independente |

Os envelopes continuam separados. Este contrato compartilha o ciclo
pedagógico, não força o vocabulário de programação dentro da alfabetização em
IA e não transforma evidência de jogo em prova final.

## Requisitos de experiência

- Use frases curtas, exemplos concretos e nenhum jargão sem explicação.
- Mostre uma ação principal por etapa e um próximo passo inequívoco.
- Preserve navegação por teclado, foco visível, contraste e feedback que não
  dependa apenas de cor.
- Trate streak, XP e conquistas como motivação, nunca como mastery.
- Não bloqueie aprendizagem real atrás de ranking, hearts ou comparação social.
- Indique quando uma experiência é local, planejada ou ainda não verificada.

## Critério de aceite

Uma superfície só pode anunciar conformidade com este contrato quando houver
evidência de que a pessoa consegue:

1. entender o objetivo sem documentação técnica;
2. concluir uma tentativa e receber feedback específico;
3. pedir uma dica, tentar novamente e perceber o próprio progresso;
4. distinguir `completed` de `mastered`; e
5. retomar a lição ou uma revisão sem perder a trilha.

## Fontes canônicas relacionadas

- [Visão do produto](../VISION.md)
- [Contrato de conteúdo de AI Literacy](ai-literacy/content-contract.md)
- [Contrato de evidência de AI Literacy](ai-literacy/evidence-contract.md)
- [Contrato dos teaching games](teaching-game-contract.md)
- [Estado canônico do aprendiz](../../learner/learning_state.yaml)

Em caso de conflito, os contratos específicos de cada bounded context vencem
para schema, persistência e integração. Este documento vence apenas para o
ciclo pedagógico mínimo descrito acima.
