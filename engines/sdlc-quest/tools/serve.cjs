#!/usr/bin/env node
'use strict';
/** Read-only loopback server: exposes only the game HTML and source assets. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
function parseArgs(args, env = process.env) {
  let rawPort = env.PORT || '8080';
  let open = false;
  let help = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') {
      if (i + 1 === args.length) throw new Error('--port precisa de um número.');
      rawPort = args[++i];
    } else if (args[i] === '--open') open = true;
    else if (args[i] === '--help') help = true;
    else throw new Error('Argumento não suportado: ' + args[i]);
  }
  if (!/^\d+$/.test(String(rawPort)) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('Porta inválida. Use um número de 1 a 65535.');
  }
  return { port: Number(rawPort), open, help };
}
function createServer(root = ROOT) {
  const base = fs.realpathSync(root);
  return http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    function text(status, message) {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message);
    }
    const host = req.headers.host || '';
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(host)) return text(403, 'Host não permitido.');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return text(405, 'Este servidor local é somente leitura.');
    }
    let pathname;
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { return text(400, 'URL inválida.'); }
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
      return text(400, 'Caminho inválido.');
    }
    let rel;
    if (pathname === '/' || pathname === '/index.html') rel = 'index.html';
    else if (pathname === '/sdlc-quest.html') rel = 'sdlc-quest.html';
    else if (/^\/src\/[a-zA-Z0-9_-]+\.(?:js|css)$/.test(pathname)) rel = pathname.slice(1);
    else if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    else return text(404, 'Arquivo não encontrado.');
    try {
      const filename = fs.realpathSync(path.join(base, rel));
      const relative = path.relative(base, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return text(403, 'Arquivo fora do projeto.');
      const content = fs.readFileSync(filename);
      const mime = rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.css') ? 'text/css' : 'text/html';
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'Content-Length': content.length });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return text(404, 'Arquivo não encontrado.');
      console.error('Falha de leitura:', error.message);
      return text(500, 'Não foi possível ler o arquivo.');
    }
  });
}
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(cmd, args, { shell: false, stdio: 'ignore' });
  child.on('error', () => console.log('Abra o endereço acima no navegador.'));
  child.unref();
}
function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  if (opts.help) {
    console.log('Uso: node tools/serve.cjs [--port 8080] [--open]\nAcesso somente neste computador. Ctrl+C encerra.');
    return;
  }
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `A porta ${opts.port} está ocupada. Encerre a outra instância ou use: npm start -- --port 8081`
      : 'Não foi possível iniciar: ' + error.message);
    process.exitCode = 1;
  });
  server.listen(opts.port, HOST, () => {
    const url = `http://${HOST}:${opts.port}`;
    console.log(`\nSDLC Quest v1.3 — servidor local\n\n  ${url}\n\nSem instalação de pacotes. Ctrl+C para encerrar.\n`);
    if (opts.open) openBrowser(url);
  });
  function stop() {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
if (require.main === module) main();
module.exports = { parseArgs, createServer, main };
