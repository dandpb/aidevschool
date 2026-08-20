#!/usr/bin/env bash
# Recria os históricos git embutidos dos demos (02/04/06/08) a partir dos
# bundles versionados — necessário apenas em clones novos. Os bundles preservam
# os hashes citados nos RESULTADO.md, então a auditoria volta a passar inteira.
set -euo pipefail
cd "$(dirname "$0")/.."

for bundle in workflows/*/git-historico.bundle; do
  demo="$(dirname "$bundle")/demo"
  if [ -d "$demo/.git" ]; then
    echo "ok (já existe): $demo"
    continue
  fi
  git -C "$demo" init -q
  git -C "$demo" fetch -q ../git-historico.bundle 'refs/*:refs/*'
  ramo=$(git -C "$demo" for-each-ref --format='%(refname:short)' refs/heads | grep -Ex 'master|main' | head -1)
  git -C "$demo" symbolic-ref HEAD "refs/heads/$ramo"
  git -C "$demo" reset -q   # índice = HEAD; o worktree (vindo do repo externo) fica intacto
  echo "restaurado: $demo (HEAD=$ramo)"
done
