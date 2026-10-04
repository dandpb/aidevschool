#!/usr/bin/env bash
set -euo pipefail
artifact_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(git -C "$artifact_dir" rev-parse --show-toplevel)"
export LAYA_ROOT="${LAYA_ROOT:-$repo_dir/.scratch/laya-jev/laya}"
export HF_HOME="${HF_HOME:-$repo_dir/.scratch/laya-jev/hf-cache}"
export HF_HUB_DISABLE_XET=1
export HF_HUB_ETAG_TIMEOUT=15
export HF_HUB_DOWNLOAD_TIMEOUT=30
unset HF_HUB_OFFLINE TRANSFORMERS_OFFLINE
cd "$LAYA_ROOT"
.venv/bin/python verify/checkpoints.py --fetch --models "$LAYA_ROOT/models"
.venv/bin/python "$artifact_dir/run_local_models.py" --model all
