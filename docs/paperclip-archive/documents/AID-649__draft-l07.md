<!-- issue: AID-649 | key: draft-l07 | doc_id: 53eaeb40-1c00-4d61-9c3e-0d7a87e327db | updated: 2026-09-02 14:46:55.856+00 -->

# AID-649 — Draft YAML l07 (Melhore a resposta em etapas) — T2 Onda O3-C1 (spec rev 2 §2.7)

(AID-649)

# AID-649 — Draft YAML l07 "Melhore a resposta em etapas" (T2, Onda O3-C1)

**Status:** DRAFT de autoria CD pronto para landing FPE (autoria SOMENTE — landing é gate separado; recomendado **PR único da onda** quando T1+T2 prontos, spec rev 2 §5.5, bump único de `contentVersion` no primeiro landing). Especificação literal: **spec rev 2 (AID-647 doc `spec-rev2` = rev 2 do doc `spec` da AID-644) §2.7** + advisory CD AID-645 comentário `2ed06cf2` (notas 1–7); template AID-525 §2; checklist §3.1 em comentário nesta issue.

**Mecânica:** v1→v2 · 4 min mantidos · +l07-a2 `choice` (skill `avaliar`) · +l07-a3 `prompt_builder` (o-que-mudar/onde/o-que-manter) · rubrica +`r-pedido-de-ajuste` · `requiredActivityIds` = conjunto completo · a1 pré-existente **byte-identical/append-only (R1.1)** · feedback 3 vias com `perCheck` · hints 1–3 · `storage: structured_only` · evidência `literacy-evidence v1 / verifierRequired: true` herdada.

**Pré-validação executada** (leitura only, sem escrita canônica): `validate.py` verde em cópia da trilha com os 4 drafts + bump espelho do catálogo (l04 `estimatedMinutes: 3→4`, o que o FPE landa por §4.1). Anexo YAML verbatim: `/api/attachments/983df574-d5e7-4a0a-a11c-b6879f7517a6/content`.

**Nota de autoria (desvio divulgado):** instruções das novas atividades em sentence case (estilo das lições hospedeiras l04–l07), não CAIXA ALTA (convenção das ondas novas l24+); marcador de multiSelect mantido no texto ("Marque todas"). Vocabulário `ctx-` preservado na l06-a1 existente; ids kebab sem prefixo nas novas `missing_context` (nota 2 do advisory).

```yaml
# Lição l07 — Fase 2; retrofit Onda O3-C1 (spec AID-644 rev 2 §2.7; advisory AID-645 `2ed06cf2`): +l07-a2/a3, v2.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l07
version: 2
moduleId: mod-02
title: "Melhore a resposta em etapas"
objective: "Iterar sobre uma resposta da IA com pedidos de ajuste específicos em vez de recomeçar do zero."
estimatedMinutes: 4
skillIds: [pedir, avaliar]
prerequisites: [l06]

activities:
  - id: l07-a1
    type: sort
    skillId: pedir
    instruction: "Você pediu um texto à IA e a primeira resposta ficou mais ou menos. Ordene as etapas do jeito mais eficiente de chegar a um bom resultado final."
    data:
      items:
        - id: step-ajuste
          text: "Peça um ajuste específico (ex.: \"deixe mais curto\" ou \"troque o exemplo\")."
        - id: step-pedido
          text: "Faça o primeiro pedido com objetivo e contexto claros."
        - id: step-repita
          text: "Repita os ajustes até o texto ficar pronto para a sua revisão final."
        - id: step-leitura
          text: "Leia a resposta e identifique o que ficou mais fraco."
    evaluation:
      strategy: deterministic
      expectedOrder: [step-pedido, step-leitura, step-ajuste, step-repita]
    feedback:
      onFailure: "O ciclo eficiente é: pedir bem → ler com critério → ajustar o ponto fraco → repetir. Recomeçar do zero joga fora o que já estava bom."
      perCheck:
        step-pedido: "Tudo começa com um pedido claro — sem isso, não há base para ajustar."
        step-leitura: "Antes de ajustar, leia e aponte o que ficou fraco: ajuste genérico gera resposta genérica."
        step-ajuste: "O ajuste vem depois da leitura crítica e deve ser específico."
        step-repita: "Repetir é a última etapa do ciclo — e termina na sua revisão humana, não na da IA."
      onSuccess: "Perfeito! Pedir → ler → ajustar → repetir: é assim que a resposta melhora em etapas, sem recomeçar."
    storage:
      policy: structured_only
    hints:
      - "O ciclo começa pelo pedido e termina na repetição — o que vem entre um e outro?"
      - "Antes de pedir o ajuste, você precisa saber o que ajustar: leitura crítica vem antes do ajuste."

  - id: l07-a2
    type: choice
    skillId: avaliar
    instruction: "Você pediu à IA um aviso para o grupo do condomínio sobre a troca da água do sábado e a resposta veio com tom formal demais — parece comunicado oficial da administração. Qual é o próximo pedido certo?"
    data:
      options:
        - id: opt-ajuste
          text: "Pedir o ajuste específico: \"Reescreva em tom mais leve e direto, mantendo o dia e a hora da troca de água.\""
        - id: opt-refaz
          text: "Apagar tudo e fazer um pedido completamente novo, do zero, torcendo para a resposta virar diferente."
        - id: opt-aceita
          text: "Usar como está: formal demais, mas ainda é um aviso válido para o grupo."
        - id: opt-generico
          text: "Responder só \"melhore\" e deixar a IA adivinhar o que incomoda no texto."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-ajuste]
    feedback:
      onFailure: "O diagnóstico já existe: o problema é o tom, não o conteúdo. O próximo passo do ciclo é um ajuste específico — dizer o que mudar (o tom) e o que manter (dia e hora). Recomeçar do zero joga fora o que estava bom; aceitar ignora o problema; \"melhore\" é ajuste genérico, e ajuste genérico gera resposta genérica."
      perCheck:
        opt-ajuste: "Isso: o pedido nomeia o que muda (tom mais leve e direto) e o que fica (dia e hora) — a IA sabe exatamente o que fazer."
        opt-refaz: "Recomeçar do zero desperdiça o que já estava bom — o aviso tinha a informação certa, só no tom errado."
        opt-aceita: "Aceitar ignora o feedback: você já identificou o problema, o ciclo manda ajustá-lo, não conviver com ele."
        opt-generico: "\"Melhore\" não diz o quê: sem nomear o tom como alvo, a IA pode mudar qualquer coisa — ou quase nada."
      onSuccess: "Isso! Ajuste específico: o que muda (o tom), o que fica (dia e hora). A resposta melhora na próxima etapa, sem recomeçar."
    storage:
      policy: structured_only
    hints:
      - "O que exatamente incomodou na resposta: o conteúdo ou a forma como soou?"
      - "Um bom pedido de ajuste diz o que mudar — e também o que não deve mudar."
      - "\"Melhore\" sem detalhe devolve o mesmo problema: a IA não sabe o que incomoda."

  - id: l07-a3
    type: prompt_builder
    skillId: pedir
    instruction: "Agora monte você o pedido de ajuste completo, preenchendo os três campos para transformar o feedback \"tom formal demais\" em um pedido que a IA consegue executar."
    data:
      scenario: "A resposta da IA para o grupo do condomínio veio assim: \"Comunicamos que os serviços de troca da água serão realizados no sábado, das 8h às 12h. Colocamo-nos à disposição para esclarecimentos.\" O grupo é informal — o tom precisa ficar mais leve, sem perder a informação."
      genericPrompt: "Melhore essa mensagem."
      fields:
        - id: o-que-mudar
          label: "O que mudar"
          hint: "A mudança que você quer ver. Ex.: o tom, mais leve e direto, linguagem de vizinho."
        - id: onde
          label: "Onde"
          hint: "Em que parte da resposta aplicar. Ex.: no texto todo, começando pela abertura \"Comunicamos que...\"."
        - id: o-que-manter
          label: "O que manter"
          hint: "O que não pode mudar. Ex.: sábado, das 8h às 12h — a informação da troca de água."
    evaluation:
      strategy: deterministic
      fields:
        o-que-mudar:
          minLength: 5
          mustIncludeAny: ["tom", "leve", "direto", "formal", "linguagem", "informal"]
        onde:
          minLength: 5
          mustIncludeAny: ["texto", "abertura", "comunicamos", "todo", "frase", "início", "inicio", "título", "titulo"]
        o-que-manter:
          minLength: 5
          mustIncludeAny: ["sábado", "sabado", "8h", "12h", "hora", "horário", "horario", "manter", "informação", "informacao"]
    feedback:
      onFailure: "Um pedido de ajuste que funciona diz as três coisas: o que mudar (o tom), onde (a abertura, o texto todo) e o que manter (sábado, 8h às 12h). Sem isso, a IA escolhe sozinha — e pode mudar o que estava certo."
      perCheck:
        o-que-mudar: "Nomeie a mudança: o tom — mais leve e direto, de conversa de grupo de vizinhos."
        onde: "Aponte o lugar: o texto todo, ou pelo menos a abertura \"Comunicamos que...\", que é o que mais soa a oficial."
        o-que-manter: "Proteja a informação: sábado, das 8h às 12h — o aviso precisa continuar dizendo isso."
      onSuccess: "Pedido de ajuste completo: muda o que precisa, onde precisa, e preserva o que estava certo. É assim que a conversa avança em etapas — e o próximo ajuste parte de uma base melhor."
    storage:
      policy: structured_only
    hints:
      - "O feedback era um só: o tom. Comece por ele no campo \"o que mudar\"."
      - "No campo \"o que manter\", pense na informação que os vizinhos precisam continuar vendo."
      - "Palavras que ajudam: tom ou leve em O que mudar; texto ou abertura em Onde; sábado ou 8h em O que manter."

rubric:
  id: l07-rubric
  criteria:
    - id: r-ciclo-iteracao
      text: "Ordena o ciclo pedir → ler → ajustar → repetir."
      weight: 1
    - id: r-ajuste-especifico
      text: "Entende que ajustes devem ser específicos, não um recomeço do zero."
      weight: 1
    - id: r-pedido-de-ajuste
      text: "Formula o pedido de ajuste dizendo o que mudar, onde e o que manter."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l07-a1, l07-a2, l07-a3]
```
