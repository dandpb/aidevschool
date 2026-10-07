#!/usr/bin/env python3
"""AID-3666 — verificação da folha imprimível (PDF A4) contra a fonte learner.
F1 (AID-4240): política de paginação atualizada — .card/fieldset podem fluir
entre páginas (quebra em fronteira de campo, via PRINT_FIT_CSS do gerador);
átomos (campo, numrow, prompt-box, tabela, rádio, sumline…) continuam
indivisíveis por página.

Subcomandos:
  dom  <html> <out.json>   — inventário do DOM em mídia print (playwright, read-only)
  pdf  <pdf>  <out.json>   — estrutura, texto extraído (ToUnicode), geometria por página
  cmp  <dom.json> <pdf.json> — compara fonte↔PDF: texto completo, átomos íntegros,
                                tabelas, campos, margens/overflow; saída PASS/FAIL

Sem rede, sem instalação. Não altera a fonte. Evidências citam arquivo/linha.
"""

import json
import re
import sys
import zlib
from pathlib import Path

# ---------- PDF object layer ----------

def parse_objects(raw: bytes):
    objs = {}
    for m in re.finditer(rb'(\d+)\s+0\s+obj\b(.*?)endobj', raw, re.S):
        objs[int(m.group(1))] = m.group(2)
    return objs


def inflate(body: bytes):
    sm = re.search(rb'stream\r?\n(.*?)\r?\nendstream', body, re.S)
    if not sm:
        return None
    try:
        return zlib.decompress(sm.group(1))
    except Exception:
        return sm.group(1)


def refs(value: bytes):
    return [int(x) for x in re.findall(rb'(\d+)\s+0\s+R', value)]


def xref_check(raw: bytes):
    m = re.search(rb'xref\n(\d+)\s+(\d+)\n(.*?)trailer', raw, re.S)
    if not m:
        return {"mode": "none"}
    first, count = int(m.group(1)), int(m.group(2))
    rows = m.group(3).split(b'\n')
    ok, bad = 0, []
    for i in range(count):
        parts = rows[i].split()
        if len(parts) < 3 or parts[2] != b'n':
            continue
        off, num = int(parts[0]), first + i
        if raw[off:off + 24].startswith(str(num).encode() + b' '):
            ok += 1
        else:
            bad.append(num)
    return {"mode": "classic-table", "in_use": ok, "bad_offsets": bad}


def balanced_dict(body: bytes, key: bytes):
    """Extrai o dict inline /Key com casamento balanceado de << >>."""
    m = re.search(rb'/' + key + rb'\s*(<<)', body)
    if not m:
        return None
    i, depth = m.end() - 2, 0
    while i < len(body) - 1:
        if body[i:i + 2] == b'<<':
            depth += 1
            i += 2
        elif body[i:i + 2] == b'>>':
            depth -= 1
            i += 2
            if depth == 0:
                return body[m.end() - 2:i]
        else:
            i += 1
    return None


def dict_lookup(objs, body: bytes, key: bytes):
    m = re.search(rb'/' + key + rb'\s*(\d+)\s+0\s+R', body)
    if m:
        return objs[int(m.group(1))]
    return balanced_dict(body, key)


# ---------- CMap (ToUnicode) ----------

def parse_cmap(data: bytes):
    mapping = {}
    txt = data.decode('latin1')
    for sec in re.findall(r'beginbfchar(.*?)endbfchar', txt, re.S):
        for src, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', sec):
            code = int(src, 16)
            uni = bytes.fromhex(dst).decode('utf-16-be', errors='replace')
            mapping[code] = uni
    for sec in re.findall(r'beginbfrange(.*?)endbfrange', txt, re.S):
        for lo, hi, dst in re.findall(
                r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', sec):
            lo_i, hi_i, base = int(lo, 16), int(hi, 16), int(dst, 16)
            for c in range(lo_i, hi_i + 1):
                mapping[c] = chr(base + (c - lo_i))
        for lo, hi, arr in re.findall(
                r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.*?)\]', sec, re.S):
            lo_i, hi_i = int(lo, 16), int(hi, 16)
            dsts = re.findall(r'<([0-9A-Fa-f]+)>', arr)
            for k, d in enumerate(dsts):
                if lo_i + k > hi_i:
                    break
                mapping[lo_i + k] = bytes.fromhex(d).decode('utf-16-be', errors='replace')
    return mapping


# ---------- fonts ----------

def load_font(objs, font_body: bytes):
    sub = re.search(rb'/Subtype\s*/(\w+)', font_body)
    subtype = sub.group(1).decode() if sub else '?'
    tu = dict_lookup(objs, font_body, b'ToUnicode')
    cmap = parse_cmap(inflate(tu)) if tu is not None else {}
    widths, default_w = {}, 1000.0
    cid = None
    m_arr = re.search(rb'/DescendantFonts\s*\[(.*?)\]', font_body, re.S)
    if m_arr is not None and refs(m_arr.group(1)):
        cid = objs[refs(m_arr.group(1))[0]]
    else:
        cd = dict_lookup(objs, font_body, b'DescendantFonts')
        if cd is not None and refs(cd):
            cid = objs[refs(cd)[0]]
    cid_body = cid if cid is not None else font_body
    dw = re.search(rb'/DW\s+(-?[\d.]+)', cid_body)
    if dw:
        default_w = float(dw.group(1))
    wm = re.search(rb'/W\s*\[(.*?)\]', cid_body, re.S)
    if wm:
        i = 0
        flat = re.findall(rb'-?\d+(?:\.\d+)?|\[[\d\s.\-]+\]', wm.group(1))
        while i < len(flat):
            t = flat[i]
            if t.startswith(b'['):
                i += 1
                continue
            gid = int(float(t))
            if i + 1 < len(flat) and flat[i + 1].startswith(b'['):
                ws = [float(x) for x in re.findall(rb'-?\d+(?:\.\d+)?', flat[i + 1])]
                for k, w in enumerate(ws):
                    widths[gid + k] = w
                i += 2
            elif i + 2 < len(flat) and not flat[i + 1].startswith(b'['):
                first = gid
                last = int(float(flat[i + 1]))
                w = float(flat[i + 2])
                for g in range(first, last + 1):
                    widths[g] = w
                i += 3
            else:
                i += 1
    return {"subtype": subtype, "cmap": cmap, "widths": widths, "dw": default_w,
            "two_byte": subtype == 'Type0' or b'/Identity-H' in font_body}


# ---------- content stream interpreter ----------

NUM = rb'\-?\d*\.?\d+(?:e-?\d+)?'


def mat_mul(a, b):
    return [
        a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
        a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
        a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
    ]


def apply(m, x, y):
    return m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]


def decode_literal(s: bytes):
    out = bytearray()
    i = 0
    while i < len(s):
        c = s[i]
        if c == 0x5C:
            i += 1
            if i >= len(s):
                break
            n = s[i]
            mp = {0x6E: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12}
            if n in mp:
                out.append(mp[n])
            elif n in (0x28, 0x29, 0x5C):
                out.append(n)
            elif 0x30 <= n <= 0x37:
                oct_ = ''
                while i < len(s) and len(oct_) < 3 and 0x30 <= s[i] <= 0x37:
                    oct_ += chr(s[i]); i += 1
                i -= 1
                out.append(int(oct_, 8) & 0xFF)
            else:
                out.append(n)
        else:
            out.append(c)
        i += 1
    return bytes(out)


def run_content(content: bytes, fonts, font_map):
    """Interpreta ops de texto/gráficos; devolve glifos com posição em pt de página."""
    tokens = re.findall(
        rb'(/[\w#\-.]+)|(<[0-9A-Fa-f\s]*>)|(\((?:[^()\\]|\\.|\([^()]*\))*\))|(\[)|(\])|(' + NUM + rb')|(\S{1,3})',
        content)
    ctm = [1, 0, 0, 1, 0, 0]
    stack = []
    tm = [1, 0, 0, 1, 0, 0]     # text matrix
    line = [1, 0, 0, 1, 0, 0]   # text line matrix
    cur_font = None
    font_size = 0.0
    operands = []
    glyphs = []   # (page_pt_x, page_pt_y, width_pt, uni)
    strokes = []  # (x0,y0,x1,y1) em pt — segmentos horizontais
    path_pts = []
    for tok in tokens:
        name, hexs, lit, lb, rb, num, op = tok
        if name:
            operands.append(name)
            continue
        if hexs:
            operands.append(hexs)
            continue
        if lit:
            operands.append(lit)
            continue
        if num:
            operands.append(float(num))
            continue
        if lb:
            operands.append(b'[')
            continue
        if rb:
            operands.append(b']')
            continue
        if not op:
            continue
        o = op.decode('latin1')
        if o == 'q':
            stack.append((list(ctm),))
        elif o == 'Q':
            if stack:
                ctm = stack.pop()[0]
        elif o == 'cm' and len(operands) >= 6:
            new = [operands[-6], operands[-5], operands[-4], operands[-3],
                   operands[-2], operands[-1]]
            ctm = mat_mul(new, ctm)
        elif o == 'BT':
            tm = [1, 0, 0, 1, 0, 0]
            line = list(tm)
        elif o == 'Tf' and len(operands) >= 2 and isinstance(operands[-2], bytes):
            fname = operands[-2].decode('latin1')
            cur_font = font_map.get(fname)
            font_size = operands[-1]
        elif o == 'Tm' and len(operands) >= 6:
            tm = [operands[-6], operands[-5], operands[-4], operands[-3],
                  operands[-2], operands[-1]]
            line = list(tm)
        elif o in ('Td', 'TD') and len(operands) >= 2:
            tx, ty = operands[-2], operands[-1]
            t = [1, 0, 0, 1, tx, ty]
            line = mat_mul(t, line)
            tm = list(line)
        elif o == 'T*':
            t = [1, 0, 0, 1, 0, 0]
            line = mat_mul(t, line)
            tm = list(line)
        elif o in ('Tj', "'", '"', 'TJ'):
            strs = []
            if o == 'TJ':
                arr = []
                if operands and operands[-1] == b']':
                    depth, start = 0, None
                    for idx, v in enumerate(operands):
                        if v == b'[':
                            start = idx
                        if v == b']':
                            arr = operands[start + 1:idx]
                            break
                strs = [v for v in arr if isinstance(v, bytes) and v != b']']
            else:
                if operands and isinstance(operands[-1], bytes):
                    strs = [operands[-1]]
            full = mat_mul(tm, ctm)
            for s in strs:
                if s.startswith(b'<'):
                    data = bytes.fromhex(re.sub(rb'\s', b'', s[1:-1]).decode())
                else:
                    data = decode_literal(s[1:-1])
                f = fonts[cur_font] if cur_font in fonts else None
                step = 2 if (f and f['two_byte']) else 1
                for k in range(0, len(data) - step + 1, step):
                    code = int.from_bytes(data[k:k + step], 'big')
                    uni = f['cmap'].get(code, '') if f else ''
                    w0 = f['widths'].get(code, f['dw'] if f else 1000.0)
                    x0, y0 = apply(full, 0, 0)
                    width_pt = abs(w0 / 1000.0 * font_size * full[0] + w0 / 1000.0 * font_size * full[2])
                    if uni:
                        glyphs.append((round(x0, 2), round(y0, 2), round(width_pt, 2), uni))
                    adv = [1, 0, 0, 1, w0 / 1000.0 * font_size, 0]
                    tm = mat_mul(adv, tm)
                    line = list(tm)
                    full = mat_mul(tm, ctm)
            if o in ("'", '"'):
                pass
        elif o == 'm' and len(operands) >= 2:
            path_pts.append((operands[-2], operands[-1]))
        elif o == 'l' and len(operands) >= 2:
            p0 = path_pts.pop() if path_pts else (0, 0)
            x0, y0 = apply(ctm, p0[0], p0[1])
            x1, y1 = apply(ctm, operands[-2], operands[-1])
            if abs(y1 - y0) < 0.6 and abs(x1 - x0) > 30:
                strokes.append((round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)))
            path_pts.append((operands[-2], operands[-1]))
        elif o == 'n':
            path_pts = []
        if o not in ('[', ']'):
            operands = []
    return glyphs, strokes


# ---------- pdf subcommand ----------

def cmd_pdf(pdf_path: str, out_path: str):
    raw = Path(pdf_path).read_bytes()
    objs = parse_objects(raw)
    xref = xref_check(raw)
    root = objs[int(re.search(rb'/Root\s+(\d+)\s+0\s+R', raw).group(1))]
    pages_root = objs[int(re.search(rb'/Pages\s+(\d+)\s+0\s+R', root).group(1))]

    def walk(node, acc):
        t = re.search(rb'/Type\s*/(\w+)', node)
        if t and t.group(1) == b'Page':
            acc.append(node)
            return acc
        km = re.search(rb'/Kids\s*(.*)', node, re.S)
        if km:
            seg = km.group(1)
            seg = seg[:seg.find(b']')] if b']' in seg else seg[:200]
            for r in refs(seg):
                walk(objs[r], acc)
        return acc

    pages = walk(pages_root, [])
    report = {"file": pdf_path, "bytes": len(raw), "xref": xref, "pages": []}
    for pi, pbody in enumerate(pages, 1):
        mb = re.search(rb'/MediaBox\s*\[([^\]]+)\]', pbody)
        box = [float(x) for x in re.findall(rb'' + NUM, mb.group(1))] if mb else []
        res = dict_lookup(objs, pbody, b'Resources')
        font_map = {}
        fonts = {}
        if res is not None:
            fd = re.search(rb'/Font\s*<<(.*?)>>', res, re.S)
            if fd:
                for name, ref in re.findall(rb'(/[\w#\-.]+)\s+(\d+)\s+0\s+R', fd.group(1)):
                    font_map[name.decode('latin1')] = name.decode('latin1')
                    fonts[name.decode('latin1')] = load_font(objs, objs[int(ref)])
        content = b''
        csp = re.search(rb'/Contents\s*(\[[^\]]*\]|(\d+)\s+0\s+R)', pbody)
        if csp:
            for r in refs(csp.group(1)):
                content += inflate(objs[r]) or b''
        glyphs, strokes = run_content(content, fonts, font_map)
        page_h = box[3] if len(box) == 4 else 0.0
        text = ''.join(g[3] for g in glyphs)
        by_baseline = {}
        for gx, gy, gw, uni in glyphs:
            by_baseline.setdefault(round(gy, 1), []).append((gx, gw, uni))
        ro_lines = []
        for by in sorted(by_baseline, reverse=True):
            parts = []
            row = sorted(by_baseline[by], key=lambda t: t[0])
            for j, (gx, gw, uni) in enumerate(row):
                if j and gx - (row[j - 1][0] + row[j - 1][1]) > max(0.9, 0.28 * gw):
                    parts.append(' ')
                parts.append(uni)
            ro_lines.append(''.join(parts))
        text_ro = '\n'.join(ro_lines)
        report['pages'].append({
            "n": pi, "mediabox": box,
            "glyphs": len(glyphs),
            "text": text,
            "text_reading_order": text_ro,
            "max_x_end": round(max((g[0] + g[2] for g in glyphs), default=0), 1),
            "min_x": round(min((g[0] for g in glyphs), default=0), 1),
            "max_y_top": round(max((page_h - g[1] for g in glyphs), default=0), 1),
            "min_y_top": round(min((page_h - g[1] for g in glyphs), default=0), 1),
            "h_strokes_long": len(strokes),
        })
    Path(out_path).write_text(json.dumps(report, ensure_ascii=False))
    pgs = report['pages']
    print(f"pdf ok: {len(pgs)} páginas; xref {xref}")
    for p in pgs:
        print(f"  p{p['n']}: {p['glyphs']} glifos, x∈[{p['min_x']},{p['max_x_end']}], "
              f"y∈[{p['min_y_top']},{p['max_y_top']}], traços-h {p['h_strokes_long']}")


# ---------- dom subcommand ----------

DOM_JS = """() => {
  const norm = s => s.replace(/[\\s\\u00a0]+/g,' ').trim();
  const out = {blocks: [], placeholders: [], counts: {}, lines: []};
  document.querySelectorAll('.wrap *').forEach(()=>{});
  const blocks = document.querySelectorAll(
    'header.page, nav.toc, section > .card, section > .step-head, section > p.lead, fieldset, .retry, footer.page, section#autocheck ul.check, .neg .card, .notice, .field, .numrow, .prompt-box, p.sumline, p.mini, .radio, .check li, table, .card h3, legend');
  blocks.forEach(b => out.blocks.push({
    sel: (b.tagName||'').toLowerCase() + (b.id?('#'+b.id):'') + (b.className&&typeof b.className==='string'?('.'+b.className.split(/\\s+/).slice(0,2).join('.')):''),
    h: Math.round(b.getBoundingClientRect().height),
    text: norm(b.innerText)}));
  out.meta = {vw: window.innerWidth, media: 'print'};
  document.querySelectorAll('[placeholder]').forEach(e => out.placeholders.push(e.getAttribute('placeholder')));
  const c = out.counts;
  c.textarea = document.querySelectorAll('textarea.blank').length;
  c.input_blanknum = document.querySelectorAll('input.blanknum').length;
  c.radio = document.querySelectorAll('input[type=radio]').length;
  c.checkbox = document.querySelectorAll('input[type=checkbox]').length;
  c.table_data_rows = document.querySelectorAll('table.data tbody tr').length;
  c.retry_rows = document.querySelectorAll('.retry tbody tr').length;
  document.querySelectorAll('.wrap').forEach(w => {
    w.innerText.split('\\n').forEach(l => { const n = norm(l); if(n) out.lines.push(n); });
  });
  return out;
}"""


def chromium_exe() -> str:
    import glob
    import os
    env = os.environ.get('CHROMIUM_EXE')
    if env:
        return env
    cands = sorted(glob.glob(
        '/paperclip/.cache/ms-playwright/chromium_headless_shell-*/'
        'chrome-headless-shell-linux64/chrome-headless-shell'))
    if not cands:
        raise SystemExit('chromium headless shell não encontrado em .cache/ms-playwright')
    return cands[-1]


def cmd_dom(html_path: str, out_path: str):
    from playwright.sync_api import sync_playwright
    EXE = chromium_exe()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE)
        pg = b.new_page()
        pg.emulate_media(media="print")
        pg.goto(Path(html_path).resolve().as_uri())
        pg.wait_for_load_state("networkidle")
        inv = pg.evaluate(DOM_JS)
        b.close()
    Path(out_path).write_text(json.dumps(inv, ensure_ascii=False))
    print(f"dom ok: {len(inv['lines'])} linhas, {len(inv['blocks'])} blocos, "
          f"counts={inv['counts']}, placeholders={len(inv['placeholders'])}")


# ---------- cmp subcommand ----------

def norm(s: str) -> str:
    s = s.replace('\u00a0', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def squash(s: str) -> str:
    return re.sub(r'\s+', '', norm(s))


def seq_found(s: str, haystack: str, gap: int) -> bool:
    """Palavras de s, na ordem, tolerando até `gap` chars intercalados."""
    words = [w for w in re.split(r'\s+', norm(s)) if w]
    if not words:
        return True
    pat = re.compile((r'.{0,%d}?' % gap).join(re.escape(w) for w in words))
    return pat.search(haystack) is not None


def words_found(s: str, haystack: str) -> bool:
    """Todas as palavras de s presentes no haystack (integridade de texto)."""
    return all(re.escape(w) in haystack or haystack.find(w) >= 0
               for w in re.split(r'\s+', norm(s)) if w)


# Política de paginação F1 (AID-4240): desde o achado UX da aprovação
# @3a5d188f, o `generate_pdf.py` injeta em tempo de geração
# `break-inside:auto` para .card/fieldset — blocos grandes podem fluir entre
# páginas desde que a quebra caia em fronteira de campo. O que NÃO pode
# dividir entre páginas são os ÁTOMOS abaixo (campo com rótulo+dica+linha de
# resposta, numrow, prompt-box, tabela, grupo de rádio, sumline, notice, toc,
# retry, rodapé, cabeçalhos). Os átomos acompanham o PRINT_FIT_CSS do
# gerador; qualquer divergência aqui é defeito deste verificador.
ATOM_TOKENS = ('.field', '.numrow', '.prompt-box', '.sumline', '.mini',
               '.radio', 'table', 'nav.toc', '.notice', '.retry',
               'footer.page', 'h3', 'h4', 'legend', 'header.page',
               '.step-head', 'li', '.arrow', '.tag', '.flow', '.neg')


def is_atom(sel: str) -> bool:
    s = sel.lower()
    if s.startswith('ul.check'):
        return False  # container da checklist: divide ENTRE itens (li = átomo)
    if any(t in s for t in ('.field', '.numrow', '.prompt-box', '.sumline',
                            '.mini', '.radio', 'table', 'nav.toc', '.notice',
                            '.retry', 'footer.page', '.step-head', '.arrow',
                            '.tag', '.flow', '.neg', '.check')):
        return True
    if s.startswith(('h3', 'h4', 'legend', 'li', 'header')):
        return True
    return False


def cmd_cmp(dom_path: str, pdf_path: str):
    dom = json.loads(Path(dom_path).read_text())
    pdf = json.loads(Path(pdf_path).read_text())
    page_texts = [norm(p.get('text_reading_order') or p['text']) for p in pdf['pages']]
    page_squash = [squash(p.get('text_reading_order') or p['text']) for p in pdf['pages']]
    all_squash = ''.join(page_squash)
    fails = []

    missing, tier2, tier3 = [], 0, 0
    for ln in dom['lines']:
        if not ln:
            continue
        if squash(ln) in all_squash:
            continue
        if seq_found(ln, all_squash, 120):
            tier2 += 1
            continue
        if words_found(ln, all_squash):
            tier3 += 1
            continue
        missing.append(ln)
    if missing:
        fails.append({'check': 'texto-completo', 'missing': missing[:20], 'n': len(missing)})

    verbatim = [ln for ln in dom['lines'] if ln and norm(ln) in ' '.join(page_texts)]
    atom_split, lost_blocks, oversized = [], [], []
    split_blocks = []   # informativo: blocos grandes que fluíram entre páginas
    for b in dom['blocks']:
        t = b['text']
        if not norm(t):
            continue
        sq = squash(t)
        atom = is_atom(b['sel'])
        scopes = page_squash if atom else [all_squash]
        if any(sq in ps for ps in scopes):
            continue
        if any(seq_found(t, ps, 200) for ps in scopes):
            continue
        if any(words_found(t, ps) for ps in scopes):
            continue
        if words_found(t, all_squash) and (b.get('h') or 0) > 1000:
            oversized.append(b['sel'] + f"h={b.get('h')}px")
            continue
        if not atom and words_found(t, all_squash):
            # texto completo no documento, mas não contíguo em página única
            # → bloco grande que fluiu entre páginas (política F1): registrar
            # em quais páginas o bloco começa/termina para revisão QA/UX.
            spans = [i + 1 for i, ps in enumerate(page_squash)
                     if seq_found(t, ps, 400) or words_found(t, ps)]
            split_blocks.append(f"{b['sel']}@p{spans[0] if spans else '?'}"
                                + (f"-p{spans[-1]}" if len(spans) > 1 else ""))
            continue
        (atom_split if atom else lost_blocks).append(b['sel'])
    if atom_split:
        fails.append({'check': 'atomos-integros-por-pagina'
                                   ' (campo/tabela/prompt-box/…) divididos',
                      'blocks': atom_split})
    if lost_blocks:
        fails.append({'check': 'blocos-texto-completo', 'blocks': lost_blocks})

    c = dom['counts']
    expect = {
        'traços-h (linhas de resposta)': c['textarea'] + c['input_blanknum'],
    }
    stroke_total = sum(p['h_strokes_long'] for p in pdf['pages'])
    if stroke_total < expect['traços-h (linhas de resposta)']:
        fails.append({'check': 'campos-linha', 'esperado>=': expect, 'encontrado': stroke_total})

    geo_bad = []
    A4 = {'w': 595.92, 'h': 842.88, 'margin': 34.02}
    for p in pdf['pages']:
        if not (abs(p['mediabox'][2] - A4['w']) < 1 and abs(p['mediabox'][3] - A4['h']) < 1):
            geo_bad.append({'page': p['n'], 'mediabox': p['mediabox'], 'why': 'não-A4'})
        if p['max_x_end'] > A4['w'] - A4['margin'] + 2.5:
            geo_bad.append({'page': p['n'], 'max_x_end': p['max_x_end'], 'why': 'overflow direito'})
        if p['glyphs'] and p['min_x'] < A4['margin'] - 2.5:
            geo_bad.append({'page': p['n'], 'min_x': p['min_x'], 'why': 'margem esquerda'})
        if p['max_y_top'] > A4['h'] - A4['margin'] + 2.5:
            geo_bad.append({'page': p['n'], 'max_y_top': p['max_y_top'], 'why': 'margem inferior'})
    if geo_bad:
        fails.append({'check': 'geometria-A4-margens', 'issues': geo_bad})

    print(json.dumps({
        'pages': len(pdf['pages']),
        'strokes_h_total': stroke_total,
        'expected_fields': expect['traços-h (linhas de resposta)'],
        'counts_source': c,
        'placeholders_in_source': dom['placeholders'][:3],
        'source_lines_total': len([ln for ln in dom['lines'] if ln]),
        'lines_verbatim_matched': len(verbatim),
        'lines_tier2_word_order': tier2,
        'lines_tier3_word_presence': tier3,
        'blocos_oversized_quebrados': oversized,
        'blocos_grandes_fluindo_entre_paginas (informativo, política F1)': split_blocks,
        'fails': fails,
    }, ensure_ascii=False, indent=1))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'dom':
        cmd_dom(sys.argv[2], sys.argv[3])
    elif cmd == 'pdf':
        cmd_pdf(sys.argv[2], sys.argv[3])
    elif cmd == 'cmp':
        cmd_cmp(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(__doc__)
