'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { buildHtml } = require('../tools/build.cjs');
const { parseArgs, createServer } = require('../tools/serve.cjs');
const { resolvePython } = require('../tools/python-runtime.cjs');
const root = path.resolve(__dirname, '..');
const sha = content => crypto.createHash('sha256').update(content).digest('hex');

async function withServer(run) {
  const server = createServer(root);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  function request(url = '/', method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: url, method, headers }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject); req.end();
    });
  }
  try { await run(request); }
  finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
}

test('local: Node build equals the delivered v1.3 artifact byte-for-byte', () => {
  const html = buildHtml(root);
  assert.equal(html, fs.readFileSync(path.join(root, 'sdlc-quest.html'), 'utf8'));
});
test('local: standalone has no external scripts or stylesheets', () => {
  const html = buildHtml(root);
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html), false);
  assert.equal(/<link\b[^>]*rel=["']stylesheet/i.test(html), false);
});
test('local: npm commands do not require third-party JS packages', () => {
  const pkg = require('../package.json');
  assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
  assert.equal(Object.keys(pkg.devDependencies || {}).length, 0);
  for (const command of ['start', 'build', 'test', 'gate', 'setup:tests']) assert.ok(pkg.scripts[command].startsWith('node tools/'));
});
test('local: server default is stable and never opens a browser implicitly', () => {
  assert.deepEqual(parseArgs([], {}), { port: 8080, open: false, help: false });
});
test('local: custom port and explicit browser launch parse correctly', () => {
  assert.deepEqual(parseArgs(['--port', '8081', '--open'], {}), { port: 8081, open: true, help: false });
  assert.equal(parseArgs([], { PORT: '9000' }).port, 9000);
});
for (const input of ['0', '65536', 'abc', '-1', '80;echo x', '']) {
  test('local: invalid port is refused: ' + JSON.stringify(input), () => assert.throws(() => parseArgs(['--port', input], {})));
}
test('local: remote binding and unknown options refused', () => {
  assert.throws(() => parseArgs(['--host', '0.0.0.0'], {}));
  assert.throws(() => parseArgs(['--port'], {}));
});
test('local: source entrypoint is served intact', () => withServer(async request => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.equal(response.body.toString('utf8'), fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  assert.match(response.headers['content-type'], /^text\/html/);
  assert.equal(response.headers['cache-control'], 'no-store');
}));
test('local: all HTML source references resolve with correct bytes', () => withServer(async request => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(src\/[^"#]+)"/g)].map(m => m[1]);
  assert.equal(refs.length, 13);
  for (const ref of refs) {
    const response = await request('/' + ref);
    assert.equal(response.status, 200, ref);
    assert.equal(sha(response.body), sha(fs.readFileSync(path.join(root, ref))), ref);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  }
}));
test('local: bundled HTML is available under its filename', () => withServer(async request => {
  const response = await request('/sdlc-quest.html?version=1.3');
  assert.equal(response.status, 200);
  assert.equal(sha(response.body), sha(fs.readFileSync(path.join(root, 'sdlc-quest.html'))));
}));
test('local: HEAD sends headers without body', () => withServer(async request => {
  const response = await request('/src/core.js', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 0);
  assert.match(response.headers['content-type'], /^text\/javascript/);
  assert.ok(Number(response.headers['content-length']) > 0);
}));
test('local: no write API', () => withServer(async request => {
  const response = await request('/', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
}));
test('local: dotfiles, docs, tests, manifests and absent assets are not served', () => withServer(async request => {
  for (const url of ['/.env', '/.git/config', '/package.json', '/tests/core.test.cjs', '/README.md', '/src/absent.js']) {
    assert.equal((await request(url)).status, 404, url);
  }
}));
test('local: malformed and traversal paths are refused', () => withServer(async request => {
  for (const url of ['/../README.md', '/%2e%2e/README.md', '/src/../data.js', '/src%5cdata.js', '/%00', '/%xx']) {
    assert.equal((await request(url)).status, 400, url);
  }
}));
test('local: arbitrary Host headers are refused', () => withServer(async request => {
  assert.equal((await request('/', 'GET', { Host: 'attacker.invalid' })).status, 403);
}));
test('local: invalid explicit Python does not silently select another runtime', () => {
  assert.throws(() => resolvePython(root, { ...process.env, QUEST_PYTHON: path.join(root, 'python-does-not-exist') }), /Python 3.10/);
});
test('local: launchers exist and preserve paths containing spaces', () => {
  assert.ok(fs.readFileSync(path.join(root, 'INICIAR-Mac.command'), 'utf8').includes('cd "$(dirname "$0")"'));
  assert.ok(fs.readFileSync(path.join(root, 'INICIAR-Windows.cmd'), 'utf8').includes('cd /d "%~dp0"'));
  assert.ok(fs.existsSync(path.join(root, 'iniciar.sh')));
});
