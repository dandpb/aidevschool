<!-- AID-3722 (norma AID-2493): o trailer `Provenance:` no fim é a identidade
     do produtor deste PR e deve estar no body NA ABERTURA. O check
     `SDLC guardrails (diff)` emite ::notice para PR de lane de agente
     (branch `aid<n>/*`, `gh<n>/*`, `codex/*`) aberto sem trailer válido no
     body. PRs abertos via API não recebem este template — a validação é o
     notice do check; este template cobre o caminho UI / `gh pr create`. -->

## O quê

<!-- 1-3 bullets do que este PR muda. -->

## Tarefa e verificação

<!-- AID-<n> | GH-<n> + evidência executada (suite/script + resultado). -->

## Checklist

- [ ] Trailer `Provenance:` preenchido no body na abertura (AID-2493)
- [ ] Verificação local executada (comando + resultado citados acima)

Provenance: agent=<slug> task=AID-<n> run=<runId> session=<sessionId>
