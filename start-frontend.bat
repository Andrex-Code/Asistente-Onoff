@echo off
setlocal
cd /d "%~dp0frontend"

call npm.cmd install
if errorlevel 1 goto :fail

call npm.cmd run dev -- --host 0.0.0.0 --port 5173
if errorlevel 1 goto :fail

endlocal
exit /b 0

:fail
echo.
echo No se pudo iniciar el frontend.
echo Revisa el mensaje de error mostrado arriba.
pause
endlocal
exit /b 1
