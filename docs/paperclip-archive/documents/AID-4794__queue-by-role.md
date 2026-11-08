<!-- issue: AID-4794 | key: queue-by-role | doc_id: 2e0d5f76-fc09-4e89-b649-2540b3fcaeaf | updated: 2026-10-15 15:25:13.037+00 -->

# queue-by-role

(AID-4794)

# Fila por papel — v2 (rev 2 · 2026-10-15 ~15:30Z) — carrier canônico: AID-4794

**Provenance:** sucessor canônico do doc `queue-by-role` rev 22 da AID-3518, agora **tombstone histórico** (decisão CEO opção b @ AID-4792 01:52:45Z, após 403 assignee-based registrado 1º-mão pelo SM e pelo CEO). Conteúdo-base: doc `queue-by-role-reconciliation-20261015` (AID-4791, rev 1 `aff4ced5`). **Manutenção: atualizações = novas revisions deste doc NESTA issue; não editar a AID-3518.**

**rev 2 (AID-4833 — ORDEM CEO, diretiva founder `2c13c7b1/B` @ AID-3317 15:12:59Z):** reconciliação com os recibos — **AID-4789 DECIDIDO** (card `210313d0` answered 14:15:53Z: retenção **(a) rolling 48h + 3 âncoras diárias**; done 14:19:13Z; backstop Oct-20 moot) · **AID-4830 CONCLUÍDO** (Storage aplicou live 14:21–14:26Z: 9 archives/5,76G purgados, 24 janela + 2 âncoras mantidas gzip-OK, df 70→75G, pass wired no tick 3039) · **AID-4832** (recibo série 15:04:48Z: decisão founder consumida, série 2/2, board 4.820). Snapshot de donos/runs refeito 1º-mão 15:19–15:22Z. Execução corrente da Storage preservada na AID-3039 (nenhuma escrita do SM).

**Snapshot 1º-mão (15:19–15:22Z):** board **4.823** distinct (+3 exato vs recibo AID-4832: 4833/4834/4835) · **open 49** (in_progress 12 · in_review 16 · backlog 10 · todo 5 · blocked 6) · PRs GitHub **35 open parked** (tip #681 upd Oct-14 20:46) · main `304456dd` imóvel (commit Oct-8; 0 merges desde Oct-11) · roster **24** (21 idle + 3 running: SM/QA/FPE) · disco **74G avail** (retenção ATIVA — sem re-cross <15G no horizonte com o pass no tick) · RA ativa board = 0 (recibo AID-4832 15:04Z; lanes checadas 15:2xZ sem RA nova).

**Regras vigentes (preservadas da rev 22):** concluded/cancelled nunca é next-ready; **sem próxima candidata aprovada é estado válido**; reviewer não revisa antes do artefato pronto; decisão ordinária do PO ≠ limites próprios de restart/credencial/acesso/deploy/dados reais; **revisão técnica ≠ autorização de merge/deploy**; checks antigos ≠ checks do head atual; identidade verdadeira no handoff; ASSIGNMENT nativo antes de wake (ator para na 1ª negativa; sem proxy/contorno).

## 1. Matriz canônica — 24/24 papéis (lido 1º-mão 15:19–15:22Z)

| Papel · agent · estado | Trabalho atual REAL (board 1º-mão) | Próxima candidata genuína / bloqueio | Aceite · Condição |
|---|---|---|---|
| CEO · `501cb456` · idle | standing 3307 (card-carrier, 17:30Z) + 3317 (standing/SLA, 16:05Z) + 4180 (sweep horário, 16:00Z) · **despachos diretiva founder `2c13c7b1` executados** (4833 SM + 4834 FPE + 4835 QA, children do standing, 15:18:39Z) · 3007/3702 ir (aprovações founder/produto) · 3976 blocked (janela restart, blockedBy 3990) · 2931 ip (R2 produção) · 2639 ip (rotação CI secret, prompt Nov-3) · 1222 todo (B6 data-gated) · 3275/4466 bk · 4301/4347/4358 ir (productivity reviews) | retorno da diretiva `2c13c7b1` no standing 3317 (despachos/evidências/bloqueios) + decisões founder pendentes (3007 Traefik · 3976 restart via 3990 · 909 outreach · 2928 Cloudflare) + roteamento reviewer==owner (canal único #557) | gates = founder/PO; sem auto-execução |
| SM · `ce84c27f` · running | **AID-4833 — esta reconciliação (doc rev 2)** · 4236 ir (registro A2 governança) · carrier AID-4794 (done; rev 1 @ 02:00Z → rev 2 agora) · cadência de auditoria per-dispatch (última **#638/AID-4831 CONFORME, 0 violações críticas**, done 14:35:52Z) | fechar 4833 com recibo → `done`; revisions futuras = reposição contínua aqui | 24/24 sem invenção; auditoria sem repetição |
| QA Lead · `ca6a3f95` · running | **4835 ip — ORDEM CEO `2c13c7b1/C-2`: veredito INDEPENDENTE first-hand PRs #675–#681 (+ #667), lane própria/countersign** | candidata #625-F3 **agora despachada**: veredito first-hand dos PRs (par à 4834/FPE, lanes independentes) | reviewer ≠ produtor; veredito ANTES de qualquer merge |
| V&E · `616b5f9b` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| DRE · `7b5e31ea` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| P&CI · `1e9be0fa` · idle | 3990 ip (execução janela restart: tick 15:30Z; decisão founder restart PID 18 pendente nos asks `406ab37d`/`8c2a00ea`) · 3783 ip (guard race, Oct-16 05:15Z) · 2889 ip (monitor zai-beta-tunnel, 15:57Z) · 2600/3261/3278/3474 ir | execução 3990 condicionada à janela founder (3976); demais = decisões board/upstream #212 | nunca auto-dispatch |
| EHE · `9b6acd48` · idle | 3522 ir (plano pronto p/ decisão) · 2775 bk (plan_is_approved fail-open) | execução do plano 3522 requer **autorização específica** | decisão/permissão PO/CEO |
| ESE · `ae071215` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| Storage · `92d055bc` · idle | 3039 ip (sweep horário, tick 16:05Z; **pass de retenção AID-4830 wired no tick** — WAKE-PROTOCOL §Backup retention policy) · 4683 blocked (slot backup truncado — CEO timing + PRE execução; steady-state ~17G↔~32G depende do retorno do scheduler horário) · 2928 blocked (cutover R2 — founder Cloudflare + CEO 2931) | continuidade do sweep; **retenção JÁ aplicada** (14:21–14:26Z: 9 archives/5,76G; 24 janela + 2 âncoras mantidas gzip-OK; df 70→75G) | RPO monitorado; sem instalações |
| PDE · `0944e5c6` · idle | — (assignee predecessor da AID-3518 tombstone) | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| FPE · `fa8130d5` · running | **4834 ip — ORDEM CEO `2c13c7b1/C-1`: veredito first-hand PRs #675–#681 (+ #667 proveniência; #679/#681 escolher variante única); SEM merge** · 3665 ir (SPEC contexto aprendiz) · 3772 blocked (DEFECT F1 L03, PO-held) | veredito first-hand + registro `intent/` do produtor ANTES de qualquer merge (com QA) | merge/push/deploy = **gate PO**; sem contorno |
| PRE · `8c58cf6e` · idle | 2757 bk (defect TOCTOU factory) | executar restart na janela autorizada quando CEO aprovar timing (4683/3990) | dependência founder |
| CCE · `93e26ea9` · idle | 3700 ir (copy L11/F1 QA-ROUND) · 3710 blocked (DEFECT F1 ALTA mastery forjável) | — blocked founder-gated/PO; aguarda despacho | — |
| CD · `f2b1e95d` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| UX · `0bfa47c1` · idle | 641 ir (teste moderado O1 n=5–8) · 3669 todo (práticas disponíveis) | 641/3669 aguardam dispatch — sem auto | — |
| SysD · `bb7b8143` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| G&R · `b106db1d` · idle | 909 blocked (ORDEM 1 funil O1; card founder pendente desde 12:05Z Oct-13) | resposta founder: (a) executar outreach pack OU (b) re-derivação/encerramento S1 | sem outreach não autorizado |
| GWE · `5cf7ace9` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| CPE · `ac0ec540` · idle | 3457 ir (mapear currículo/progresso) | — aguarda dispatch PO/CEO | — |
| FSE · `e761b40c` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| LAnE · `803ca017` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| LA&A · `ca12fdb7` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| LAE · `d0dfd2b7` · idle | — | — **sem próxima entrega candidata** (aguarda dispatch PO/CEO) | — |
| LEE · `98ed5775` · idle | 3731 ir (IMPL L07-F2 guarda once-per-first-completion) · 3660 bk (pedido estruturado no player) | — 3731 em review; aguarda reviewer/PO | — |

**Papéis com trabalho real aberto: 13 · sem próxima entrega candidata: 11** (11 idle) — estado válido, sem invenção.

## 2. Fila sem dono (asg=None) — decisão PO/CEO, nada é next-ready por esta fila
3704 todo · 3705 todo (deep-link /escola/ pós-QA-ROUND) · 3740 todo (registro S5-RACE L07-F2) · 3056 bk (countersign-gate fence) · 3708 bk (copy drift F1) · 3722 bk (provenance-at-open, 6ª) · 3726 bk (re-spawn productivity review) · 3738 bk (sweep VEE coerção hasOwnProperty)

## 3. PRs GitHub — 35 open parked
- Fila recente **#675–#681** (accessibility/perf Palette+Bolt; tip #681 upd Oct-14 20:46) + #673 DRAFT consolidação — todos parked. Heads verificados 15:2xZ: #679 `62e00ce4` · #681 `8b5eb058` · #667 `c981caff` (todos author `dandpb`).
- **Vereditos first-hand DESPACHADOS 15:18:39Z (diretiva founder `2c13c7b1`):** 4834 (FPE, com guard **#679/#681 patch de produto duplicado → variante única + proveniência real do produtor**) + 4835 (QA Lead, independente). **A diretiva NÃO autoriza merge/deploy.**
- **Pré-merge binding (AID-2219 §PRs automatizados):** veredito first-hand FPE/QA + registro `intent/` do produtor ANTES de qualquer merge. **0 merges; main `304456dd` imóvel desde Oct-11.**
- Ressalvas permanentes preservadas da rev 22: closures PRs #625/#632–#638 mantidos; WebKit NOT RUN; ausência de aceite iPad (AID-3587 = limitação verificada).
- Claims-red main tip standing (CEO, AID-2950/F1).

## 4. Deltas relevantes vs rev 22 (Oct-03 → Oct-15) e vs rev 1 (02:15Z → 15:2xZ)
- **vs rev 22:** main `ae61479e` → `304456dd` (0 merges desde Oct-11) · candidato C0/rc-qa-c0-r4 ARCHIVED sem merge · emergência disk resolvida pelo founder 23:36:46Z Oct-14 (purge /tmp 27G + 68 backups 38,5G; AID-4785 done) · RA `2d5013fa` resolvida (#625-1) — board RA ativa = 0 · restart do board NÃO executado — famílias flap/race/scheduler-wedge(4683)/fresh-read(3975/3976) seguem pendentes de restart (3990 vivo) · spawn-board: padrão 4508–4832, supersede same-cycle 117ª (4832: 4m42s).
- **rev 1 → rev 2 (este revision):** founder respondeu card `210313d0` 14:15:53Z — retenção **(a)** (AID-4789 done 14:19:13Z; backstop Oct-20 moot) · **AID-4830 aplicou live** 14:21–14:26Z (9 archives/5,76G; df 70→75G; wired no tick 3039; supersedes tiers AID-2950 para o set vivo) · auditoria SDLC **#638/AID-4831 CONFORME 0 violações críticas** (done 14:35:52Z) · série Desbloqueio: 117ª same-cycle (AID-4832 done 15:04:48Z; série 2/2) · **diretiva founder `2c13c7b1` 15:12:59Z → CEO criou 4833/4834/4835 15:18:39Z** (children do standing 3317) · board 4.782 → 4.823 distinct (cadeia exata: +4830/4831/4832 → +4833/4834/4835) · disco 74G @ 15:2xZ com retenção ATIVA · main e PRs imóveis.

## 5. Follow-ups de dono (sem invenção)
- **founder (via CEO):** restart board 3976/3990 · resposta 909 S1 (a/b) · 2928 Cloudflare (~10min) · gates PO-held 3710/3772 · ratificação Board post-hoc SIGTERM
- **CEO:** retorno da diretiva `2c13c7b1` no standing 3317 (despachos legítimos + evidências de execução real + bloqueios exatos) · timing 4683 + execução PRE · roteamento reviewer==owner (canal #557) · claims-red standing
- **FPE + QA Lead:** vereditos PRs #675–#681 — **DESPACHADOS** (4834/4835) com guards de proveniência #679/#681/#667; SEM merge por esta diretiva
- **watchdog semanal fila founder:** vermelho (próximo run 2026-10-19, carrier AID-1714)

Provenance: agent=sdlc-scrum-master task=AID-4833 run=64f569de-9561-4adf-9a38-876d7e855a3c
