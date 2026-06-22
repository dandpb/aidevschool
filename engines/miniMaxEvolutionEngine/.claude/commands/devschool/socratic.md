---
description: Tutor socrático anti-dependência (guardrail). Dispara o subagent socrates para a unidade ativa. Exige a tentativa do aprendiz + ponto exato de confusão ANTES de qualquer hint. Use quando o aprendiz pedir dica em uma unidade ativa. Pipeline STAP (Checking→Correcting→Complementing→Segmenting), 15 consultas/dia, fading por Dreyfus.
argument-hint: "[pergunta-do-aprendiz opcional]"
---

Active unit + Dreyfus/Bloom:
!`cat learner/learning_state.yaml 2>/dev/null | grep -E "active_unit:|level:|dreyfus|bloom" || echo "(sem learning_state)"`

Dispare o subagent **`socrates`** (via Task) para a unidade ativa. Passe a ele:
- `active_unit.id` e `active_unit.title` de `learner/learning_state.yaml`
- O Dreyfus/Bloom atual de `learner/learner_profile.md`
- A `quota_hoje` (= 15 - consultas já gastas hoje; se a unidade não foi configurada, use 0)
- As `pegadinhas_recentes` de `learner/pitfalls.md` (top 3)
- A pergunta do aprendiz (se $ARGUMENTS foi passado), ou uma aberta se não

Re-leia `engines/minimaxDojo/prompts/per_agent/socrates.md` para as regras de STAP, calibração
por Dreyfus, e proibições explícitas antes de invocar.

Quando o `socrates` retornar:
- Apresente a **pergunta socrática** (Checking primeiro, **nunca** a solução) ao aprendiz.
- Se a quota acabou: "Sua cota de hoje acabou. Daqui a 24h ela reseta. Tenta mais 1 hora sozinho
  e me procure amanhã com a tentativa — mesmo que errada."
- Se o aprendiz travou 3 turnos no mesmo ponto E Dreyfus=novice: o socrates pode dar **1** nome
  de conceito (não a solução). Ex.: "O nome do padrão é **guard clause**. Procure."

Regra do gate: **nunca** entregue solução pronta na primeira resposta. O guardrail anti-dependência
é o que mantém o aprendizado real. Se você sentir vontade de escrever código aqui, **PARE** e
devolva uma pergunta.

O socrates não escreve em arquivos do projeto; apenas devolve a resposta. Log do evento vai pelo
próximo mnemosyne (compacção semanal).
