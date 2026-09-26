# Checks — AID-2698-docs-factory-poc

Obrigações congeladas antes do build. A prova aceita NÃO-código: cada check é
um comando determinístico sobre ARTEFATOS DE DOCUMENTAÇÃO (estrutura, claim
datada, linha de índice, resolução de links), sem executar código de produto.

```
C1 | profile=cheap | python3 -c "import sys;from pathlib import Path;t=Path('docs/handbook/14_factory_docs_loop.md').read_text(encoding='utf-8');req=['# Factory docs loop','## Prerequisites','## Step by step','## Verification','Last verified: 2026-09-26'];missing=[h for h in req if h not in t];sys.exit('C1 missing: '+repr(missing)) if missing else print('C1 ok: structure + dated claim')"
C2 | profile=cheap | python3 -c "import sys;from pathlib import Path;r=Path('docs/handbook/README.md').read_text(encoding='utf-8');row=[l for l in r.splitlines() if '14_factory_docs_loop.md' in l];sys.exit('C2: handbook README index has no row for 14') if not row else print('C2 ok: index row present')"
C3 | profile=standard | python3 -c "import re,sys;from pathlib import Path;src=Path('docs/handbook/14_factory_docs_loop.md');base=src.parent;links=re.findall(r'\]\(([^)\s]+)\)',src.read_text(encoding='utf-8'));bad=[l for l in links if not l.startswith(('http','#','mailto:')) and not base.joinpath(l.split('#')[0]).resolve().exists()];sys.exit('C3 broken relative links: '+repr(bad)) if bad else print('C3 ok: '+str(len(links))+' links resolve')"
```

## Notas

- `C3` (standard) exige prova produzida pelo contexto verificador em
  clean-room (P2/P3) — link check é o análogo docs do "teste que falha antes
  do fix": um link quebrado reprova a promoção.
- Nenhum check usa rede: links são resolvidos contra arquivos do repo no SHA
  provado (determinístico, custo zero, sem PII).
