@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preparar-extension.ps1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" (
  echo El preparador termino con codigo %EXITCODE%.
) else (
  echo Preparacion finalizada correctamente.
)
echo.
pause
exit /b %EXITCODE%
