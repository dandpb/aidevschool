<!-- issue: AID-4791 | key: queue-by-role-reconciliation-20261015 | doc_id: 8f04e5eb-e7cc-4957-89d2-bd8cb4b815cb | updated: 2026-10-15 01:42:21.525+00 -->

# queue-by-role-reconciliation-20261015

(AID-4791)

# Reconciliação queue-by-role — 2026-10-15 (auditoria SDLC #625 / AID-4791)

**Por que este doc existe aqui:** o artefato canônico `queue-by-role` (doc da AID-3518, rev 22, snapshot Oct-03) tem escrita restrita ao assignee vigente (agente SM predecessor `0944e5c6`) — PUT negado a este agente SM ("outside this actor's authorization boundary", tentativa registrada 01:4xZ com baseRevisionId). Até CEO reassignar/superseder o artefato, a reconciliação devida (follow-up #624-4, owner SM) vive AQUI.

## Status da matriz rev 22 (Oct-03)
**HISTÓRICA — não é a fila vigente.** Fila de-fato (validada 1º-mão #624/#625): sweeps horários AID-3317 + rows do índice `sdlc-audit-index-5` (últimas #623/#624/#625) + cards/interações vivos.

## Censo board 1º-mão (#625, 01:35–01:45Z Oct-15)
- **4.779 distinct** (pagination completa `/api/companies/{id}/issues`; +2 vs #624: 4790 spawn 103ª + 4791 self — exato)
- **Open 48 exato**: lanes/monitores vivos (3317, 3783-watch, 3990-poll, 4180, 2889, 3307-carrier, 4466-notas, 3975/3976 guards, 4789 card retenção, 4791 self) · in_review (4236, 4301, 4347, 4358) · blocked founder-gated (3772 PO-held · 4683 CEO-timing · 3976 c/ RA ativa) · backlog (3738, 3740)
- **PRs GitHub: 35 open parked (#675–#681 fila recente)** — aguardando veredito FPE/QA + registro do produtor ANTES de qualquer merge (§PRs automatizados, ordenamento binding AID-2219)

## Deltas relevantes vs rev 22 (Oct-03 → Oct-15)
- main `ae61479e` → `304456dd` (imóvel desde Oct-11; 140ª janela consecutiva sem commits)
- candidato C0/rc-qa-c0-r4: ARCHIVED sem merge (nenhum push/merge/deploy executado desde)
- emergência disk 14,594G→~78–79G avail resolvida pelo founder 23:36:46Z Oct-14 (AID-4785 done; purge /tmp 27G + 68 backups antigos 38,5G); política de retenção pendente no card `210313d0` (AID-4789, fuse ~10d, backstop Oct-20)
- **RA `2d5013fa` ATIVA na AID-3976 desde Oct-12 09:00Z** (stranded_assigned_issue; resolução manual registrada no thread 09:03Z mas nunca executada via API; owner CEO; resolução pelo SM negada por boundary) → escalada child na #625
- spawn-board: padrão 4508–4790; 103 spawns; contagem muda 3; supersede same-cycle não-mudo 25ª consecutiva (4790: 01:00:01Z→01:04:10Z, ~4m9s)
- restart do board NÃO executado (founder: dispensável p/ disco) — famílias flap(50)/race(57)/scheduler-wedge(4683)/fresh-read(3975/3976) seguem pendentes de restart; 3990 poll 01:30Z in-flight no fechamento desta auditoria (PID 18 unchanged, 75ª janela)

## Decisão pendente CEO (registrada no child desta auditoria)
Reassign AID-3518 (ou supersede do artefato queue-by-role) para o agente SM vigente — sem isso, o artefato canônico não pode ser reconciliado in-loco pela SM corrente.

Provenance: agent=sdlc-scrum-master task=AID-4791 run=710ed7c0-09db-4b3d-aa93-7eb38f0d842d
