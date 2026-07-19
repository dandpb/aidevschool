# Vision Dual-Audience — Design

**Spec**: `.specs/features/vision-dual-audience/spec.md` · **Data**: 2026-07-19

## Decisões de arquitetura

### D1 — Parser do catálogo: contiguidade a partir de 0 ou 1

`learner/substrate/catalog.py` hoje exige `numbers == range(1, n+1)`. Mudança mínima retrocompatível:

```python
first = numbers[0] if numbers else 1
if first not in (0, 1) or numbers != list(range(first, first + len(projects))):
    raise CatalogFormatError(...)
```

`_LEVEL_PHASES` ganha `0: "aplicacao_ia"`. Nada mais muda: `_PROJECT_HEADING` já casa `### 00.`,
`_LEVEL_HEADING` já casa `## Level 0`. Testes novos em `learner/substrate/tests/` cobrem: aceita 0-início,
rejeita não-contíguo, rejeita projeto antes de level (comportamento existente), fase do level 0.

### D2 — Status `planned` para o 00

Evita quebrar: `test_build_snapshot_picks_up_backlog_counts` (2/16 hardcoded), `TestBacklogStatusDrift`
(exige `go-impl`/`rust-impl`/`node-impl` para `scaffolded` — sem sentido numa trilha no-code) e
`test_backlog_covers_catalog_projects` (`planned` ∈ known). Promoção futura segue o fluxo gateado (AD-002).

### D3 — codexDojo: fase nova no domínio

`domain.ts > projectPhases` ganha `"aplicacao_ia"` (primeiro item, ordem da trilha); `projects.test.ts`
passa a esperar 19. **Gate não roda neste sandbox** (binário nativo arch errada — probe 2026-07-19):
tarefa entrega a mudança + pendência explícita `pnpm run test` no Mac. Sem alegação de pass.

### D4 — Modo pedagógico como config seam

`perfil_pedagogico.modo: developer` em `engines/minimaxDojo/config/learner.yaml` (padrão do repo: prompts
referenciam via marcador `⟨config: perfil_pedagogico.modo⟩`, validado por `test_config_seam`). Prompts
ganham seção curta "Ramo non_developer" — analogias, zero código, gate via checklist — sem duplicar
thresholds numéricos.

### D5 — Gate no-code (ADR)

O único ponto que toca a regra de ouro. Desenho: **attempt** = log escrito do aprendiz em
`learner/attempts/` (o que pediu à IA, o que recebeu, onde aplicou); **evidência** = checklist de
afirmações falsificáveis ("verifiquei X na minha realidade") que o **Prometor** confere item a item;
**limites explícitos**: mais fraco que evidência executável, nunca promove unidade de código, marcado
`gate_kind: no_code` no units_log. Produtor ≠ verificador e filesystem-como-verdade preservados.

### D6 — Zero-install sem tocar o engine

`setup.sh onboard` (argumento posicional; sem arg = comportamento atual). Build estático: snapshot de
`engines/miniTown/` (sem `node_modules`/`dist`) copiado para `/tmp`, `npm install && npm run build` lá —
o mount e a sessão concorrente ficam intocados. Deploy: tentar Netlify MCP; fallback `netlify.toml`
(publish `dist/`) + instruções no README. Resultado do build registrado como evidência (sucesso ou falha).

## Riscos

| Risco | Mitigação |
| --- | --- |
| Sessão concorrente edita miniTown | Só criamos `README.md`/`netlify.toml` novos; build em snapshot `/tmp` |
| Gates JS invisíveis no sandbox | Pendência explícita com comando exato; nunca "pass" sem output |
| Repo com muitos untracked alheios | `git add` só de paths listados por task; nunca `git add -A` |
| Drift codexDojo (projects.ts 19 vs teste 18) | Mesma task muda gerado + domínio + teste, com pendência Mac única |
