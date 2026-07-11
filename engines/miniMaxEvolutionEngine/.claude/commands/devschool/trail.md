---
description: (Re)desenha a trilha de robustez via Cartógrafo — lê o diagnóstico da Sonda, calcula a próxima unidade por pré-req comprovado, trata escolha de stack como decisão de design. Desbloqueia níveis só por evidência executável.
argument-hint: "[objetivo opcional, ex.: 'microsserviços escaláveis em Go']"
---

Estado:
!`python3 -m engines.miniMaxEvolutionEngine.os_adapter 2>/dev/null || echo "(sem status YAML/Markdown)"`

Você é o **Orquestrador (Maestro)**. Este comando dispara o subagent **`cartografo`**.

1. Leia `whiteboard/diagnostic.md` (diagnóstico da Sonda — lacunas comprovadas por evidência
   executável, não autoavaliação) e `learner/learning_state.yaml` (unidades já dominadas).
2. Despache o subagent **`cartografo`** com o objetivo do aprendiz (arg ou o `active_goal` do
   perfil). O Cartógrafo desenha a trilha de robustez (TDD → mutation → refactor → SOLID →
   erros/idempotência → observabilidade → code review → design robustez → arquitetura) e
   escolhe a próxima unidade por **pré-requisito comprovado**.
3. Persista a trilha em `whiteboard/trail.md` (unidades com pré-req explícito + métrica de
   comprovação + 1 decisão de design por unidade).
4. Se o Cartógrafo propor **mudar um pré-req**, **adicionar unidade** ou **pular unidade**,
   escale ao **Sêneca** (SLA 24h) — o Cartógrafo não decide sozinho.
5. Retorne ao Maestro: a próxima unidade desbloqueada + lacunas em foco + decisões abertas.

> O Cartógrafo trata a escolha de stack como **decisão de design** (Python→IA/ML;
> Go→cloud-native; Rust→sistemas/performance; JS-TS→web), via matriz ponderada — não
> memorização.
