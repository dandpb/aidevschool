#!/bin/bash
set -e

# Change directory to script location to ensure relative paths work
cd "$(dirname "$0")"

# Zero-install entry (level-0 audience): prepares ONLY miniTown. Safe to re-run.
if [ "${1:-}" = "onboard" ]; then
  echo "Onboard: preparing miniTown (cozy town-sim, no other engines)..."
  corepack enable
  corepack prepare pnpm@latest --activate
  cd engines/miniTown
  pnpm install
  echo ""
  echo "Pronto! Para abrir a cidade:"
  echo "  cd engines/miniTown && pnpm run dev"
  echo "Depois abra http://127.0.0.1:5173 no navegador."
  exit 0
fi

echo "Setting up Python environment..."
python3 -m pip install -e ".[dev]"
python3 -m learner.substrate

echo "Setting up pnpm..."
corepack enable
corepack prepare pnpm@latest --activate

echo "Setting up codexDojo..."
cd engines/codexDojo
pnpm install
cd ../..

echo "Setting up pixelDojo..."
cd engines/pixelDojo/pixel-quest
pnpm install
cd ../../..

echo "Setup script finished successfully!"
