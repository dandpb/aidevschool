#!/usr/bin/env bash
# Checagens executáveis das regras aprendidas (CLAUDE.md, seção "Regras aprendidas").
# Regra que não roda, se esquece — este script roda em todo `npm test`.
set -euo pipefail

cd "$(dirname "$0")/.."
FALHAS=0

# Regra 6: projeto zero dependências — package.json sem dependencies/devDependencies
checar_zero_deps() {
  if node -e '
    const p = require("./package.json");
    const deps = { ...(p.dependencies || {}), ...(p.devDependencies || {}) };
    if (Object.keys(deps).length > 0) {
      console.error("dependências encontradas: " + Object.keys(deps).join(", "));
      process.exit(1);
    }
  '; then
    echo "OK    regra 6: zero dependências npm"
  else
    echo "FALHA regra 6: package.json declara dependencies/devDependencies (projeto é zero-deps)"
    FALHAS=1
  fi
}

# Regra 7: script `test` deve existir e executar os testes de verdade (node --test)
checar_script_test() {
  if node -e '
    const p = require("./package.json");
    const t = (p.scripts && p.scripts.test) || "";
    if (!t.includes("node --test")) process.exit(1);
  '; then
    echo "OK    regra 7: script test existe e roda node --test"
  else
    echo "FALHA regra 7: package.json sem script test executando node --test"
    FALHAS=1
  fi
}

checar_zero_deps
checar_script_test

if [ "$FALHAS" -ne 0 ]; then
  echo "checar-regras: FALHOU — corrija as violações acima antes de prosseguir."
  exit 1
fi
echo "checar-regras: todas as regras OK."
