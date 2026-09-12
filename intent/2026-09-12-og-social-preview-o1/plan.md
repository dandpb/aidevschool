# Plan — `2026-09-12-og-social-preview-o1` (short plan, docs/static-only)

Slice mínima do funil O1 (AID-1527): metadados Open Graph/Twitter nas 2
superfícies live. Verbatim copy; assets existentes; diff = 2 index.html.

## 1. Passos

| # | Passo | Arquivo |
| --- | --- | --- |
| P1 | Adicionar bloco OG/Twitter à literacy: `og:title`, `og:description`, `og:type=website`, `og:site_name`, `og:locale=pt_BR`, `og:url`, `og:image=https://aidevschool-literacydojo.netlify.app/icon-512.png` (URL absoluta — ver amend), `twitter:card=summary` — copy verbatim do `<title>`/`<description>` atuais | `engines/literacyDojo/index.html` |
| P2 | Idem no OS: `og:image=https://aidevschool-codexdojo-os.netlify.app/dojo-wallpaper.png` (URL absoluta — ver amend), `twitter:card=summary_large_image` — copy verbatim | `engines/codexdojo-os-prototype/index.html` |
| P3 | Commit com intent/ (este change-id) + PR `aid-1527/og-social-preview-o1` apontando para review do FPE (roteiro do onboarding AID-1527) | git/GitHub |

## 2. Verificação (producer-side; verifier independente no countersign)

- `sdlc_guard_check.sh --base origin/main --head HEAD` → clean (esperado:
  2M/0A/0D, nenhum path protegido, nenhum teste tocado).
- Build das 2 engines segue verde (index.html não entra em tsc; checagem de
  sanidade via `vite build` local na literacy).
- Inspeção: título/descrição OG idênticos byte a byte ao `<title>`/
  `<description>` existentes (assert por diff manual citado no PR).

## 3. Fora de escopo (follow-ups registrados, não entregues aqui)

- Asset og:image otimizado (1200×630, <300 KB) — UX Designer.
- Copy de social card dedicada (conversão) — UX/G&R + founder.

## 4. Amend 2026-09-12 — og:image absoluto (remediação F1, veredito AID-1537)

O plano original registrava `og:image` como caminho **relativo**
(`/icon-512.png`, `/dojo-wallpaper.png`). Durante o review F1 (Important)
apontou a divergência: a implementação usa **URL absoluta**
(`https://aidevschool-<surface>.netlify.app/<asset>`). Decisão do produtor:
**manter a implementação absoluta** e alinhar este registro — `og:image`
DEVE ser URL absoluta (crawlers Open Graph de WhatsApp/Discord/Facebook não
resolvem caminhos relativos; as 2 superfícies live rodam em domínios netlify
distintos, cada `og:image` aponta para o asset do próprio domínio).
Nenhuma mudança de código neste amend; apenas o registro do plano passa a
concordar com o diff.
