# MANIFEST — AID-3666 folha de exercício imprimível (PDF A4)

## Fonte (read-only, byte-idêntica)

- Arquivo: `docs/worksheets/reparo-de-rotina/worksheet-visual.html`
- Bytes: 28609
- SHA256: `4539be6a22181660cf8a3450c659192bda274e4d47cb972b573b95af513be5f3`
- Git blob: `104134187b38e2659809db8d8b47bc630f8d3cf6` @ `fb8b4fe7e1a1cfe21708197761ef54987a0c95d9` (head do PR #644, aberto)
- Regra: a fonte NÃO é alterada por este trabalho (`git diff fb8b4fe7 -- <fonte>` vazio).

## Produto

- Arquivo: `docs/worksheets/reparo-de-rotina/print/worksheet-reparo-rotina-A4.pdf`
- Bytes: 243017
- SHA256: `f5f0cb0e486d1ee8aee6f98328675a781113868e8a155ddf4800fe294496e82f`
- Formato: A4 retrato (MediaBox 595.92 × 842.88 pt), 10 páginas.
- Determinismo: duas execuções consecutivas produziram bytes idênticos
  (normalização de `/CreationDate`, `/ModDate` e `/ID` documentada em
  `generate_pdf.py`; offsets do xref preservados).

## Comando de geração (real)

```
cd docs/worksheets/reparo-de-rotina/print
python3 generate_pdf.py            # saída padrão worksheet-reparo-rotina-A4.pdf
```

Saída real (chromium 151.0.7922.34):

```
raw_bytes=243017 raw_sha256=35476a47fc600208c53d1a4322c8a6591f95a1f710e31e05ee11185351e0bf19
out=worksheet-reparo-rotina-A4.pdf bytes=243017 sha256=f5f0cb0e486d1ee8aee6f98328675a781113868e8a155ddf4800fe294496e82f
```

## Config declarada (generate_pdf.py)

| parâmetro | valor |
|---|---|
| format | A4 (retrato) |
| margens | 12 mm (top/bottom/left/right) |
| print_background | true (realces del/ins/tags preservados) |
| display_header_footer | false (sem header/footer de navegador) |
| scale | 1.0 |
| PRINT_FIT_CSS | `@media print{*{letter-spacing:normal!important}}` |

PRINT_FIT_CSS é injetado só em tempo de geração (`page.add_style_tag`),
NÃO altera a fonte, e neutraliza defeito empírico do printToPDF local que
infla letter-spacing em em (~2x avanço + tracking), causando corte à
direita de legendas/badges/cabeçalhos. Evidência:
`evidence/probe-letterspacing.txt`.

## Ambiente

- chromium_headless_shell-1234 = Chrome/151.0.7922.34
  (autodescoberta em `/paperclip/.cache/ms-playwright/chromium_headless_shell-*`;
  override via env `CHROMIUM_EXE`)
- Playwright (sync API) já presente no ambiente; sem rede/instalação.
- O checkpoint anterior (commit 1545d6ce) usava chromium 1228; a
  regeneração com 1234 + PRINT_FIT_CSS produz o PDF atual.

## Verificação (real, reproduzível)

```
cd docs/worksheets/reparo-de-rotina/print
python3 verify_pdf.py dom  ../worksheet-visual.html evidence/dom-print.json
python3 verify_pdf.py pdf  worksheet-reparo-rotina-A4.pdf evidence/pdf-structure.json
python3 verify_pdf.py cmp  evidence/dom-print.json evidence/pdf-structure.json
```

Resultado (`cmp` exit 0; JSON completo em `evidence/cmp-final.json`):

- texto-completo: PASS — 145/145 linhas da fonte presentes no PDF
  (112 verbatim exatas; 16 por ordem-de-palavras — marcadores `<ol>`
  intercalados; 6 por presença-de-palavras — células de tabela
  intercaladas por linha visual).
- blocos-integros-por-pagina: PASS — nenhum bloco `break-inside:avoid`
  dividido entre páginas, exceto o informativo abaixo.
- blocos-oversized-quebrados (informativo, p/ QA/UX): cartão
  "PLATAFORMA — SEMANA 2 (A FONTE)" tem 1206 px de altura (> página
  imprimível ~1032 px) e necessariamente quebra entre a fronteira
  campo-c/justificativa (p8→p9); nenhuma linha/tabela/campo é cortada
  no meio.
- geometria-A4-margens: PASS — 10/10 páginas dentro das margens de 12 mm
  (max_x_end máx. 557.6 pt < limite 564.4 pt; mínimo à esquerda 33.8 pt).
- campos: 162 traços-h de linha de resposta ≥ 22 esperados (12 textarea +
  10 blanknum); contagens da fonte preservadas (radio 3, checkbox 4,
  linhas de tabela 18, retry 6).
- gabarito docente: NENHUM conteúdo além da fonte — reverso também
  verificado: 0 palavras (len>=3) do PDF ausentes na fonte (linhas +
  placeholders + blocos do DOM).

## Limitação declarada

Sem rasterizador PDF nesta estação: a análise acima é geométrica e
textual (content stream), NÃO substitui revisão visual página a página.
Aceite visual permanece com UX Designer; revisão de texto/páginas com QA
Lead (cadeia original preservada). O verificador pós-correção é
confiável para as propriedades que mede (posição, integridade de texto,
contagens); `verify_pdf.py:456` TypeError e demais defeitos do
checkpoint 1545d6ce foram corrigidos (DescendantFonts em array, /W com
floats e semântica de intervalo, /DW 0, ordem de leitura por baseline,
espaçamento entre runs, tiers de tolerância).
