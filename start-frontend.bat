@echo off
setlocal
cd /d "%~dp0frontend"

where node >nul 2>nul
if errorlevel 1 goto :missing_node

if not exist .env (
  copy .env.example .env >nul
  echo Se creo frontend\.env desde .env.example.
)

if not exist node_modules (
  echo Instalando dependencias del frontend...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo Iniciando frontend en http://localhost:5173
call npm.cmd run dev -- --host 0.0.0.0 --port 5173
if errorlevel 1 goto :fail

endlocal
exit /b 0

:missing_node
echo.
echo Node.js no esta instalado o no esta en PATH.
echo Instala Node.js 20+ antes de ejecutar este script.
pause
endlocal
exit /b 1

:fail
echo.
echo No se pudo iniciar el frontend.
echo Revisa el mensaje de error mostrado arriba.
pause
endlocal
exit /b 1
