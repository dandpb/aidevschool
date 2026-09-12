# AID-59 — evidência de branch protection dos quatro gates

## Resultado observado

Em 2026-08-22, a API do GitHub confirmou proteção ativa em `dandpb/aidevschool`,
branch `main`, com atualização obrigatória da branch (`strict: true`) e estes
quatro contextos publicados e comprovados pelo run 32586620642:

1. `literacyDojo (TS + content)`
2. `codexdojo-os (TS)`
3. `Python (learner + curriculum shared)`
4. `product readiness (claims)`

A política também exige um pull request com uma aprovação, descarta aprovações
obsoletas, exige aprovação do último push, exige resolução de conversas e aplica
as regras a administradores. Force-push e exclusão da branch estão desativados;
nenhum ator de bypass está configurado.

## Comandos de prova

```bash
gh api repos/dandpb/aidevschool/branches/main/protection \
  --jq '{required_status_checks,required_pull_request_reviews,enforce_admins,required_conversation_resolution,allow_force_pushes,allow_deletions,restrictions}'

git diff --check -- .github/workflows/ci.yml docs/runbooks/RELEASE_CI.md
```

O primeiro comando retornou `strict: true`, os quatro nomes publicados acima,
`required_approving_review_count: 1`, `require_last_push_approval: true`,
`enforce_admins.enabled: true`, `required_conversation_resolution.enabled: true`,
`allow_force_pushes.enabled: false`, `allow_deletions.enabled: false` e
`restrictions: null`. O segundo comando terminou com código 0.

## Limite da evidência e revisão independente

A proteção está ativa para os quatro checks publicados, e o run
<https://github.com/dandpb/aidevschool/actions/runs/32586620642> comprova esses
checks verdes no SHA `3586cb587092abea2c4881b2f6a8b926e9487921`.

Os quatro nomes novos do candidato (`pilot / ...`) ainda não possuem uma
execução publicada: a alteração de `.github/workflows/ci.yml` está no checkout
local junto de um conjunto maior de mudanças não commitadas. Uma tentativa de
exigi-los antes da publicação foi revertida no mesmo heartbeat, pois deixaria
todos os PRs permanentemente bloqueados por contexts que nenhum workflow remoto
emite. Portanto AID-59 permanece bloqueada para provar os quatro gates novos.

Para concluir AID-59 sem confundir produtor e verificador, um revisor independente
deve revisar o diff, publicar o conjunto coerente em PR e registrar o URL/SHA de
uma execução em que os quatro checks aparecem. Uma execução vermelha deve manter
o PR bloqueado; a execução verde no SHA candidato deve liberar o merge somente
após a aprovação humana exigida.

Esta política de CI não escreve estado do learner, não aceita evidência pedagógica
e não atribui mastery.
