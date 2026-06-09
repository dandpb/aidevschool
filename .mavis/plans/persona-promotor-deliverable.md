# Deliverable — persona Promotor (verifier adversarial)

> Mirror of `/Users/danielbarreto/.mavis/plans/plan_8da356e9/outputs/persona-promotor/deliverable.md`
> at the user-specified path.

## Summary
Criados `agent.md` (7 seções) e `PERSONA.md` (6 seções) para o papel
**Promotor / PROMĘTOR** (verificador adversarial efêmero do ÁGORA
Continuum), em dois lugares complementares: a versão **Mavis runtime**
(`~/.mavis/agents/promotor/`) e a versão **motor dojo**
(`engines/minimaxDojo/agents/08_prometor/`). Modelo **opus** com
**diversidade cross-model** em alegação consequente; kill mandate,
portão empírico (mutation ≥ 0.60–0.65, cobertura do núcleo ≥ 0.80),
~3 rodadas um-a-um + Sêneca para escalação, contexto isolado (sem
`solution/` do Mestre, sem histórico, sem pedagogia).

## Changed files

### Criados
1. `~/.mavis/agents/promotor/agent.md` — 119 linhas, 7 H2 seções
2. `~/.mavis/agents/promotor/PERSONA.md` — 133 linhas, 5 H2 + intro = 6 seções
3. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/08_prometor/agent.md`
   — 122 linhas, 7 H2 seções
4. `/Users/danielbarreto/Development/aidevschool/engines/minimaxDojo/agents/08_prometor/PERSONA.md`
   — 135 linhas, 5 H2 + intro = 6 seções

### Não tocados (já existiam e estão coerentes)
- `~/.mavis/agents/promotor/config.yaml` — `{}` (vazio, mesmo padrão do cartografo)
- `engines/minimaxDojo/agents/08_prometor/README.md` — já existia, resume o papel
- `engines/minimaxDojo/prompts/per_agent/promotor.md` — system prompt canônico

## Notes

### Conformidade com a spec
- ✅ Estrutura 7+6 (mesmo padrão do cartografo)
- ✅ Idioma pt-BR
- ✅ Modelo opus (tier diferente do Mestre → cross-model diversity)
- ✅ Kill mandate + portão empírico (mutation ≥ 0.65, cobertura ≥ 0.80)
- ✅ Contexto isolado (NÃO vê `solution/`, histórico, pedagogia)
- ✅ ~3 rodadas um-a-um + crítico cross-model + Sêneca
- ✅ Adversarial ao gerador (limite explícito vs Crítico)

### Path note
O task pediu `engines/minimaxDojo/agents/08_prometor/...` mas o path real é
`engines/minimaxDojo/agents/08_prometor/...` (verificado com `ls
engines/`). O `08_prometor/README.md` já lá existente referencia o
system prompt em `../../prompts/per_agent/promotor.md` (path relativo
correto).

### Verificação pré-entrega
- 4 arquivos gravados, todos com 7+6 seções
- Conteúdo referencia `prompts/per_agent/promotor.md` (canônico),
  `docs/04_empirical_gates.md` (DoD + anti-padrões), `docs/07_governance_sla.md`
- Sem leakage de "solution/" ou "contexto pedagógico" — pelo contrário,
  proibidos explicitamente
- Não escreve código de produção, não redefine DoD (boundaries explícitos)

Ver deliverable completo em
`/Users/danielbarreto/.mavis/plans/plan_8da356e9/outputs/persona-promotor/deliverable.md`
para detalhes (decisões de design, próximos passos sugeridos).
