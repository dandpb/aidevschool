# Scheduler — Cronos (Pro vs Lightning)

> **Canônico:** [`../../prompts/per_agent/cronos.md`](../../prompts/per_agent/cronos.md)

## Dois Modos

| Modo | Quando | Como |
|------|--------|------|
| **Lightning** | chat, Socrático, Maestro interativo | sessão atual, contexto compartilhado |
| **Pro** | trilha, avaliar, benchmark, Mneme batch | tarefa recorrente em background, sessão fresca |

## Crons Padrão

| ID | Frequência | Modo | Dono |
|----|-----------|------|------|
| `mneme.daily` | 08:00 daily | Pro | MNEME |
| `ouroboros.reflect` | fim de sessão | Lightning | OUROBOROS |
| `seneca.audit` | domingo 20:00 | Pro | SÊNECA |
| `mnemosyne.compact` | domingo 21:00 | Pro | MNEMOSYNE |
| `atena.snapshot` | por ciclo | Lightning | ATENA |
| `promotor.audit` | por unidade | Pro | PROMĘTOR |
| `galileu.bench` | sob demanda | Pro | GALILEU |

## Registry

[`../../whiteboard/cron_registry.yaml`](../../whiteboard/cron_registry.yaml)

## Fallback (sem cron nativo)

[`../../whiteboard/cron_fallback.md`](../../whiteboard/cron_fallback.md) (gerado se necessário)
