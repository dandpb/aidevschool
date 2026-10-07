#!/usr/bin/env python3
"""AID-3666 — geração da folha de exercício imprimível (PDF A4).

Fonte (read-only, byte-idêntica): ../worksheet-visual.html
  blob git 104134187b38e2659809db8d8b47bc630f8d3cf6 @ fb8b4fe7e1a1cfe21708197761ef54987a0c95d9 (PR #644)
  28609 bytes · SHA256 4539be6a22181660cf8a3450c659192bda274e4d47cb972b573b95af513be5f3

Regras (issue AID-3666): preservar TODO o texto/dados/campos aceitos; sem gabarito
docente; HTML-fonte permanece intocado; config de papel declarada; sem header/footer
de navegador; backgrounds preservados para contraste dos realces (del/ins/tags).

Reprodutibilidade: /CreationDate, /ModDate (dict /Info) e /ID (trailer) são
normalizados para constantes de MESMO comprimento em bytes (offsets do xref
preservados). Normalização documentada no MANIFEST.md.

Uso: python3 generate_pdf.py [saida.pdf]
"""

import hashlib
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "worksheet-visual.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "worksheet-reparo-rotina-A4.pdf"

# ---- config de impressão declarada (A4 retrato, margens legíveis) ----
PAGE_FORMAT = "A4"
MARGIN_MM = {"top": 12, "bottom": 12, "left": 12, "right": 12}
PRINT_BACKGROUND = True
DISPLAY_HEADER_FOOTER = False
SCALE = 1.0

# ---- correções de pipeline (impressão), aplicadas só em tempo de geração ----
# (1) Defeito empírico do printToPDF do Chromium local (151.0.7922.34, probe em
# evidence/probe-letterspacing.txt): letter-spacing em unidades em é inflado
# para ~2x avanço + tracking, estourando a largura imprimível (banners/legendas/
# cabeçalhos de tabela cortados à direita). A fonte HTML permanece intacta; a
# regra abaixo só entra no DOM durante a geração do PDF e neutraliza o defeito.
#
# (2) F1 (AID-4240, achado UX da aprovação @3a5d188f): a fonte declara
# `.card,fieldset,nav.toc,.notice{break-inside:avoid}`; blocos grandes que não
# cabem inteiros no espaço restante eram empurrados inteiros para a página
# seguinte, criando páginas quase vazias (p07 fill 3,7% — parágrafo órfão antes
# do cartão oversize SEMANA 2; p03 fill 22,9% — cartão SEU CASO empurrado).
# Relaxamos `break-inside` de .card/fieldset para permitir que esses blocos
# fluam entre páginas QUEBRANDO SOMENTE EM FRONTEIRA DE CAMPO — a fronteira
# segura que o próprio PDF @3a5d188f já demonstrava na quebra p8→p9. Átomos
# indivisíveis (campo com rótulo+dica+linha de resposta, numrow, prompt-box,
# tabela, grupo de rádio, sumline, notice, toc, rodapé) continuam com
# break-inside:avoid, e cabeçalhos de cartão/legend/step-head ganham
# break-after:avoid para não ficarem órfãos no pé de página. A fonte HTML
# permanece byte-idêntica; estas regras só entram no DOM na geração.
PRINT_FIT_CSS = (
    "@media print{*{letter-spacing:normal!important}}"
    "@media print{"
    ".card,fieldset{break-inside:auto}"
    ".card h3,legend,.step-head{break-after:avoid}"
    ".field,.numrow,.prompt-box,.sumline,.mini,.radio,.check li,"
    "table,nav.toc,.notice,.retry,.arrow,.tag,.flow,.neg,footer.page"
    "{break-inside:avoid}"
    "}"
)

# ---- constantes de normalização (mesmo comprimento das originais) ----
# padrão casado: D: + 14 dígitos + [+-]HH'II  → 22 bytes exatos
FIXED_PDF_DATE = b"D:20261001000000+00'00"
FIXED_ID_HEX = b"0" * 32

# Binário local já presente no ambiente (sem download/instalação);
# descobre a versão presente (a estação pode ter atualizado o build):
def _chromium_exe() -> str:
    import glob
    import os
    env = os.environ.get("CHROMIUM_EXE")
    if env:
        return env
    cands = sorted(glob.glob(
        "/paperclip/.cache/ms-playwright/chromium_headless_shell-*/"
        "chrome-headless-shell-linux64/chrome-headless-shell"))
    if not cands:
        raise SystemExit("chromium headless shell não encontrado em .cache/ms-playwright")
    return cands[-1]


CHROMIUM_EXE = _chromium_exe()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_metadata(raw: bytes) -> tuple[bytes, list[str]]:
    """Normaliza /CreationDate,/ModDate (Info) e /ID (trailer), preservando bytes."""
    notes = []

    def repl_date(m):
        notes.append(f"date {m.group(0)[:22]!r} -> normalizada")
        return FIXED_PDF_DATE

    out = re.sub(rb"D:\d{14}[+-]\d{2}'\d{2}", repl_date, raw)

    def repl_id(m):
        val = m.group(1)
        if len(val) == 32:
            notes.append(f"/ID {val[:16]}... -> normalizado")
            return b"[" + FIXED_ID_HEX + b"]"
        return m.group(0)

    out = re.sub(rb"/ID\s*\[<([0-9A-Fa-f]{32})>\]", repl_id, out)
    return out, notes


def main() -> None:
    assert SOURCE.is_file(), f"fonte ausente: {SOURCE}"
    src_bytes = SOURCE.read_bytes()
    src_sha = sha256(src_bytes)
    expected_sha = "4539be6a22181660cf8a3450c659192bda274e4d47cb972b573b95af513be5f3"
    assert src_bytes == SOURCE.read_bytes()
    if src_sha != expected_sha:
        raise SystemExit(f"ERRO: fonte divergiu (sha256 {src_sha}); abortando sem tocar na fonte.")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM_EXE)
        try:
            page = browser.new_page()
            page.emulate_media(media="print")
            page.goto(SOURCE.as_uri())
            page.wait_for_load_state("networkidle")
            chromium_ver = browser.version
            page.add_style_tag(content=PRINT_FIT_CSS)
            pdf_bytes = page.pdf(
                format=PAGE_FORMAT,
                margin={k: f"{v}mm" for k, v in MARGIN_MM.items()},
                print_background=PRINT_BACKGROUND,
                display_header_footer=DISPLAY_HEADER_FOOTER,
                scale=SCALE,
            )
        finally:
            browser.close()

    raw_sha, raw_len = sha256(pdf_bytes), len(pdf_bytes)
    norm_bytes, notes = normalize_metadata(pdf_bytes)
    OUT.write_bytes(norm_bytes)
    print(f"chromium={chromium_ver}")
    print(f"raw_bytes={raw_len} raw_sha256={raw_sha}")
    print(f"out={OUT.name} bytes={len(norm_bytes)} sha256={sha256(norm_bytes)}")
    for n in notes:
        print(f"normalized: {n}")


if __name__ == "__main__":
    main()
