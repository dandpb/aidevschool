#!/bin/sh
# Starts only a loopback HTTP server, with no installation or external service.
cd "$(dirname "$0")" || exit 1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export PATH
if ! command -v node >/dev/null 2>&1; then
  printf '\nNode.js 22+ nao encontrado. Abra sdlc-quest.html para jogar sem Node.\nPara servidor local, instale Node.js e use npm start no Terminal.\nPressione Enter para fechar.\n'
  read -r answer
  exit 1
fi
node tools/serve.cjs --open
status=$?
if [ "$status" -ne 0 ]; then
  printf '\nO servidor nao iniciou. Consulte a mensagem acima. Enter para fechar.\n'
  read -r answer
fi
exit "$status"
