@echo off
setlocal
cd /d "%~dp0backend"

where python >nul 2>nul
if errorlevel 1 goto :missing_python

if not exist .env (
  copy .env.example .env >nul
  echo Se creo backend\.env desde .env.example. Revisa OPENAI_API_KEY y credenciales admin.
)

if not exist .venv (
  echo Creando entorno virtual del backend...
  python -m venv .venv
  if errorlevel 1 goto :fail
)

call .venv\Scripts\activate
if errorlevel 1 goto :fail

echo Instalando dependencias del backend...
python -m pip install -r requirements.txt
if errorlevel 1 goto :fail

echo Iniciando backend en http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port 8000
if errorlevel 1 goto :fail

endlocal
exit /b 0

:missing_python
echo.
echo Python no esta instalado o no esta en PATH.
echo Instala Python 3.11+ antes de ejecutar este script.
pause
endlocal
exit /b 1

:fail
echo.
echo No se pudo iniciar el backend.
echo Revisa el mensaje de error mostrado arriba.
pause
endlocal
exit /b 1
