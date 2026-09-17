#!/usr/bin/env node
'use strict';
/** Explicit opt-in setup. Creates a project-local venv and downloads test tools. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePython } = require('./python-runtime.cjs');
const root = path.resolve(__dirname, '..');
function run(executable, args) {
  console.log('\n>', executable, ...args);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `Comando falhou (saída ${result.status}).`);
}
try {
  if (process.argv.slice(2).length) throw new Error('Este comando não recebe argumentos.');
  const python = resolvePython(root);
  const venv = path.join(root, '.venv');
  const executable = path.join(venv, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  console.log('Preparação opcional: cria .venv e baixa Playwright/Chromium. Não necessária para jogar.');
  if (!fs.existsSync(executable)) {
    if (fs.existsSync(venv)) throw new Error('.venv já existe, mas sem Python válido. Inspecione ou remova apenas esse ambiente virtual antes de repetir.');
    run(python.executable, [...python.args, '-m', 'venv', venv]);
  }
  run(executable, ['-m', 'pip', 'install', '-r', 'requirements-dev.txt']);
  run(executable, ['-m', 'playwright', 'install', 'chromium']);
  console.log('\nPronto. Execute npm run gate. Não é necessário ativar a .venv.');
} catch (error) {
  console.error('\nPreparação interrompida:', error.message);
  console.error('No Linux, verifique também os pré-requisitos de venv e as bibliotecas do Chromium. Nenhuma instalação de sistema com sudo é executada por este script.');
  process.exitCode = 1;
}
