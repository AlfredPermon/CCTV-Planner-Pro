# ==============================================================================
# make-dist.ps1 - Script de Empaquetado Automático Portátil (.zip)
# ==============================================================================
[CmdletBinding()]
param (
    [switch]$SkipBuild,
    [string]$OutputZip = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Iniciando proceso de empaquetado standalone portable... " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificación de Espacio Libre en Disco
$PathRoot = [System.IO.Path]::GetPathRoot($ScriptDir)
$DriveLetter = $PathRoot.Replace(":\", "").Replace(":", "")
$Drive = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='${DriveLetter}:'"
$MinRequiredBytes = 500MB
if ($Drive) {
    $FreeSpaceMB = [math]::Round($Drive.FreeSpace / 1MB, 2)
    Write-Host "[1/5] Espacio disponible en disco ($DriveLetter`:): $FreeSpaceMB MB" -ForegroundColor Yellow
    if ($Drive.FreeSpace -lt $MinRequiredBytes) {
        Write-Error "Espacio insuficiente en disco. Se requieren al menos 500 MB libres."
        exit 1
    }
} else {
    Write-Host "[1/5] No se pudo determinar el espacio libre en disco. Continuando..." -ForegroundColor Yellow
}

# 2. Verificación y Compilación Standalone de Next.js
if ($SkipBuild) {
    Write-Host "[2/5] Omitiendo compilación (--SkipBuild activo)..." -ForegroundColor Yellow
} else {
    Write-Host "[2/5] Ejecutando compilación Next.js (npm run build)..." -ForegroundColor Green
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "La compilación de Next.js falló con código $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}

$StandaloneDir = Join-Path $ScriptDir ".next\standalone"
if (-not (Test-Path $StandaloneDir)) {
    Write-Error "No se encontró el directorio .next\standalone. Asegúrate de tener output: 'standalone' en next.config.ts"
    exit 1
}

# 3. Agrupamiento de Distribución
Write-Host "[3/5] Construyendo estructura de distribución..." -ForegroundColor Green
$BuildScript = Join-Path $ScriptDir "scripts\distribution\build-distribution.mjs"
& node $BuildScript --skip-build
if ($LASTEXITCODE -ne 0) {
    Write-Error "El empaquetado de distribución falló con código $LASTEXITCODE."
    exit $LASTEXITCODE
}

# 4. Verificación de Integridad del Paquete
Write-Host "[4/5] Validando integridad del paquete empaquetado..." -ForegroundColor Green
$ValidateScript = Join-Path $ScriptDir "scripts\distribution\validate-package.mjs"
$PackageDir = Join-Path $ScriptDir "dist\distribution\package"
& node $ValidateScript --package-dir "$PackageDir"
if ($LASTEXITCODE -ne 0) {
    Write-Error "La validación del paquete falló con código $LASTEXITCODE."
    exit $LASTEXITCODE
}

# 5. Compresión en archivo ZIP
Write-Host "[5/5] Generando archivo comprimido (.zip)..." -ForegroundColor Green

# Leer versión desde package.json
$PackageJsonPath = Join-Path $ScriptDir "package.json"
$Version = "0.2.0"
if (Test-Path $PackageJsonPath) {
    $PkgJson = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json
    if ($PkgJson.version) { $Version = $PkgJson.version }
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if ([string]::IsNullOrWhiteSpace($OutputZip)) {
    $DistDir = Join-Path $ScriptDir "dist"
    if (-not (Test-Path $DistDir)) { New-Item -ItemType Directory -Path $DistDir | Out-Null }
    $ZipPath = Join-Path $DistDir "editor_cctv_v${Version}_portable_${Timestamp}.zip"
    $LatestZipPath = Join-Path $DistDir "editor_cctv_portable_latest.zip"
} else {
    $ZipPath = $OutputZip
    $LatestZipPath = ""
}

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Compress-Archive -Path "$PackageDir\*" -DestinationPath "$ZipPath" -Force
if ($LatestZipPath -and ($LatestZipPath -ne $ZipPath)) {
    if (Test-Path $LatestZipPath) { Remove-Item $LatestZipPath -Force }
    Copy-Item $ZipPath $LatestZipPath
}

$ZipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " ¡EMPAQUETADO COMPLETADO CON ÉXITO!                      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Archivo ZIP generado: $ZipPath ($ZipSizeMB MB)" -ForegroundColor Yellow
if ($LatestZipPath) {
    Write-Host "Copia más reciente:   $LatestZipPath" -ForegroundColor Yellow
}
Write-Host "Directorio empaquetado: $PackageDir" -ForegroundColor White
