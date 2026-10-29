param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('demo', 'preparacion', 'produccion')]
    [string]$Target
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ApiDir = Join-Path $RepoRoot 'apps\api'
$ProfilePath = Join-Path $ApiDir ".env.$Target"
$ExamplePath = Join-Path $ApiDir ".env.$Target.example"
$SelectorPath = Join-Path $ApiDir '.env.active'

if (-not (Test-Path $ProfilePath)) {
    Write-Host "[set-api-env] ERROR: No existe $ProfilePath" -ForegroundColor Red
    Write-Host "[set-api-env] Copia $ExamplePath a $ProfilePath y completa sus valores." -ForegroundColor Red
    exit 1
}

# Solo se registra que perfil esta activo: la API carga .env.<perfil>
# directamente (apps/api/src/infrastructure/config/load-env.ts), sin copiarlo
# sobre .env, para que no exista una copia que se desincronice.
Set-Content -Path $SelectorPath -Value "API_ENV_PROFILE=$Target" -Encoding ascii

# Mismo criterio de color que show-runtime-profile.ps1: demo = magenta (datos
# ficticios), preparacion = azul (copia de trabajo con datos reales),
# produccion = rojo (base oficial, no se resetea).
$ProfileColor = switch ($Target) {
    'demo' { 'Magenta'; break }
    'preparacion' { 'Blue'; break }
    'produccion' { 'Red'; break }
}

Write-Host "[set-api-env] Perfil API activo: $Target" -ForegroundColor $ProfileColor
Write-Host "[set-api-env] Archivo cargado: $ProfilePath" -ForegroundColor $ProfileColor
