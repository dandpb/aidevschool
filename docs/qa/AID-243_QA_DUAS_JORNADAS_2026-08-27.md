# AID-243 — QA independente do candidato das duas jornadas

**Data:** 2026-08-27 UTC  
**Disposição:** **BLOCKED — candidato e handoff de AID-242 ainda indisponíveis**

## Resultado

A validação executável não foi iniciada porque o gate explícito do issue não está satisfeito.
AID-242 permanece `in_progress` e, na consulta de 2026-08-27, não possuía comentário, work product,
permalink imutável, hashes do artefato, metadados de rollback ou comandos mínimos de handoff.
Sem essa identidade, qualquer teste local ou contra candidatos históricos validaria outro artefato e
não poderia sustentar GO/NO-GO para AID-243.

Classificação: bloqueio de release/handoff, não defeito de produto observado. Nenhuma jornada foi
executada e nenhuma afirmação de readiness ou mastery é feita.

## Charter preparado para o desbloqueio

1. Confirmar identidade imutável do host, hashes e rollback antes de abrir o navegador.
2. Em contexto Chromium limpo, percorrer onboarding e selecionar separadamente `IA Prática` e
   `Trilha Dev`.
3. Em cada jornada, provar primeira atividade, tentativa, feedback, retry, conclusão local e retomada.
4. Confirmar recuperação de rota e erro visível; repetir o caminho crítico em viewport mobile e com
   `prefers-reduced-motion`.
5. Inspecionar acessibilidade essencial (teclado, foco, nomes acessíveis), console/rede e analytics;
   analytics não pode conter respostas de lição nem texto livre sensível.
6. Conferir limites de evidência: conclusão local, verificação e mastery distintos; nenhuma escrita no
   learner canônico; produtor e verificador independentes.

## Evidência e ambiente

- Repositório e `engines/codexdojo-os-prototype/AGENTS.md` lidos antes da triagem.
- API Paperclip: AID-242 retornou `status=in_progress`, `workProducts=[]` e comentários `[]`.
- AID-243 declara explicitamente o desbloqueio por URL/hash e handoff de AID-242.
- Checkout compartilhado contém mudanças concorrentes não identificáveis como candidato; elas foram
  preservadas e não foram usadas como substituto do artefato imutável.
- Nenhum arquivo de `learner/` ou `.mavis/` foi alterado por esta QA.

## Owner e critério de desbloqueio

**Owner:** Founding Product Engineer, responsável por AID-242.

Para desbloquear: concluir AID-242 e publicar no thread o permalink imutável do candidato integrado,
hashes verificáveis do host e ativos das duas jornadas, revisão/source revision, metadados de rollback
e comandos mínimos. Uma nova execução de QA deve partir exclusivamente dessa identidade.

