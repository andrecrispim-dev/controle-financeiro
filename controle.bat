@echo off
setlocal
cd /d "%~dp0"
call "scripts\controle.bat" %*
if errorlevel 1 (
  echo.
  echo Nao foi possivel executar o controle dos servicos.
  echo Verifique se o Node.js esta instalado e se voce esta na pasta do projeto.
  pause
)
