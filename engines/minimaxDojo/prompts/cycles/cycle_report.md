# Cycle Report — Template

> **O Maestro preenche este template ao fim de cada ciclo.** É a única "resposta ao aluno" (Lightning).

---

```markdown
# 📋 Cycle Report — ⟨U-NNN⟩ ⟨título⟩

> **Data:** ⟨data⟩
> **Ciclo:** N de ~36 (estimativa)
> **Linguagem foco:** ⟨LINGUAGEM_FOCO⟩

---

## 1. ESTADO

| Campo | Valor |
|-------|-------|
| Unidade | U-NNN — ⟨título⟩ |
| Estado da máquina | APRESENTANDO / PRATICANDO / AVALIANDO / **DOMINADO** |
| Retries usados | 0–3 |
| Tempo gasto | ⟨X⟩ min (esperado ⟨Y⟩ min) |

**Próxima unidade desbloqueada:** U-NNN+1

---

## 2. O QUE FIZEMOS

### Conteúdo
⟪1 parágrafo: o que foi ensinado, em qual estilo (faded/parsons/projeto)⟫

### Exercícios
- ⟨E-1⟩: ⟨descrição curta⟩ (1 linha)
- ⟨E-2⟩: ⟨descrição curta⟩
- ...

### VEREDICTO do portão empírico

| Critério | Threshold | Medido | Status |
|----------|-----------|--------|--------|
| mutation_score | ≥ 0.65 | ⟨X⟩ | ✅/❌ |
| cobertura_núcleo | ≥ 0.80 | ⟨X⟩ | ✅/❌ |
| suíte_verde | 100% | ⟨X⟩ | ✅/❌ |
| lints | 0 erros | ⟨X⟩ | ✅/❌ |

**Veredito:** ✅ **PASS** | ❌ **FAIL** (com gaps)

⟪Se PASS: link para `verdict.md`; se FAIL: lista de gaps que precisam de retry⟫

---

## 3. REVISÃO (achados do Crítico)

| ID | Severidade | Local | PORQUÊ | Como revisar |
|----|------------|-------|--------|---------------|
| F-01 | major | ⟨arquivo:linha⟩ | ⟨princípio⟩ | ⟨pergunta socrática⟩ |
| F-02 | minor | ⟨arquivo:linha⟩ | ⟨princípio⟩ | ⟨pergunta socrática⟩ |
| F-03 | nit | ⟨arquivo:linha⟩ | ⟨princípio⟩ | ⟨pergunta socrática⟩ |

### Avaliação da revisão do aluno (se houve)
- Achados reais: ⟨X⟩ / ⟨total⟩
- PORQUÊ presente: ⟨Y⟩ / ⟨total⟩
- Citações de princípio: ⟨Z⟩ / ⟨total⟩

⟪Crítico recomenda:⟫
- ✅ aprovado
- ⚠️ aprovado_com_nits (resolver no próximo ciclo)
- ❌ reprovado_com_refactor (acordar Mestre para variação)
- 🔁 pedir_revisao_aluno (aluno fraco em revisão)

### ADR-pedido (se houver)
⟪1 ADR-pedido para o aluno escrever no formato MADR⟫

---

## 4. APRENDIZADO

### Posição na curva
- Velocidade: ⟨X⟩ min vs ⟨Y⟩ esperado (Δ = ⟨Z⟩)
- Acurácia 1ª tentativa: ⟨X⟩%
- Autonomia: ⟨X⟩% (consultas Sócrates: ⟨N⟩)
- Reflexão score: ⟨X⟩/5

### Dreyfus × Bloom (atualização)

| Conceito | Dreyfus | Bloom |
|----------|---------|-------|
| tdd | ⟨...⟩ | ⟨...⟩ |
| ⟨novo⟩ | ⟨...⟩ | ⟨...⟩ |

⟪Mudou de ⟨anterior⟩ para ⟨atual⟩ no conceito ⟨X⟩⟫

### ai_dependency_index (AIDI)
- Atual: ⟨X⟩ (tendência: ↗/↘/→)
- Faixa: ⟨saudável ⟨0.30⟩ / alerta_amarelo ⟨0.60⟩ / alerta_vermelho ⟨0.75⟩⟩

---

## 5. MEMÓRIA

### Novas pegadinhas (registradas)
- ⟨pegadinha-1⟩: ⟨descrição⟩ (recorrência: ⟨N⟩)
- ⟨pegadinha-2⟩: ⟨descrição⟩ (recorrência: ⟨N⟩)

### Skills candidatas (PRs abertas)
- ⟨SKILL-NNN⟩: ⟨título⟩ (status: `draft` | `review` | `versioned`)

⟪Se Skill foi PROMOVIDA neste ciclo:⟫
- 🎉 SKILL-NNN agora é `promoted` (entra no system prompt do agente)

---

## 6. PRÓXIMO PASSO

### Próxima unidade desbloqueada
⟪U-NNN+1 — ⟨título⟩⟫ (pré-req: ⟨U-NNN dominada⟩)

### Revisões espaçadas agendadas (Mneme)
- ⟨data⟩: ⟨unidade⟩
- ⟨data⟩: ⟨unidade⟩
- ⟨data⟩: ⟨pegadinha⟩

### SLAs abertos (Sêneca) — se houver

> ⚠️ **PAUSA ABERTA** — SLA-2025-XX-XX-NN
> Decisão: ⟨...⟩
> Opções:
>   a) ⟨opção⟩
>   b) ⟨opção⟩ (default conservador)
>   c) ⟨opção⟩
> Você pode responder antes de ⟨data-expira⟩.
> Se não responder, Sêneca aplica (b) automaticamente.

---

## 7. PERGUNTA DE REFLEXÃO

> ⟨1 pergunta que conecta a unidade atual a um conceito mais amplo OU a uma pegadinha pessoal do aluno. Não genérica.⟫

**Formato esperado da resposta:**
- 3–5 frases
- Conexão com conceito OU pegadinha pessoal
- (opcional) generalização para outro domínio

**Quando responder:** antes do próximo ciclo (Maestro vai medir a qualidade).
```

---

## NOTAS PARA O MAESTRO

1. **Seja conciso.** O aluno quer **decisão + evidência**, não narrativa.
2. **Sempre 7 seções**, mesmo que uma seja "nenhuma" (ex.: "SLAs abertos: nenhum").
3. **Pergunta de reflexão** é obrigatória. Sem ela, ciclo incompleto.
4. **Não mencione** a infraestrutura interna (sub-agentes, Pro vs Lightning, etc.) — é barulho para o aluno.
5. **Mostre evidência executável**, não opinião (ex.: comando + saída, não "parece bom").

---

*Ver [`docs/02_state_machine.md`](../../../docs/02_state_machine.md) § 4 (TaskState).*
