#!/bin/bash
# Start both the Next.js dev server and the playground mini-service.
# Fully detached so they survive across shell sessions.
# NOTE: Next.js is launched via `node` (not `bun`) because `bun run dev`
# wrapping next was unstable and crashed on browser HMR reloads.
cd /home/z/my-project

# kill any existing
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "playground/index" 2>/dev/null
sleep 1

# start mini-service (port 3001) — runs under bun, stable
setsid bash -c 'exec bun run mini-services/playground/index.ts > mini-services/playground/mini.log 2>&1' < /dev/null &
disown

# start next dev (port 3000) via node directly — stable under browser HMR
# uses setsid+exec for full detachment from the parent shell
setsid bash -c 'exec node node_modules/.bin/next dev -p 3000 > dev.log 2>&1' < /dev/null &
disown

echo "launched (next via node setsid, mini via bun setsid)"
