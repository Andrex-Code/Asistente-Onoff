param(
  [string]$ProjectRoot = $PSScriptRoot,
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $OutputRoot) {
  $OutputRoot = Join-Path $ProjectRoot "backups"
}

$backendDir = Join-Path $ProjectRoot "backend"
$envPath = Join-Path $backendDir ".env"
$defaultStorage = Join-Path $backendDir "storage"
$storageDir = $defaultStorage

if (Test-Path $envPath) {
  $lines = Get-Content $envPath
  foreach ($line in $lines) {
    if ($line -match "^\s*APP_STORAGE_DIR\s*=\s*(.+?)\s*$") {
      $value = $matches[1].Trim().Trim('"').Trim("'")
      if ($value) {
        $storageDir = $value
      }
    }
  }
}

if (-not (Test-Path $storageDir)) {
  throw "No existe APP_STORAGE_DIR: $storageDir"
}

New-Item -Path $OutputRoot -ItemType Directory -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "asistente_onoff_backup_$timestamp.zip"
$zipPath = Join-Path $OutputRoot $zipName

Compress-Archive -Path (Join-Path $storageDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force

Write-Output "Backup creado: $zipPath"
