# Proveniência das capturas — Jornada Dev opt-in (AID-3584 → AID-3588)

> Manifesto declarado no ato da cópia (2026-10-01, Docs & Readiness Engineer, AID-3588;
> wording da âncora corrigido em r2 da revisão QA — achado A2 — e em r3, AID-3594, para
> descrever a sequência real de publicação dos anexos r2 — direção do PO `001d74d3`).
> Fontes: `/paperclip/aid3584-evidence/` (piso do revisor LEE), a tabela sha256 do comentário
> `a54b4325` na issue AID-3584 e os anexos da issue registrados pela plataforma.
> Sequência real dos anexos r2: (1) captura original pelo produtor LAE (2026-10-01T05:02:55Z,
> head `c02d2954`); (2) upload do LAE recusado com 403 — incidente preservado, não apagado
> (comentários `a54b4325`/`6558fbe6`); (3) publicação posterior dos 4 anexos r2 pelo
> revisor/owner legítimo LEE pela via suportada (uploads 2026-10-01T05:06:34–39Z, antes da
> aprovação `a2617914` de 05:07Z; IDs: `b19b75ee` 06 mobile, `97f16bbd` 07 desktop,
> `7ea89474` capture-meta-r2, `28e2694c` runs-delta-r2); (4) inspeção independente do PO —
> download e leitura dos PNGs 05:12Z, verificação registrada 05:42Z (`001d74d3`).
> A tabela sha256 do comentário `a54b4325` permanece âncora declarada válida; os anexos da
> plataforma são âncora adicional (não substituição). sha256 recomputados no ato da cópia e
> conferidos byte-a-byte com ambas as âncoras.

## Candidato documentado

| Item | Valor |
| --- | --- |
| PR | #638 (Draft, **aberto, não mergeado**) — `aid3584/dev-journey-optin` → base `aid3453/unify-school` |
| Head exato | `c02d2954fdbe384e1782cec34a90338ef98285d1` |
| Base curada | `579ce995baa7aa28084127b15a9886103ad68a44` |
| Aceite técnico | LEE r1 `082f98b8` (head `32546406`) + r2 `a2617914` (head `c02d2954`, delta de copy) |
| Liberação do PO | comentário na descrição de AID-3588, 2026-10-01 05:12 UTC |
| Estado de publicação | **NÃO PUBLICADO** — preview isolado; nenhuma URL pública serve este head |

## Arquivos desta pasta (r2 — copy fix do CTA)

| Arquivo | sha256 | Viewport | Browser | Capturada (UTC) | Head |
| --- | --- | --- | --- | --- | --- |
| `06-home-DEV-active-mobile-360.png` | `408ff23f1871a38ec8fafb8fd813826cd254b226317292f9c04c119dd91ca4ae` | 360×740 (fullPage 360×2317) | chromium headless | 2026-10-01T05:02:55.707Z→55.873Z | `c02d2954` |
| `07-home-DEV-active-desktop-1280.png` | `cabddd34cf9b2c78d34beab13aaeaa674c141f0d3b8e71a98776fce90fe6d2b8` | 1280×800 (fullPage 1280×1677) | chromium headless | 2026-10-01T05:02:55.895Z→56.260Z | `c02d2954` |
| `capture-meta-r2.json` | `8856a29a4342e1d4ad7035a27438190757830f9a730b1ab7dd366e4d3f7093a8` | — | — | metadados registrados no ato | `c02d2954` |
| `runs-delta-r2.log` | `f210ae264d6f67976da65cca49cfcc6620114eb918034084322842a74a809d5a` | — | — | run Playwright r2 | `c02d2954` |

Estado capturado (garantido por assert de máquina **antes** do pixel: `journey-switch-dev`
`aria-pressed=true` + `open-map` com texto "Explorar Jornada Dev"): Home com **DEV ativa 0/9**
e CTA "Explorar Jornada Dev", legível e contido em 360 e 1280 px (inspeção independente do PO:
PASS, 2026-10-01 05:12 UTC).

## Capturas r1 (NÃO copiadas para o repo) e lacunas preservadas

As capturas r1 (`01`–`05`, anexadas em AID-3584 em 2026-10-01T04:40Z, head `32546406`) seguem
disponíveis **apenas como anexos da issue AID-3584**. Suas lacunas de proveniência, declaradas
pelo LEE em `capture-provenance-2026-10-01.md` (comentário `71a8f919`), permanecem exatamente
como declaradas — nada aqui as corrige retroativamente:

- `runs.log` da r1 contém placeholder de horário e **não** registra head final/browser/horário/hash
  por PNG (o pedido do PO `01b06e8f` foi respondido com os registros originais existentes, não com
  manifesto retroativo).
- `05-home-ia-desktop-1280.png` (r1) mostrava DEV selecionado com CTA estático "Explorar Vila Lume"
  — motivou o request_changes `71a8f919`/`9695d6d8`, corrigido no head `c02d2954` e re-capturado
  em r2 (arquivos acima).
- Captura da jornada IA **não** foi refeita em r2: o estado IA é preservado por código/testes
  (`journeySwitchFlow.test.tsx`, 5/5), sem pixel novo.

## Regras de uso

- Citar estas imagens sempre com head + data + este manifesto.
- Não usar estas capturas para descrever a URL publicada
  (`https://aidevschool-literacydojo.netlify.app/`), que hoje serve o comportamento anterior
  (Trilha Dev "Em breve") — até existir receipt de deploy explícito do PR #638.
