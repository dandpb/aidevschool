#!/usr/bin/env node
'use strict';
/** Offline build. Node standard library only; same output as tools/build.py. */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const STYLES = ['style', 'tlc-style', 'harness-style'];
const SCRIPTS = ['data', 'tlc-data', 'tlc-core', 'harness-core', 'core', 'world', 'app', 'tlc-app', 'harness-app'];
function buildHtml(root = ROOT) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  let html = read('index.html');
  function replaceOnce(tag, content) {
    if (html.split(tag).length !== 2) throw new Error('Esperada uma referência: ' + tag);
    html = html.replace(tag, () => content);
  }
  for (const name of STYLES) {
    replaceOnce(`<link rel="stylesheet" href="src/${name}.css">`, '<style>\n' + read(`src/${name}.css`) + '\n</style>');
  }
  for (const name of SCRIPTS) {
    const code = read(`src/${name}.js`).replace(/<\/script/g, '<\\/script');
    replaceOnce(`<script src="src/${name}.js"></script>`, '<script>\n' + code + '\n</script>');
  }
  return html;
}
function main() {
  try {
    const html = buildHtml();
    fs.writeFileSync(path.join(ROOT, 'sdlc-quest.html'), html, 'utf8');
    console.log(`Built sdlc-quest.html: ${Buffer.byteLength(html)} bytes. No runtime network dependencies.`);
    return 0;
  } catch (error) { console.error('Build falhou:', error.message); return 1; }
}
if (require.main === module) process.exitCode = main();
module.exports = { buildHtml, main };
