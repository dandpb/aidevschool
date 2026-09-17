@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22+ nao encontrado. Abra sdlc-quest.html para jogar sem Node.
  echo Para servidor local, instale Node.js e execute npm start nesta pasta.
  pause
  exit /b 1
)
node tools\serve.cjs --open
if errorlevel 1 (
  echo O servidor nao iniciou. Consulte a mensagem acima.
  pause
  exit /b 1
)
