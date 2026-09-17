#!/usr/bin/env python3
"""Build a self-contained, offline HTML using only Python's standard library."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'src/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="src/style.css">', '<style>\n' + css + '\n</style>')
extra_css = (root / 'src/tlc-style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="src/tlc-style.css">', '<style>\n' + extra_css + '\n</style>')
h_css = (root / 'src/harness-style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="src/harness-style.css">', '<style>\n' + h_css + '\n</style>')
for name in ['data', 'tlc-data', 'tlc-core', 'harness-core', 'core', 'world', 'app', 'tlc-app', 'harness-app']:
    code = (root / f'src/{name}.js').read_text(encoding='utf-8')
    html = html.replace(f'<script src="src/{name}.js"></script>', '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>')
output = root / 'sdlc-quest.html'
output.write_text(html, encoding='utf-8')
print(f'Built {output.name}: {output.stat().st_size:,} bytes. No runtime network dependencies.')
