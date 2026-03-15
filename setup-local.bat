@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  Preparacion local - Asistente ONOFF
echo ==========================================
echo.

where python >nul 2>nul
if errorlevel 1 goto :missing_python

where node >nul 2>nul
if errorlevel 1 goto :missing_node

echo [1/4] Verificando archivos de entorno...
if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo - backend\.env creado desde ejemplo.
)
if not exist frontend\.env (
  copy frontend\.env.example frontend\.env >nul
  echo - frontend\.env creado desde ejemplo.
)

echo [2/4] Preparando backend...
cd /d "%~dp0backend"
if not exist .venv (
  python -m venv .venv
  if errorlevel 1 goto :fail
)
call .venv\Scripts\activate
if errorlevel 1 goto :fail
python -m pip install -r requirements.txt
if errorlevel 1 goto :fail

echo [3/4] Preparando frontend...
cd /d "%~dp0frontend"
call npm.cmd install
if errorlevel 1 goto :fail

echo [4/4] Preparacion completada.
echo.
echo Siguientes pasos:
echo - Revisa backend\.env y configura OPENAI_API_KEY y credenciales admin.
echo - Revisa frontend\.env y confirma VITE_API_URL.
echo - Ejecuta start-all.bat para abrir backend y frontend.
echo.
pause
endlocal
exit /b 0

:missing_python
echo Python no esta instalado o no esta en PATH.
echo Instala Python 3.11+ y vuelve a ejecutar setup-local.bat.
pause
endlocal
exit /b 1

:missing_node
echo Node.js no esta instalado o no esta en PATH.
echo Instala Node.js 20+ y vuelve a ejecutar setup-local.bat.
pause
endlocal
exit /b 1

:fail
echo.
echo No se pudo completar la preparacion local.
echo Revisa el mensaje de error mostrado arriba.
pause
endlocal
exit /b 1
