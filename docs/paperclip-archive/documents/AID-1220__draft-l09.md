<!-- issue: AID-1220 | key: draft-l09 | doc_id: 363d23e1-2116-4977-9e5f-0951494727d9 | updated: 2026-09-10 08:11:10.75+00 -->

# AID-1220 — draft YAML l09 "Como reconhecer uma resposta inventada" (mod-03, O3-C2)

(AID-1220)

# AID-1220 — Draft YAML l09 "Como reconhecer uma resposta inventada" (O3-C2 — retrofit mod-03)

**Status:** DRAFT de autoria CD pronto para landing FPE (autoria completa; landing é gate do FPE, **após T0 de B2/AID-1219** — decisão AID-1216 §dispatch). **Mecânica:** v1→v2 · 4 min · +`l09-a2` (`choice`: "se fosse invenção a IA teria avisado" — confiança não é prova) e +`l09-a3` (`choice` multiSelect: marcar os sinais de invenção numa resposta concreta) · **rubrica mantida verbatim** (as 3 existentes cobrem a2/a3) · `requiredActivityIds` = conjunto completo · a1 **intacta** (R1.1). 131 linhas.

**Especificação:** AID-1220 (dispatch CEO AID-1216/B3) · padrão O3-C1 provado (spec AID-644 rev 2 §§1.4–1.5, template AID-525 §2, checklist §3.1) · ruling de migração AID-640 (append-only; E1–E4; aviso S1/S2 já mecanizado em `retrofitNotice.ts` — landing só registra a entrada nova de `contentVersion`).

**Pré-validação first-hand (read-only):** cópia descartável da trilha @ `origin/main` `e839d0fc` com os 6 YAMLs do O3-C2 + catálogo da cópia (l08 3→4, l10 3→4) → `tools/validate.py --track <cópia>` **VERDE** ("OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned") + `--compile` verde. Diff vs. main puramente aditivo (0 linhas removidas; a1 dict-identical; rubricas existentes verbatim).

**Destino canônico (landing FPE):** `curriculum/ai-literacy/modules/{ rel.split('/')[0] }/{ rel.split('/')[1] }` (substituição integral, PR único da onda) + `catalog.yaml`: `estimatedMinutes` (quando bumped) + bump único de `contentVersion`.

```yaml
# Lição l09 — Fase 2; retrofit O3-C2 (AID-1220, padrão AID-644/648): +l09-a2/+l09-a3, v1→v2.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l09
version: 2
moduleId: mod-03
title: "Como reconhecer uma resposta inventada"
objective: "Identificar sinais de alucinação: fontes que não existem, números precisos sem origem, detalhes confiantes demais."
estimatedMinutes: 4
skillIds: [avaliar]
prerequisites: [l08]

activities:
  - id: l09-a1
    type: rubric_review
    skillId: avaliar
    instruction: "A IA deu a resposta abaixo para embasar uma apresentação interna. Avalie cada critério: foi atendido, parcialmente atendido ou não atendido?"
    data:
      responseText: "O home office aumenta a produtividade. Segundo um estudo da Universidade de São Paulo publicado em 2024, 87% das empresas brasileiras que adotaram o home office viram as vendas crescer 35% em um ano. O relatório 'Futuro do Trabalho 2025' confirma essa tendência. Vale dizer que os resultados variam bastante de empresa para empresa, então o efeito pode ser menor no seu caso. Minha recomendação é implementar o quanto antes, pois os dados são claros."
      criteria:
        - id: c-fontes
          text: "As fontes citadas são identificáveis e verificáveis (autor, instituição, link ou data checável)?"
        - id: c-numeros
          text: "Os números precisos (87%, 35%) têm origem indicada com clareza?"
        - id: c-incerteza
          text: "A resposta distingue o que é fato comprovado do que é opinião ou recomendação?"
    evaluation:
      strategy: deterministic
      expectedVerdicts:
        c-fontes: not_met
        c-numeros: not_met
        c-incerteza: partial
    feedback:
      onFailure: "Sinais clássicos de invenção: 'estudo da USP' sem título nem link, relatório com nome genérico e números redondos demais. A resposta admite variação, mas chama de 'dados claros' o que não tem fonte."
      perCheck:
        c-fontes: "'Um estudo da USP' e 'relatório Futuro do Trabalho 2025' não são verificáveis: sem título completo, autor ou link, não há como checar — provável invenção."
        c-numeros: "87% e 35% são precisos demais para vir sem origem checável: número redondo e sem fonte é sinal de alerta."
        c-incerteza: "A resposta oscila: admite que 'os resultados variam', mas conclui que 'os dados são claros' e recomenda agir — parcialmente honesta sobre a incerteza."
      onSuccess: "Exato! Fonte não verificável + número preciso sem origem + confiança excessiva = resposta para verificar antes de usar."
    storage:
      policy: structured_only
    hints:
      - "Tente checar mentalmente cada fonte: você conseguiria encontrar esse 'estudo' ou esse 'relatório' com as informações dadas?"
      - "Um critério aqui não é totalmente falho: a resposta admite alguma variação, mas se contradiz na conclusão."

  - id: l09-a2
    type: choice
    skillId: avaliar
    instruction: "Você mostrou ao colega uma resposta com sinais de invenção. Ele disse: 'Se algo fosse invenção, a IA teria avisado — repare na segurança com que ela escreveu.' Qual é a melhor resposta para ele?"
    data:
      options:
        - id: opt-prova-fora-da-resposta
          text: "A segurança do texto não prova nada: a invenção sai com o mesmo tom do acerto. A prova está fora da resposta — na fonte e na origem dos números."
        - id: opt-ia-sempre-avisa
          text: "Verdade: quando não tem certeza, a IA avisa claramente na própria resposta."
        - id: opt-so-temas-tecnicos
          text: "Invenção só acontece em temas técnicos; assuntos do dia a dia estão seguros."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-prova-fora-da-resposta]
    feedback:
      onFailure: "O colega está confiando no lugar errado: a IA não sabe quando está inventando — às vezes hesita, às vezes não. O tom não é sinal de nada; a verificação é externa ao texto."
      perCheck:
        opt-prova-fora-da-resposta: "Isso: confiança é estilo de escrita, não evidência. Invenção e acerto saem com a mesma segurança — só a fonte resolve."
        opt-ia-sempre-avisa: "A IA não tem como saber o que inventou: pode avisar às vezes, mas não dá para depender disso."
        opt-so-temas-tecnicos: "Invenção aparece em qualquer tema: fonte vaga e número sem origem são sinais em assunto técnico ou do dia a dia."
      onSuccess: "Exato: o sinal de invenção nunca está no tom — está na falta de fonte verificável e na origem dos números."
    storage:
      policy: structured_only
    hints:
      - "Pergunte ao colega: como a IA saberia que inventou? Ela não tem como checar a si mesma."
      - "Onde fica a prova de uma informação: no texto que a afirma ou na fonte de onde ela deveria vir?"

  - id: l09-a3
    type: choice
    skillId: avaliar
    instruction: "Você pediu à IA: 'quais empresas do nosso setor mais cresceram no último ano?'. Ela respondeu: 'A Acme lidera com crescimento de 41,3%, segundo o levantamento Setor em Foco. Especialistas afirmam que a tendência deve se manter. Fica tranquilo: os dados são confiáveis.' Marque os sinais de possível invenção."
    data:
      multiSelect: true
      options:
        - id: opt-numero-sem-origem
          text: "Número preciso (41,3%) sem nenhuma origem indicada"
        - id: opt-fonte-so-nome
          text: "Levantamento citado apenas pelo nome, sem autor, instituição ou link"
        - id: opt-especialistas-sem-nome
          text: "'Especialistas afirmam' sem nomear nenhum especialista"
        - id: opt-explica-o-setor
          text: "A resposta explica o que é o setor antes de citar os números"
        - id: opt-oferece-ajuda
          text: "A resposta se oferece para ajudar com outras perguntas"
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-numero-sem-origem, opt-fonte-so-nome, opt-especialistas-sem-nome]
    feedback:
      onFailure: "Três sinais clássicos: número preciso sem origem, fonte citada só pelo nome (sem autor nem link) e 'especialistas' que ninguém nomeia. Explicar o assunto e oferecer ajuda são cortesia, não sinal de invenção."
      perCheck:
        opt-numero-sem-origem: "Sinal: 41,3% é preciso demais para viajar sem origem — número sem fonte é o primeiro alerta."
        opt-fonte-so-nome: "Sinal: 'levantamento Setor em Foco' sem autor, instituição ou link não dá para encontrar — provável invenção."
        opt-especialistas-sem-nome: "Sinal: 'especialistas afirmam' sem nome é autoridade fantasma."
        opt-explica-o-setor: "Não é sinal: dar contexto sobre o assunto é comum e não afirma nada checável."
        opt-oferece-ajuda: "Não é sinal: oferecer ajuda é cortesia do formato, não diz nada sobre a confiabilidade dos dados."
      onSuccess: "Isso! Número sem origem, fonte só pelo nome e especialista sem nome: três sinais, uma conclusão — verificar antes de usar."
    storage:
      policy: structured_only
    hints:
      - "Para cada trecho da resposta: você conseguiria encontrá-lo em algum lugar de verdade?"
      - "Dois itens são apenas boas maneiras da IA — não dizem nada sobre os dados."

rubric:
  id: l09-rubric
  criteria:
    - id: r-fontes-verificaveis
      text: "Exige fontes identificáveis e verificáveis para dados apresentados."
      weight: 1
    - id: r-numeros-sem-origem
      text: "Desconfia de números precisos sem origem indicada."
      weight: 1
    - id: r-confianca-excessiva
      text: "Nota contradição entre admissão de incerteza e conclusão confiante."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l09-a1, l09-a2, l09-a3]
```
