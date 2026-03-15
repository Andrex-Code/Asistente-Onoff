@echo off
setlocal
cd /d "%~dp0"

start "Asistente ONOFF - Backend" cmd /k call "%~dp0start-backend.bat"
start "Asistente ONOFF - Frontend" cmd /k call "%~dp0start-frontend.bat"

echo.
echo Servicios iniciados en ventanas separadas.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
endlocal
