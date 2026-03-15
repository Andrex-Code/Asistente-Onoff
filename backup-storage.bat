@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0backup-storage.ps1"
if %errorlevel% neq 0 (
  echo Error al crear backup.
  exit /b 1
)
echo Backup finalizado correctamente.
endlocal
