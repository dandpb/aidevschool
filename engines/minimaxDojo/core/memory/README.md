# Memory — Whiteboard + Handoffs + Skills

> **Canônico:** [`../../docs/05_memory_system.md`](../../docs/05_memory_system.md)

## 3 Camadas

1. **Intra-agente** — experiência de uma run vira "dica" na próxima do mesmo agente
2. **Handoff files** — legíveis entre agentes (`whiteboard/handoffs/`)
3. **Whiteboard persistente** — perfil vivo do aluno, recuperável

## Whiteboard Layout

```
whiteboard/
├── learner_profile.md
├── trail.md
├── cron_registry.yaml
├── decisions/      # ADRs
├── event_log/      # NDJSON por semana
├── skills/         # PRs versionadas
├── handoffs/       # última semana
├── diagnostics/    # SONDA outputs
├── benchmarks/     # GALILEU outputs
└── archive/        # > 7 dias
```

## Núcleo Curado (injetado no prompt)

```yaml
core:
  aluno: { id, linguagem_foco, dreyfus_global, bloom_global, aidi, quota_socrates }
  trilha: { proxima_unidade, ultima_dominada }
  pegadinhas_top_3: [...]
  skills_ativas_top_3: [...]
```

**Tamanho máx:** ~500 tokens. Mantenha pequeno.
