#!/bin/bash
set -e

# Change directory to script location to ensure relative paths work
cd "$(dirname "$0")"

# Zero-install entry (level-0 audience): prepares ONLY miniTown. Safe to re-run.
if [ "${1:-}" = "onboard" ]; then
  echo "Onboard: preparing miniTown (cozy town-sim, no other engines)..."
  corepack enable
  corepack prepare pnpm@9.15.9 --activate
  cd engines/miniTown
  CI=1 pnpm install --frozen-lockfile
  echo ""
  echo "Pronto! Para abrir a cidade:"
  echo "  cd engines/miniTown && pnpm run dev"
  echo "Depois abra http://127.0.0.1:5173 no navegador."
  exit 0
fi

echo "Setting up Python environment..."
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/" >&2
  exit 1
fi
uv venv --allow-existing --python 3.11 .venv
uv pip install --python .venv/bin/python -e ".[dev]"
.venv/bin/python -m learner.substrate

echo "Setting up pnpm..."
corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "Setting up codexDojo..."
cd engines/codexDojo
CI=1 pnpm install --frozen-lockfile
cd ../..

echo "Setting up pixelDojo..."
cd engines/pixelDojo/pixel-quest
CI=1 pnpm install --frozen-lockfile
cd ../../..

echo "Setup script finished successfully!"
