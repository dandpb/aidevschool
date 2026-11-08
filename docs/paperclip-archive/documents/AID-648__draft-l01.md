<!-- issue: AID-648 | key: draft-l01 | doc_id: 39ab287c-2bc2-4b3d-9166-83b7780d276f | updated: 2026-09-02 14:55:40.745+00 -->

# AID-648 — draft YAML l01 "Sua primeira conversa com uma IA" (mod-01, O3-C1 T1)

(AID-648)

# AID-648 — Draft YAML l01 "Sua primeira conversa com uma IA" (T1, Onda O3-C1 — retrofit mod-01)

**Status:** DRAFT de autoria CD pronto para landing FPE (autoria completa; landing em PR único da onda é gate do FPE — spec rev 2 §5.5). **Mecânica:** v1→v2 · 3→4 min · +`l01-a2` (`sort`, **4 itens** — ajuste A1 aplicado) e +`l01-a3` (`missing_context`, distratores de setup aprovados; contextOptions kebab **sem** `ctx-`) · rubrica 2→3 (+`r-monta-a-primeira-pergunta` verbatim do spec) · `requiredActivityIds` = conjunto completo. 130 linhas.
**Especificação:** AID-644 spec rev 2 (doc `spec-rev2` na AID-647) §2.1 + advisory CD AID-645 comentário `2ed06cf2` (decisões vinculantes A1/A2, notas de autoria 1–7) · Template: AID-525 §2 · Checklist: §3.1 (8 itens, preenchido no comentário desta issue).
**Pré-validação first-hand (read-only):** cópia descartável da trilha com os 3 YAMLs trocados e `estimatedMinutes` l01 3→4 no catálogo da cópia → `tools/validate.py --track <cópia>` **VERDE** — "OK: 17 lição(ões) ready validadas, 0 planned" (baseline do workspace CD está 1 onda atrás do main; l18–l29 não fazem parte da cópia e o FPE revalida no main). Diff vs. baseline puramente aditivo (R1.1: a1 intacta; nenhum trecho existente editado/reordenado).

**Destino canônico (landing FPE):** `curriculum/ai-literacy/modules/01-ai-sem-misterio/*.yaml` (substituição integral por estes arquivos, PR único da onda com T2) + `catalog.yaml`: bump `version` por lição e `estimatedMinutes` l01 3→4 + **bump único de `contentVersion` no primeiro landing** (spec §4.1–4.2).

```yaml
# Lição l01 — primeira lição da trilha (Fase 2); retrofit O3-C1 (spec AID-644 rev 2 §2.1): +l01-a2/+l01-a3, v1→v2, 3→4 min.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l01
version: 2
moduleId: mod-01
title: "Sua primeira conversa com uma IA"
objective: "Fazer uma primeira pergunta a uma IA e interpretar a resposta como um rascunho, não como uma ordem."
estimatedMinutes: 4
skillIds: [entender]
prerequisites: []

activities:
  - id: l01-a1
    type: choice
    skillId: entender
    instruction: "Você perguntou à IA: 'Como organizo a pauta da reunião semanal da minha equipe?' e ela respondeu com uma pauta pronta. O que você faz com essa resposta?"
    data:
      options:
        - id: opt-rascunho
          text: "Uso como rascunho: reviso, ajusto à realidade da minha equipe e só então uso."
        - id: opt-copia
          text: "Uso exatamente como veio — a IA sabe qual é o melhor formato de pauta."
        - id: opt-descarta
          text: "Descarto na hora — IA não entende nada de reunião."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-rascunho]
    feedback:
      onFailure: "Quase lá. A resposta da IA é um ponto de partida, não uma decisão final: nem aceitar sem ler, nem jogar fora."
      perCheck:
        opt-rascunho: "O melhor caminho é tratar a resposta como rascunho: aproveita o que serve, ajusta o que não serve."
        opt-copia: "Sem revisão, erros e coisas fora do contexto da sua equipe passam direto."
        opt-descarta: "Descartar tudo desperdiça um bom rascunho — a economia de tempo está em revisar, não em recomeçar."
      onSuccess: "Isso! Resposta de IA é rascunho: o julgamento final é sempre seu."
    storage:
      policy: structured_only
    hints:
      - "Pense na IA como um estagiário esforçado: ele entrega um rascunho rápido, mas quem assina embaixo é você."
      - "A melhor opção equilibra aproveitar o trabalho da IA e revisar com o seu conhecimento da equipe."

  - id: l01-a2
    type: sort
    skillId: entender
    instruction: "Um colega quer ter a primeira conversa com uma IA e quer começar bem. Ordene o ciclo da primeira conversa, do começo ao fim."
    data:
      items:
        - id: passo-tarefa
          text: "Escolher uma tarefa simples e concreta para começar — algo pequeno, que você mesmo sabe avaliar."
        - id: passo-pergunta
          text: "Escrever a pergunta dizendo o que quer e o mínimo de contexto sobre a sua situação."
        - id: passo-leitura
          text: "Ler a resposta como rascunho: separar o que serve do que não serve."
        - id: passo-uso
          text: "Ajustar o que não serviu e usar o que passou pela sua revisão."
    evaluation:
      strategy: deterministic
      expectedOrder: [passo-tarefa, passo-pergunta, passo-leitura, passo-uso]
    feedback:
      onFailure: "A primeira conversa funciona em quatro passos: começar com uma tarefa simples e concreta, escrever a pergunta com o mínimo de contexto, ler a resposta como rascunho e ajustar antes de usar. Fora dessa ordem, o pedido vira palpite e o uso vira risco."
      perCheck:
        passo-tarefa: "O começo é antes da pergunta: uma tarefa simples e concreta é o que permite conferir o resultado depois."
        passo-pergunta: "Com a tarefa escolhida, a pergunta sai melhor: o que você quer mais o mínimo de contexto."
        passo-leitura: "A resposta chega como rascunho: separar o que serve do que não serve vem antes de qualquer uso."
        passo-uso: "O uso é o ponto final do ciclo — e só entra o que passou pela sua revisão."
      onSuccess: "Esse é o ciclo da primeira conversa: tarefa simples → pergunta com contexto mínimo → leitura como rascunho → ajuste e uso."
    storage:
      policy: structured_only
    hints:
      - "O ciclo começa antes de escrever qualquer pergunta: com o que é preciso decidir primeiro?"
      - "Do meio para o fim: a resposta é um rascunho — e o que você faz com um rascunho?"

  - id: l01-a3
    type: missing_context
    skillId: entender
    instruction: "Outro colega vai fazer a primeira pergunta dele e mostra a mensagem que pretende enviar: só 'me ajuda aí'. A IA respondeu pedindo esclarecimento — e ele travou. O que estava faltando na mensagem dele?"
    data:
      prompt: "Me ajuda aí"
      contextOptions:
        - id: tarefa-definida
          text: "Uma tarefa definida — dizer o que ele quer que a IA faça"
        - id: contexto-minimo
          text: "O contexto mínimo — a situação em que ele precisa de ajuda"
        - id: formato-esperado
          text: "O formato esperado — que tipo de resposta ele quer receber (lista, texto, e-mail)"
        - id: nome-do-modelo-de-ia
          text: "O nome do modelo de IA que ele vai usar"
        - id: temperatura
          text: "A temperatura do modelo — uma configuração técnica de criatividade"
    evaluation:
      strategy: deterministic
      requiredContextIds: [tarefa-definida, contexto-minimo, formato-esperado]
    feedback:
      onFailure: "'Me ajuda aí' não diz o que fazer, em que situação, nem que resposta esperar. Nome de modelo e temperatura são configuração da ferramenta — nenhum dos dois substitui uma pergunta com tarefa, contexto e formato."
      perCheck:
        tarefa-definida: "Faltou isto: a tarefa — 'me ajuda aí' não pede nada; a IA não tem como adivinhar o que ele quer."
        contexto-minimo: "Faltou isto: o contexto mínimo — a situação dele é o que separa uma resposta útil de uma genérica."
        formato-esperado: "Faltou isto: o formato esperado — sem dizer que tipo de resposta quer, ele recebe o formato que a IA escolher."
        nome-do-modelo-de-ia: "Isto é mito de setup: o nome do modelo não vai no pedido — qualquer IA precisa saber o que você quer."
        temperatura: "Isto é mito de setup: temperatura é configuração interna da ferramenta — não conserta pergunta vazia."
      onSuccess: "Exato! Primeira pergunta que funciona traz as três: tarefa definida, contexto mínimo e formato esperado."
    storage:
      policy: structured_only
    hints:
      - "Leia a mensagem como se você fosse a IA: o que dá para fazer com 'me ajuda aí'?"
      - "Três coisas faltam: o que fazer (tarefa), a situação (contexto) e o tipo de resposta (formato)."

rubric:
  id: l01-rubric
  criteria:
    - id: r-rascunho
      text: "Interpreta a resposta da IA como rascunho a ser revisado, não como ordem."
      weight: 1
    - id: r-julgamento
      text: "Reconhece que o julgamento final sobre o conteúdo permanece com a pessoa."
      weight: 1
    - id: r-monta-a-primeira-pergunta
      text: "Monta a primeira pergunta com tarefa definida, contexto mínimo e formato esperado."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l01-a1, l01-a2, l01-a3]
```
