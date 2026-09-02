$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$expectedBranch = 'security/hardening-2026-08-25'
$defaultBackend = 'https://asistente-onoff-git-security-ha-421b0a-andres-projects-bf9797b2.vercel.app'
$nodeDir = Join-Path $env:USERPROFILE 'Tools\node'
$settingsFile = Join-Path $repoRoot '.local-extension-settings.ps1'
$oldInstallConfig = Join-Path $repoRoot 'dist\Asistente-Onoff\src\install-config.js'

function Fail([string]$message) {
  Write-Host ''
  Write-Host "ERROR: $message" -ForegroundColor Red
  exit 1
}

function Read-JsString([string]$path, [string]$name) {
  if (-not (Test-Path $path)) { return '' }
  $text = Get-Content -Raw -LiteralPath $path
  $pattern = [regex]::Escape("globalThis.$name") + '\s*=\s*"([^"]*)"'
  $match = [regex]::Match($text, $pattern)
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

Write-Host '=== Preparador Asistente ONOFF ===' -ForegroundColor Green

if (Test-Path (Join-Path $nodeDir 'node.exe')) {
  $env:PATH = "$nodeDir;$env:PATH"
}
$env:NODE_USE_SYSTEM_CA = '1'

try { $nodeVersion = (& node -v) } catch { Fail "No se encontró Node. Debe existir en $nodeDir" }
try { $npmVersion = (& npm -v) } catch { Fail 'No se encontró npm.' }
Write-Host "Node: $nodeVersion | npm: $npmVersion"

try { $currentBranch = (& git branch --show-current).Trim() } catch { Fail 'Git no está disponible.' }
if ($currentBranch -ne $expectedBranch) {
  & git checkout $expectedBranch
  if ($LASTEXITCODE -ne 0) { Fail "No fue posible cambiar a $expectedBranch" }
}

& git pull
if ($LASTEXITCODE -ne 0) { Fail 'git pull falló.' }

$env:ONOFF_BACKEND_URL = $defaultBackend
$env:ONOFF_VERCEL_BYPASS = ''

if (Test-Path $settingsFile) {
  . $settingsFile
}

if (-not $env:ONOFF_VERCEL_BYPASS) {
  $recoveredBypass = Read-JsString $oldInstallConfig 'ONOFF_VERCEL_BYPASS'
  if ($recoveredBypass) {
    $env:ONOFF_VERCEL_BYPASS = $recoveredBypass
    @(
      '# Configuración local. No se sube a GitHub.',
      ('$env:ONOFF_VERCEL_BYPASS = ' + "'" + $recoveredBypass.Replace("'", "''") + "'")
    ) | Set-Content -LiteralPath $settingsFile -Encoding UTF8
    Write-Host 'Bypass de Preview recuperado y guardado localmente.' -ForegroundColor Green
  }
}

if (-not $env:ONOFF_VERCEL_BYPASS) {
  Write-Host ''
  Write-Host 'Falta guardar por primera vez el bypass de Vercel.' -ForegroundColor Yellow
  Write-Host 'Copie Protection Bypass for Automation desde Vercel y vuelva a ejecutar este preparador.'
  $clipboard = (Get-Clipboard -Raw).Trim()
  if ($clipboard -match '^[A-Za-z0-9._~-]{16,512}$') {
    $env:ONOFF_VERCEL_BYPASS = $clipboard
    @(
      '# Configuración local. No se sube a GitHub.',
      ('$env:ONOFF_VERCEL_BYPASS = ' + "'" + $clipboard.Replace("'", "''") + "'")
    ) | Set-Content -LiteralPath $settingsFile -Encoding UTF8
    Write-Host 'Bypass guardado localmente.' -ForegroundColor Green
  } else {
    Fail 'El portapapeles no contiene un bypass válido.'
  }
}

$installToken = (Get-Clipboard -Raw).Trim()
if ($installToken -notmatch '^onoff_install_[A-Za-z0-9_-]{30,120}$') {
  Write-Host ''
  Write-Host 'Falta una credencial de paquete en el portapapeles.' -ForegroundColor Yellow
  Write-Host 'Se abrirá el panel administrativo.'
  Write-Host 'Genere un paquete, deje que copie la credencial y vuelva a hacer doble clic en PREPARAR-EXTENSION.cmd.'
  Start-Process "$defaultBackend/admin"
  exit 2
}
$env:ONOFF_INSTALL_TOKEN = $installToken

if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
  Write-Host 'Instalando dependencias...'
  & npm install
  if ($LASTEXITCODE -ne 0) { Fail 'npm install falló.' }
}

Write-Host 'Construyendo extensión...'
& npm run build-extension
if ($LASTEXITCODE -ne 0) { Fail 'La construcción de la extensión falló.' }

$out = Join-Path $repoRoot 'dist\Asistente-Onoff'
if (-not (Test-Path (Join-Path $out 'manifest.json'))) { Fail 'No se generó manifest.json en dist\Asistente-Onoff.' }

Write-Host ''
Write-Host 'LISTO.' -ForegroundColor Green
Write-Host "Carpeta para cargar en el navegador: $out"
Write-Host 'Abra edge://extensions, chrome://extensions o brave://extensions y use Cargar descomprimida.'
Write-Host 'No entregue la raíz del repositorio: entregue únicamente dist\Asistente-Onoff.'
