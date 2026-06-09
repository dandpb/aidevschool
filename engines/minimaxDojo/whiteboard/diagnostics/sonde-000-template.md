---
aluno_id: aluno-001
timestamp: 2025-XX-XX
agente: sonda
unit_atual: U-001
linguagem_foco: ""        # preenchido após SONDAR
---

# Diagnóstico SONDA — Template Cold-Start

> **Este é o template que SONDA vai preencher após rodar 4–5 tarefas curtas (10–15 min) com o aluno.** Não é o diagnóstico real — é o esqueleto.

## Tarefas Aplicadas (após SONDA)

- **T1 — TDD baby steps** (3 min): kata pequeno em ⟨LINGUAGEM_FOCO⟫
- **T2 — Leitura de código** (3 min): trecho com 1 smell visível
- **T3 — Mutation intuitivo** (4 min): "se eu mudar X, seu teste pega?"
- **T4 — SOLID quick check** (3 min): qual princípio está ferido?
- **T5 — Code review** (2 min, opcional): achado com PORQUÊ em 1 linha

## Resultados por Conceito (após SONDA)

| Conceito | Dreyfus | Bloom | Evidência |
|----------|---------|-------|-----------|
| TDD | ? | ? | ⟨T1⟩ |
| Leitura de código | ? | ? | ⟨T2⟩ |
| Mutation testing | ? | ? | ⟨T3⟩ |
| SOLID | ? | ? | ⟨T4⟩ |
| Code review | ? | ? | ⟨T5⟩ |

## Dreyfus Global

⟪preencher⟫

## Bloom Global

⟪preencher⟫

## Velocidade (após SONDA)

- T1: ⟨X⟩ min
- T2: ⟨X⟩ min
- T3: ⟨X⟩ min
- T4: ⟨X⟩ min

## Acurácia

- 1ª tentativa correta: ⟨X⟩%
- Retries: ⟨N⟩

## Autonomia

- Completou sem ajuda: ⟨X⟩%
- Consultas: ⟨N⟩

## 3–5 LACUNAS PONTUAIS

1. ⟨lacuna 1⟩
2. ⟨lacuna 2⟩
3. ⟨lacuna 3⟩
4. (opcional) ⟨lacuna 4⟩
5. (opcional) ⟨lacuna 5⟩

## Recomendação ao Maestro

**Primeira lacuna comprovada:** ⟨...⟩
**Próxima unidade sugerida:** U-001 (ou outra, se lacuna apontar diferente)

### O que NÃO recomendo
- ❌ não começar por "fundação"
- ❌ não pular unidades
- ❌ não introduzir X antes de Y

---

*Ver [`prompts/per_agent/sonda.md`](../../prompts/per_agent/sonda.md) para o system prompt.*
