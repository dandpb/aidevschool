# MANIFEST — AID-3666 folha de exercício imprimível (PDF A4)
# F1 (AID-4240): aproveitamento de página — regeneração 9 pp.

## Fonte (read-only, byte-idêntica)

- Arquivo: `docs/worksheets/reparo-de-rotina/worksheet-visual.html`
- Bytes: 28609
- SHA256: `4539be6a22181660cf8a3450c659192bda274e4d47cb972b573b95af513be5f3`
- Git blob: `104134187b38e2659809db8d8b47bc630f8d3cf6` @ `fb8b4fe7e1a1cfe21708197761ef54987a0c95d9` (head do PR #644, aberto)
- Regra: a fonte NÃO é alterada por este trabalho (`git diff fb8b4fe7 -- <fonte>` vazio).

## Produto

- Arquivo: `docs/worksheets/reparo-de-rotina/print/worksheet-reparo-rotina-A4.pdf`
- Bytes: 243695
- SHA256: `edeb4d711641b17cf316d7b413eaedd138b1bd49ab9c4c766c138c40a955220d`
- Formato: A4 retrato (MediaBox 595.92 × 842.88 pt), **9 páginas** (era 10;
  F1 eliminou a p07 quase vazia — fill 3,7% — e a p03 com 22,9%).
- Determinismo: execuções consecutivas produziram bytes idênticos
  (normalização de `/CreationDate`, `/ModDate` e `/ID` documentada em
  `generate_pdf.py`; offsets do xref preservados).
- Histórico: versão @3a5d188f (10 pp, `f5f0cb0e…`) aprovada por QA+UX na
  AID-3666; esta versão aplica apenas o F1 (AID-4240) sem tocar na fonte.

## F1 (AID-4240) — política de paginação

Achado UX (aprovação @3a5d188f): páginas quase vazias no meio do fluxo
(p07 3,7%, p03 22,9%) porque `.card,fieldset{break-inside:avoid}` da fonte
empurrava blocos grandes inteiros para a página seguinte. Correção: CSS
injetado SÓ em tempo de geração (regra 2 do PRINT_FIT_CSS abaixo) permite
que `.card`/`fieldset` fluam entre páginas **quebrando em fronteira de
campo**; átomos indivisíveis (campo, numrow, prompt-box, tabela, grupo de
rádio, sumline, notice, toc, retry, rodapé) mantêm `break-inside:avoid` e
cabeçalhos (h3/legend/step-head) ganham `break-after:avoid`.

Aceite F1 (definido pela UX): nenhuma página <40% de fill exceto a última;
cmp exit 0; determinístico; 8–9 pp. **Resultado**: 9 pp; fill por página
(120 dpi, tinta <245): 86,3 / 98,7 / 100,1 / 100,0 / 83,1 / 99,9 / 99,8 /
85,4 / 11,1 (última = só o rodapé de fecho); zero tinta na borda de corte;
métricas completas em `evidence/pagination-metrics-f1.json`. Quebras reais
(fronteiras, texto por página):

- p1→p2 e p2→p3: idênticas às já aprovadas @3a5d188f (grid EXEMPLO).
- p3→p4: cartão "Antes — o que você tem" divide ENTRE parágrafos (após
  "…reconheceu a devolução literal."; o mini "De novo o total engana…"
  abre a p4).
- p4→p5: fieldset CAMPO 2 divide ENTRE campos (após a dica "…fechar o
  total da fonte.").
- p5→p6: entre fieldsets (CAMPO 3 → CAMPO 4).
- p6→p7: cartão SEMANA 2 divide na fronteira campo-após-tabela (a mesma
  fronteira segura citada pela UX em p8→p9 @3a5d188f).
- p7→p8: checklist AUTOCHEQUE divide ENTRE itens (li íntegros).
- p8→p9: rodapé íntegro na última página.

## Comando de geração (real)

```
cd docs/worksheets/reparo-de-rotina/print
python3 generate_pdf.py            # saída padrão worksheet-reparo-rotina-A4.pdf
```

Saída real (chromium 151.0.7922.34):

```
raw_bytes=243695 raw_sha256=4689ba129e69126ae1399d135d122bc4bca46eb89f6df7e0d28b197784806e9c
out=worksheet-reparo-rotina-A4.pdf bytes=243695 sha256=edeb4d711641b17cf316d7b413eaedd138b1bd49ab9c4c766c138c40a955220d
```

(Reprodutibilidade: 2 execuções adicionais antes da regeneração final
produziram bytes idênticos entre si — `edeb4d71…` — provando determinismo
do pipeline com a nova regra.)

## Config declarada (generate_pdf.py)

| parâmetro | valor |
|---|---|
| format | A4 (retrato) |
| margens | 12 mm (top/bottom/left/right) |
| print_background | true (realces del/ins/tags preservados) |
| display_header_footer | false (sem header/footer de navegador) |
| scale | 1.0 |
| PRINT_FIT_CSS (1) | `@media print{*{letter-spacing:normal!important}}` |
| PRINT_FIT_CSS (2, F1) | `.card,fieldset{break-inside:auto}` + átomos `{break-inside:avoid}` + `h3/legend/.step-head{break-after:avoid}` |

PRINT_FIT_CSS é injetado só em tempo de geração (`page.add_style_tag`),
NÃO altera a fonte. A regra (1) neutraliza defeito empírico do printToPDF
local que infla letter-spacing em em (~2x avanço + tracking), cortando à
direita legendas/badges/cabeçalhos (evidência:
`evidence/probe-letterspacing.txt`). A regra (2) implementa o F1
(AID-4240) conforme recomendação da aprovação UX @3a5d188f.

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
  (contabilidade real do gate: squash + 16 ordem-de-palavras — marcadores
  `<ol>` intercalados — + 6 presença-de-palavras — células de tabela
  intercaladas por linha visual; o contador "verbatim" exibido é
  estrito-secundário, imprecisão cosmética N1 já registrada pela QA).
- atomos-integros-por-pagina: PASS (política F1) — nenhum átomo
  (campo/tabela/prompt-box/numrow/rádio/sumline/notice/toc/retry/rodapé)
  dividido entre páginas; cartões/fieldsets grandes podem fluir entre
  páginas nas fronteiras listadas na seção F1 acima.
- geometria-A4-margens: PASS — 9/9 páginas dentro das margens de 12 mm
  (max_x_end 557.6 pt < limite 564.4 pt; mínimo à esquerda 33.8 pt);
  pixel: zero tinta na borda de corte (120 dpi).
- campos: 193 traços-h de linha de resposta ≥ 22 esperados (12 textarea +
  10 blanknum); contagens da fonte preservadas (radio 3, checkbox 4,
  linhas de tabela 18, retry 6).
- gabarito docente: NENHUM conteúdo além da fonte — reverso verificado
  ad-hoc: 0 palavras (len≥3) do PDF ausentes na fonte (linhas +
  placeholders + blocos do DOM).
- fill F1 (critério de aceite UX): nenhuma página <40% exceto a última
  (11,1% — só o rodapé de fecho); p07 3,7% e p03 22,9% eliminadas;
  métricas em `evidence/pagination-metrics-f1.json`.

## Limitação declarada

A verificação programática acima é geométrica, textual (content stream) e
pixel (métricas de fill/borda em 120 dpi, `pagination-metrics-f1.json`).
A revisão visual página a página da versão F1 cabe à cadeia QA Lead → UX
Designer (AID-4240), como na AID-3666; os renders p01–p09 foram anexados à
issue para essa revisão. O verificador é confiável para as propriedades
que mede (posição, integridade de texto, contagens, fronteiras de átomo);
defeitos do checkpoint 1545d6ce permanecem corrigidos.
