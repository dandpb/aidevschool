#!/bin/bash
set -e

# Change directory to script location to ensure relative paths work
cd "$(dirname "$0")"

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
