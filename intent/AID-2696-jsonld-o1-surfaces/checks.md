# Checks — AID-2696-jsonld-o1-surfaces

Obrigações congeladas antes do build (fábrica AID-2676, HTML §02). Checks de
**superfície de marketing** (estrutura/consistência de meta e fence de
escopo) — deliberadamente distintos dos checks de produto (build/test das
engines), que não mudam com este diff meta-only.

Formato: `C<n> | profile=<cheap|standard> | <comando>`.

```
C1 | profile=cheap | python3 intent/AID-2696-jsonld-o1-surfaces/validate_jsonld.py
C2 | profile=cheap | grep -q 'rel="canonical"' engines/literacyDojo/index.html && grep -q 'property="og:image"' engines/literacyDojo/index.html && grep -q 'name="twitter:card"' engines/literacyDojo/index.html && grep -q 'rel="canonical"' engines/codexdojo-os-prototype/index.html && grep -q 'property="og:image"' engines/codexdojo-os-prototype/index.html && grep -q 'name="twitter:card"' engines/codexdojo-os-prototype/index.html && echo OK anti-regression O1
C3 | profile=standard | python3 intent/AID-2696-jsonld-o1-surfaces/validate_jsonld.py --strict --base 7a8bc262
```

## Notas

- `C1` valida R1–R4: exatamente 1 bloco `ld+json` por superfície, `@graph`
  `WebSite`+`Organization`, cópia verbatim do meta existente (canonical,
  `og:url`, `og:site_name`, `meta[name=description]`, `lang`), linkage
  `publisher.@id` e anti-regressão (canonical/OG/twitter presentes).
- `C2` é a trilha de regressão independente do validador (grep puro) das
  ondas AID-1593/PR #352.
- `C3` (standard, verificador) acrescenta o fence de escopo R5: o diff
  `7a8bc262..HEAD` confinado aos 2 `index.html` + `intent/AID-2696-jsonld-o1-surfaces/`.
- Base pinada = `7a8bc262` (origin/main verificado via GitHub API às
  2026-09-26T06:38Z, no momento do branch desta POC).
