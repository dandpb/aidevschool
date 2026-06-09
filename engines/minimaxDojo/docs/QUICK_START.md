# 🚀 Quick Start — minimaxDojo

> **3 passos para começar.** Tempo total: ~5 min de setup + 30 min do primeiro ciclo.

---

## Passo 1 — Configure o Aluno (2 min)

Edite [`config/learner.yaml`](../config/learner.yaml):

```yaml
foco:
  linguagem: "Python"        # ⟪LINGUAGEM_FOCO⟫
  ...

perfil_pedagogico:
  tempo_semanal: 5h          # ⟪TEMPO_SEMANAL⟫
  ...
```

> ⚠️ **Não comece sem definir `linguagem`.** O PROMĘTOR precisa saber qual test runner usar.

---

## Passo 2 — Carregue o Sistema no MiniMax (1 min)

Abra o MiniMax Agent Team e cole **na ordem**:

1. [`prompts/bootstrap/00_system.md`](../prompts/bootstrap/00_system.md) — system prompt
2. [`prompts/bootstrap/01_first_cycle.md`](../prompts/bootstrap/01_first_cycle.md) — primeiro ciclo

> O Maestro vai pedir `LINGUAGEM_FOCO` e `TEMPO_SEMANAL` se não estiverem em `config/learner.yaml`.

---

## Passo 3 — Responda e Siga (10 min de setup + 30 min do ciclo)

O Maestro vai:

1. **Perguntar** `LINGUAGEM_FOCO` e `TEMPO_SEMANAL` (se não configurado)
2. **Despachar SONDA** (diagnóstico curto 10–15 min) — tarefas interativas no chat
3. **Despachar CARTÓGRAFO** (trilha personalizada, 5 min) — apenas geração, sem interação
4. **Publicar U-001** (`enunciado.md`) — sua vez de **lutar**
5. **Esperar submissão** — você envia código + testes + dúvida
6. **Despachar PROMĘTOR + CRÍTICO** (background, 5–10 min)
7. **Notificar com cycle_report.md** (Lightning)
8. **Atualizar whiteboard** (Mnemosyne)
9. **Disparar pergunta de reflexão** (Ouroboros)

---

## O que esperar na primeira sessão

```
[FRONT OFFICE]
Você: "começar"
Maestro: "Qual linguagem foco? Qual tempo semanal?"

Você: "TypeScript, 5h"
Maestro: "Config gravado. Despachando SONDA..."

[BACK OFFICE — Pro, sessão fresca]
SONDA: "T1: escreva 1 teste em TS para esta função..."
[interage por 10–15 min]

[FRONT OFFICE]
Maestro: "Diagnóstico gravado em `whiteboard/diagnostics/sonde-001.md`.
        Cartógrafo gerou trilha. U-001 publicada.
        Tempo esperado: 30 min. Quando terminar, me avise com código + dúvida."

[Você: codifica, talvez consulta Sócrates 1–2×]

[BACK OFFICE]
Maestro: "Submissão recebida. Despachando PROMĘTOR + CRÍTICO..."

[5–10 min]

[FRONT OFFICE]
Maestro: "📋 Cycle Report — U-001
        [7 seções: ESTADO, FEITO, REVISÃO, APRENDIZADO, MEMÓRIA, PRÓXIMO, REFLEXÃO]"
```

---

## Comandos Úteis (após a primeira sessão)

| Quando | Comente (chat) |
|--------|----------------|
| Começar ciclo | "começar" ou "próxima unidade" |
| Tirar dúvida | "tô travado em X" (Sócrates vai te guiar com perguntas) |
| Rever conteúdo | "revisão do dia" (MNEME) |
| Pedir auditoria | "auditoria semanal" (Sêneca) |
| Ver estado | "status" (Maestro lê learner_profile + trail) |
| Diagnosticar | "diagnóstico" (re-roda SONDA) |
| Pular unidade | "pular para U-NNN" (Sêneca abre SLA) |

---

## Onde está cada coisa

| Pergunta | Resposta |
|----------|----------|
| Onde está meu estado? | [`whiteboard/learner_profile.md`](../whiteboard/learner_profile.md) |
| Onde está a trilha? | [`whiteboard/trail.md`](../whiteboard/trail.md) |
| Onde está a unidade atual? | `whiteboard/handoffs/U-NNN.enunciado.md` |
| Onde está o ciclo anterior? | `whiteboard/handoffs/U-NNN.ciclo-NN.report.md` |
| Onde estão as Skills? | `whiteboard/skills/` |
| Onde estão as pegadinhas? | `whiteboard/pegadinhas/` (criado após 1ª ocorrência) |
| Onde estão os ADRs? | `whiteboard/decisions/` |
| Onde está o event log? | `whiteboard/event_log/` |
| Onde estão os prompts? | [`prompts/`](../prompts/) |
| Onde está a arquitetura? | [`docs/00_architecture.md`](../docs/00_architecture.md) |

---

## Quando as coisas dão errado

| Sintoma | O que fazer |
|---------|-------------|
| Maestro não responde | veja se há SLA aberto (cycle_report seção 6) |
| Código não roda no PROMĘTOR | peça retry ao Maestro; ele acorda Mestre-Conteúdo |
| Você quer solução pronta | Sócrates vai te guiar com perguntas — **não desista** |
| AIDI muito alto (> 0.75) | Sêneca suspende modo rápido; leia a pergunta de reflexão |
| Trilha travada | Sêneca tem SLA aberto; responda ou espere default conservador |
| Quer mudar linguagem | Não muda; Sêneca abre SLA, default = "não muda" |

---

## Anti-padrões (NÃO faça)

- ❌ Não peça a solução ao Sócrates (ele vai te fazer lutar, é proposital)
- ❌ Não mude a trilha "porque quero" (Sêneca precisa aprovar)
- ❌ Não trate o cycle_report como "ok, próximo" sem ler a pergunta de reflexão
- ❌ Não use IA para gerar a resposta da reflexão (Ouroboros mede; é anti-AIDI)
- ❌ Não pule o portão empírico (Maestro não avança sem PROMĘTOR)

---

*Ver [`README.md`](../README.md) para a visão geral. Ver [`docs/`](../docs/) para a arquitetura completa.*
