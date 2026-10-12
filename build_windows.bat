@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale Node.js 22 LTS e abra novamente o terminal.
  pause
  exit /b 1
)
echo Instalando dependencias...
npm install
if errorlevel 1 goto failed
echo Construindo instalador e versao portatil para Windows...
npm run dist
if errorlevel 1 goto failed
echo.
echo Concluido. Verifique a pasta dist-win.
pause
exit /b 0
:failed
echo.
echo A compilacao falhou. Confira as mensagens acima.
pause
exit /b 1
