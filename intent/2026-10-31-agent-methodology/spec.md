# Spec: metodologia para agentes do AIDevSchool

Change-id: 2026-10-31-agent-methodology · From: intent.md · Status: draft

## Requirements

1. Pontos de entrada raiz referenciam orientação comum para papéis aplicáveis.
2. A orientação atribui e fixa as fontes, adapta práticas de trabalho e
   explicita revisão em contexto novo e evidência proporcional à tarefa.
3. Gates, autorização, concorrência vigente e produtor distinto do verificador
   prevalecem; não há push direto, ativação de plugin ou mudança em runtime.
4. O manifesto mapeia a orientação. Documentar que distribuição e adoção não
   foram demonstradas e como verificar cada alvo.

## Design and policy

Orientação central em `docs/sdlc/agent-methodology.md`; referências em
`AGENTS.md`, `CLAUDE.md` e manifesto. Sem mudanças de código ou estado do
aprendiz. Fontes e revisões fixadas na orientação. Aplica `REVIEW.md` e o SDLC;
revisão independente e aceite deste diff continuam pendentes.

## Flagged concerns

Responsável pelo rollout: identificar máquinas e carregamento por runtime;
decidir instalação após descrição e confirmação específicas. A ausência de
licença explícita no ub-mode impede redistribuir seu texto integral nesta etapa.
