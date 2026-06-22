---
description: Portão humano no loop (Sêneca) — abre um SLA 24h para uma decisão consequente (promover Skill, mudar pré-req, reprovar 3 retries, etc). Modo auto-escala para decisões reversíveis; pausa-checkpoint com SLA para a lista negra. Loga em event_log + sla_status.md.
argument-hint: "<tipo-de-decisao> [opção-recomendada]"
---

Decisões consequentes cobertas (lista negra do "auto" — todas com SLA 24h):
- `promover-skill <SKILL-NNN>` — versioned → promoted (requer ≥3 usos sem regressão)
- `mudar-prereq <U-NNN>` — alterar pré-requisito da trilha
- `reprovar-unidade <U-NNN>` — 3 retries esgotados
- `pular-unidade <U-NNN>` — avançar direto
- `adicionar-unidade <titulo>` — abrir PR para fila
- `mudar-linguagem <linguagem>` — reset parcial do trabalho
- `reprovar-3-retries <U-NNN>` — suspender trilha

SLA reduzido 4h (crítico): skill com regressão, bloqueio de produção, quebra de segurança (esta
última = imediato, sem SLA).

Modo de uso:
1. Dispare o subagent **`seneca`** (via Task) com a decisão e o contexto:
   - O que motivou (output do Maestro / Mnemosyne / Crítico / Galileu)
   - As opções consideradas (mínimo 2, com a conservadora marcada)
   - A recomendação do Maestro, se houver
2. Se $ARGUMENTS foi passado, é o tipo de decisão. Se houver um 2º argumento, é a opção recomendada.
3. Sêneca gera `sla_status.md` com a entrada do SLA, e o `cycle_report` da próxima sessão
   carrega a pergunta para o aprendiz.
4. SLA expira? Sêneca aplica o **default conservador** automaticamente e loga o motivo.

Re-leia `engines/minimaxDojo/prompts/per_agent/seneca.md` para a lista completa, opções
conservadoras default, e formato MADR de ADR.

Quando o `seneca` retornar:
- Se auto-escala: registre no `event_log` com `{"ev":"seneca.auto_escala","decisao":...}`.
- Se SLA aberto: apresente ao aprendiz a pergunta + opções + data de expiração. Não bloqueie
  o resto do fluxo — outras fases podem continuar em paralelo.
- Se escalação imediata (segurança, regressão de Skill, bloqueio de produção): PARE tudo e
  notifique o aprendiz em destaque.

Toda decisão — auto-escala, SLA, escalação — entra em `event_log`. Auditável é a regra.
