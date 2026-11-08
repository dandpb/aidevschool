<!-- issue: AID-649 | key: draft-l05 | doc_id: 5608580f-d7a3-4660-962c-e249639ff698 | updated: 2026-09-02 14:46:55.735+00 -->

# AID-649 — Draft YAML l05 (Dê contexto para obter uma resposta útil) — T2 Onda O3-C1 (spec rev 2 §2.5)

(AID-649)

# AID-649 — Draft YAML l05 "Dê contexto para obter uma resposta útil" (T2, Onda O3-C1)

**Status:** DRAFT de autoria CD pronto para landing FPE (autoria SOMENTE — landing é gate separado; recomendado **PR único da onda** quando T1+T2 prontos, spec rev 2 §5.5, bump único de `contentVersion` no primeiro landing). Especificação literal: **spec rev 2 (AID-647 doc `spec-rev2` = rev 2 do doc `spec` da AID-644) §2.5** + advisory CD AID-645 comentário `2ed06cf2` (notas 1–7); template AID-525 §2; checklist §3.1 em comentário nesta issue.

**Mecânica:** v2→v3 · 5 min mantidos · +l05-a2 `choice` multiSelect (contextos que mudam a resposta) · +l05-a3 `output_comparison` (errata §2.8; critérios `c-responde-a-situacao-real`/`c-pronta-para-usar`) · rubrica: 3 existentes verbatim · `requiredActivityIds` = conjunto completo · a1 pré-existente **byte-identical/append-only (R1.1)** · feedback 3 vias com `perCheck` · hints 1–3 · `storage: structured_only` · evidência `literacy-evidence v1 / verifierRequired: true` herdada.

**Pré-validação executada** (leitura only, sem escrita canônica): `validate.py` verde em cópia da trilha com os 4 drafts + bump espelho do catálogo (l04 `estimatedMinutes: 3→4`, o que o FPE landa por §4.1). Anexo YAML verbatim: `/api/attachments/bada1597-d6ee-4770-947d-9afeeaf585f9/content`.

**Nota de autoria (desvio divulgado):** instruções das novas atividades em sentence case (estilo das lições hospedeiras l04–l07), não CAIXA ALTA (convenção das ondas novas l24+); marcador de multiSelect mantido no texto ("Marque todas"). Vocabulário `ctx-` preservado na l06-a1 existente; ids kebab sem prefixo nas novas `missing_context` (nota 2 do advisory).

```yaml
# Lição l05 — piloto da vertical slice (seção 17 do plano); retrofit Onda O3-C1 (spec AID-644 rev 2 §2.5; advisory AID-645 `2ed06cf2`): +l05-a2/a3, v3.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: l05
version: 3
moduleId: mod-02
title: "Dê contexto para obter uma resposta útil"
objective: "Melhorar um pedido genérico preenchendo campos estruturados de objetivo, contexto, público e formato."
estimatedMinutes: 5
skillIds: [pedir]
prerequisites: [l04]

activities:
  - id: l05-a1
    type: prompt_builder
    skillId: pedir
    instruction: "O pedido abaixo é genérico demais e a resposta da IA sairia igualmente genérica. Melhore-o preenchendo os quatro campos com as informações da situação."
    data:
      scenario: "Você trabalha no atendimento de uma clínica odontológica. No próximo mês a clínica vai mudar o horário de funcionamento, e você precisa avisar os clientes com antecedência."
      genericPrompt: "Escreve um e-mail pra mim."
      fields:
        - id: objetivo
          label: "Objetivo"
          hint: "O que você quer que a IA produza? Ex.: redigir um e-mail avisando sobre a mudança de horário."
        - id: contexto
          label: "Contexto"
          hint: "O que a IA precisa saber sobre a situação? Ex.: é uma clínica odontológica e o novo horário começa no próximo mês."
        - id: publico
          label: "Público"
          hint: "Quem vai receber a mensagem? Ex.: clientes da clínica, em tom cordial."
        - id: formato
          label: "Formato"
          hint: "Como a resposta deve vir? Ex.: e-mail curto, de até 10 linhas, com assunto."
    evaluation:
      strategy: deterministic
      fields:
        objetivo:
          minLength: 15
          mustIncludeAny: ["avisar", "comunicar", "informar"]
        contexto:
          minLength: 25
          mustIncludeAny: ["horário", "horario"]
        publico:
          minLength: 8
          mustIncludeAny: ["cliente", "paciente"]
        formato:
          minLength: 8
          mustIncludeAny: ["e-mail", "email"]
    feedback:
      onFailure: "Ainda falta contexto. Revise os campos destacados: cada um precisa trazer uma informação concreta da situação — não basta repetir o pedido genérico em outras palavras."
      perCheck:
        objetivo: "Diga o que a IA deve produzir e para quê, usando verbos como avisar, comunicar ou informar."
        contexto: "Inclua os fatos que mudam a resposta: é uma clínica odontológica e o assunto é a mudança de horário."
        publico: "Diga quem recebe a mensagem (clientes ou pacientes) e o tom adequado."
        formato: "Peça o formato de entrega: um e-mail curto, com tamanho e estrutura definidos."
      onSuccess: "Muito bem! Com objetivo, contexto, público e formato, a primeira resposta da IA já sai quase pronta para usar."
    storage:
      policy: structured_only
    hints:
      - "Releia a situação e copie para cada campo um fato concreto: o que produzir, o que mudou, quem recebe e como entregar."
      - "No campo Objetivo, use um verbo de comunicação; no campo Contexto, conte o que vai mudar na clínica."
      - "Palavras que precisam aparecer: horário no Contexto, clientes ou pacientes no Público e e-mail no Formato."

  - id: l05-a2
    type: choice
    skillId: pedir
    instruction: "A clínica odontológica vai mudar o horário de funcionamento no próximo mês e você vai pedir à IA o e-mail de aviso. Quais informações mudam a resposta da IA? Marque todas."
    data:
      multiSelect: true
      options:
        - id: opt-novo-horario
          text: "O novo horário de funcionamento: dias e horas de atendimento a partir do próximo mês."
        - id: opt-quem-recebe
          text: "Quem vai receber o aviso: os clientes da clínica, que podem precisar remarcar consultas."
        - id: opt-numero-de-cadeiras
          text: "O número de cadeiras e consultórios da clínica."
        - id: opt-nome-do-fundador
          text: "O nome do dentista que fundou a clínica."
        - id: opt-software-interno
          text: "O software interno que a recepção usa para agendar consultas."
    evaluation:
      strategy: deterministic
      correctOptionIds: [opt-novo-horario, opt-quem-recebe]
    feedback:
      onFailure: "Contexto é a informação que muda o conteúdo do aviso: o fato novo (o horário) muda o que o e-mail diz; quem recebe muda o jeito de falar. Número de cadeiras, nome do fundador e software interno são verdadeiros — mas não mudam uma linha da resposta. Contexto suficiente não é tudo sobre a clínica."
      perCheck:
        opt-novo-horario: "Muda a resposta: o novo horário é o fato central do aviso — sem ele, o e-mail não diz nada."
        opt-quem-recebe: "Muda a resposta: escrever para clientes que podem remarcar define o tom e o que o e-mail precisa oferecer."
        opt-numero-de-cadeiras: "Não muda a resposta: o tamanho da clínica não entra no aviso sobre horário."
        opt-nome-do-fundador: "Não muda a resposta: a história da clínica é detalhe verdadeiro, mas irrelevante para este e-mail."
        opt-software-interno: "Não muda a resposta: a ferramenta da recepção é assunto interno — o cliente não precisa saber."
      onSuccess: "Isso! Contexto suficiente = o que muda a resposta: o fato novo (horário) e para quem se escreve (clientes). Não tudo sobre a clínica."
    storage:
      policy: structured_only
    hints:
      - "Para cada informação, pergunte: se ela mudasse, o e-mail mudaria?"
      - "Duas informações fazem o conteúdo do aviso mudar; três são detalhes verdadeiros, mas irrelevantes aqui."
      - "O fato novo da situação é uma; quem precisa remarcar consultas é outra."

  - id: l05-a3
    type: output_comparison
    skillId: pedir
    instruction: "O mesmo aviso foi pedido à IA duas vezes — uma com o pedido genérico, outra com os campos preenchidos. Compare as duas respostas e escolha a que está pronta para usar."
    data:
      scenario: "O aviso da mudança de horário da clínica odontológica foi pedido à IA de dois jeitos. A resposta A veio de um pedido com os quatro campos preenchidos (objetivo, contexto, público e formato, como no primeiro exercício desta lição). A resposta B veio do pedido \"Escreve um e-mail pra mim.\""
      outputs:
        - id: out-a
          text: "Assunto: Novo horário de atendimento da clínica

Olá! A partir do próximo mês, nossa clínica vai atender de segunda a sábado, das 8h às 18h. Enviamos este aviso com antecedência para você organizar suas consultas. Se quiser remarcar o seu horário, é só responder este e-mail ou ligar para a recepção.

Um abraço,
Equipe da clínica"
        - id: out-b
          text: "Prezado(a) cliente,

Esperamos que esta mensagem o(a) encontre bem. Informamos que houve uma atualização em nossos serviços e que novas informações estão disponíveis. Permanecemos à disposição para quaisquer esclarecimentos.

Atenciosamente,
A gerência"
      criteria:
        - id: c-responde-a-situacao-real
          text: "Responde à situação real: a clínica, a mudança de horário e o próximo mês"
        - id: c-pronta-para-usar
          text: "Está pronta para usar: pode ser enviada aos clientes sem edições nem explicações adicionais"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-responde-a-situacao-real, c-pronta-para-usar]
    feedback:
      onFailure: "A resposta A está pronta para usar porque o pedido que a gerou trouxe os campos: objetivo (avisar da mudança), contexto (clínica, novo horário, próximo mês), público (clientes, tom cordial) e formato (e-mail curto com assunto). A B é educada, mas não diz nada — quem lê não fica sabendo nem o que mudou."
      perCheck:
        betterOutputId: "A resposta A sai de um pedido com os campos preenchidos; a B sai de \"Escreve um e-mail pra mim.\" — e genérico no pedido, genérico na resposta."
        c-responde-a-situacao-real: "Faltou este critério: a resposta precisa falar da clínica, da mudança de horário e do próximo mês — os fatos que o pedido preenchido carregava."
        c-pronta-para-usar: "Faltou este critério: a resposta certa pode ser enviada sem editar nada — a B precisaria ser reescrita antes de ir aos clientes."
      onSuccess: "Exato! Campos preenchidos no pedido = resposta que resolve a situação real sem retrabalho. É o efeito do contexto em ação."
    storage:
      policy: structured_only
    hints:
      - "Qual das duas você poderia encaminhar aos clientes agora, sem editar nada?"
      - "Procure os fatos da situação na resposta: clínica, mudança de horário, próximo mês."
      - "A resposta A traz os fatos que vieram do pedido preenchido; a B usa só cortesia genérica."

rubric:
  id: l05-rubric
  criteria:
    - id: r-campos-especificos
      text: "Preenche os quatro campos com informação específica da situação, não com repetição do pedido genérico."
      weight: 1
    - id: r-contexto-suficiente
      text: "O contexto informado muda o conteúdo da resposta (tipo de negócio, fato novo, prazo)."
      weight: 1
    - id: r-pedido-utilizavel
      text: "O pedido final, montado a partir dos campos, pode ser enviado a uma IA sem explicação adicional."
      weight: 1

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [l05-a1, l05-a2, l05-a3]
```
