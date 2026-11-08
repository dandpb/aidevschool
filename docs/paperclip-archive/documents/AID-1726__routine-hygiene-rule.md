<!-- issue: AID-1726 | key: routine-hygiene-rule | doc_id: 18b896b1-64f6-40c8-a5c9-8299fb7d1dee | updated: 2026-09-13 12:45:50.652+00 -->

# Decisão CEO D2 (AID-1726) — spawn-por-hora mantido + regra de consolidação (routine c68a1d61 e congeneres)

(AID-1726)

# Decisão CEO — AID-1726 D2 (2026-09-13, 12:4xZ)

**Escopo:** escalada SM AID-1725 Registro #1 — routine `c68a1d61` ("Desbloqueio de proximas tarefas", cron `0 * * * *`, founder) spawna issue nova a cada hora para mandato permanente; duplicatas viravam zumbis `in_progress` (AID-1654/1665/1714 empilhados, sem supersessão aplicada).

## D1 — Consolidado (executado e verificado first-hand)
- AID-1654: comentário de supersessão `7fd2b72b` (pré-close) + `cancelled` @12:44:46Z. Monitor já sem check futuro.
- AID-1665: comentário de supersessão `eefeae24` (pré-close) + `cancelled` @12:45:11Z + monitor zerado; check 21:30Z (gate founder `cd35f433` pós-AID-1555, recibo AID-1666, fila blocked) **transferido** para o carrier.
- **Carrier único: AID-1714** (mesmo originId `c68a1d61`), monitor 16:05Z + re-arm 21:30Z, `recoveryPolicy: wake_owner` preservado (bug W4).

## D2 — Decisão: opção **(b)** manter spawn-por-hora + regra de consolidação explícita

**Verificação de plataforma (first-hand, código do servidor `@paperclipai/server` services/routines.js):** o dispatch de routine **não possui capacidade `resume:true`** — o dedupe (`findLiveExecutionIssue`) só casa issue aberta de mesmo originId+fingerprint que tenha um heartbeat run **vivo no momento do tick**; entre ticks horários nenhum run está vivo, então todo tick cria issue nova **independente** do `concurrencyPolicy` (`coalesce_if_active` vs `skip_if_active` mudam apenas o rótulo do run; o fallback de constraint única `issues_open_routine_execution_uq` referenciado no catch não existe no schema atual). Logo, a opção (a) literal não é implementável no build atual.

**Regra permanente (CEO side), vigência imediata:**
1. Exatamente **um carrier aberto por mandato de routine** (hoje AID-1714 para `c68a1d61`).
2. Todo novo spawn horário da mesma routine é **duplicata**: comentário de supersessão (pré-close; close mudo proibido) + `cancelled` apontando para o carrier.
3. Receipts (Registros) do mandato são postados **no carrier**; monitor do carrier re-armado pós-ação, sempre com `recoveryPolicy: wake_owner`.
4. Duties de monitor de carriers supersedidos devem ser transferidos para as notas do monitor do carrier **antes** do close (feito: 21:30Z da AID-1665 → AID-1714).
5. Espelha a regra transitória SM-side (AID-1725): uma âncora de registro por mandato; spawns intermediários sem Registro = duplicatas.

## Ligação com a diretiva v3 (AID-1607, Opção B, vigência 2026-09-13)
Esta regra operacionaliza o modelo de **instância-por-despacho** da v3 para spawns de routine e elimina a classe `successful_run_missing_state` no nascedouro (nenhuma issue de routine permanece aberta sem caminho vivo além do carrier com monitor). Registro da mudança de convenção citando esta issue: comentário em AID-1607 (12:4xZ).

## Revisão / override
- Se o Paperclip lançar dispatch `resume`/wake-on-anchor para routines, revisitar para adotar (a).
- O founder pode pausar a routine ou alterar o cron a qualquer momento; até lá, esta regra governa o lado CEO.