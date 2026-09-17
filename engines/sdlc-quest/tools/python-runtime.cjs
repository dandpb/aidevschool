'use strict';
/** Python interpreter selection; a path with spaces is kept as one argument. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function resolvePython(root = path.resolve(__dirname, '..'), env = process.env, platform = process.platform) {
  const candidates = [];
  if (env.QUEST_PYTHON) candidates.push({ executable: env.QUEST_PYTHON, args: [] });
  else {
    const venv = path.join(root, '.venv', platform === 'win32' ? 'Scripts' : 'bin', platform === 'win32' ? 'python.exe' : 'python');
    if (fs.existsSync(venv)) candidates.push({ executable: venv, args: [] });
    if (platform === 'win32') candidates.push({ executable: 'py', args: ['-3'] }, { executable: 'python', args: [] });
    else candidates.push({ executable: 'python3', args: [] }, { executable: 'python', args: [] });
  }
  for (const candidate of candidates) {
    const result = spawnSync(candidate.executable, [...candidate.args, '-c', 'import sys; print("%s.%s" % sys.version_info[:2]); sys.exit(0 if sys.version_info >= (3,10) else 1)'],
      { encoding: 'utf8', timeout: 10000, shell: false, env });
    if (!result.error && result.status === 0) return { ...candidate, version: result.stdout.trim() };
  }
  throw new Error('Python 3.10+ não encontrado. Instale-o para os testes de navegador. QUEST_PYTHON pode indicar o caminho completo do executável. Para jogar, use apenas npm start.');
}
module.exports = { resolvePython };
