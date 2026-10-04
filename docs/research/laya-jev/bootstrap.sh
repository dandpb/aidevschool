#!/usr/bin/env bash
set -euo pipefail
artifact_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(git -C "$artifact_dir" rev-parse --show-toplevel)"
export LAYA_ROOT="${LAYA_ROOT:-$repo_dir/.scratch/laya-jev/laya}"
laya_commit=8a6e1328cce2460a0e5aa348ad465bb1b5821cd2
if [[ ! -d "$LAYA_ROOT" ]]; then
  mkdir -p -- "$(dirname -- "$LAYA_ROOT")"
  git clone --no-checkout https://github.com/NandhaKishorM/laya.git "$LAYA_ROOT"
  git -C "$LAYA_ROOT" checkout --detach "$laya_commit"
fi
if [[ "$(git -C "$LAYA_ROOT" rev-parse HEAD)" != "$laya_commit" ]]; then
  printf '%s\n' "Laya checkout does not match pinned commit $laya_commit" >&2
  exit 2
fi
if [[ ! -x "$LAYA_ROOT/.venv/bin/python" ]]; then
  python3 -m venv "$LAYA_ROOT/.venv"
fi
if [[ "$(uname -s)" == Linux ]]; then
  "$LAYA_ROOT/.venv/bin/pip" install --index-url https://download.pytorch.org/whl/cpu 'torch==2.14.1+cpu'
else
  "$LAYA_ROOT/.venv/bin/pip" install 'torch==2.14.1'
fi
"$LAYA_ROOT/.venv/bin/pip" install -e "$LAYA_ROOT" 'transformers==4.57.6' 'python-dotenv==1.2.4'
printf 'Laya ready: %s\n' "$LAYA_ROOT"
