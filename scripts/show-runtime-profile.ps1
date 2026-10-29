$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Read-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "No existe el archivo $Path"
    }

    $map = [ordered]@{}
    foreach ($line in Get-Content $Path) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $trimmed = $line.Trim()
        if ($trimmed.StartsWith('#')) {
            continue
        }

        $parts = $trimmed -split '\s*=\s*', 2
        if ($parts.Length -ne 2) {
            continue
        }

        $map[$parts[0].Trim()] = $parts[1].Trim()
    }

    return $map
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
# Mismo criterio que apps/api/src/infrastructure/config/load-env.ts: si hay
# perfil activo (npm run env:<perfil>), la API carga apps/api/.env.<perfil>.
$ApiEnvPath = Join-Path $RepoRoot 'apps\api\.env'
$ActiveProfile = ''
$SelectorPath = Join-Path $RepoRoot 'apps\api\.env.active'
if (Test-Path $SelectorPath) {
    $SelectorLine = Get-Content $SelectorPath | Where-Object { $_ -match '^API_ENV_PROFILE=' } | Select-Object -First 1
    if ($SelectorLine) {
        $ActiveProfile = ($SelectorLine -replace '^API_ENV_PROFILE=', '').Trim()
    }
    if ($ActiveProfile) {
        $ApiEnvPath = Join-Path $RepoRoot "apps\api\.env.$ActiveProfile"
    }
}
$WebEnvPath = Join-Path $RepoRoot 'apps\web\.env'

$apiEntries = Read-EnvFile -Path $ApiEnvPath
$webEntries = Read-EnvFile -Path $WebEnvPath

$dbName = if ($apiEntries.Contains('DB_NAME')) { $apiEntries['DB_NAME'] } else { '' }
$dbProfile = if ($apiEntries.Contains('DB_PROFILE')) { $apiEntries['DB_PROFILE'] } else { '' }
$apiPort = if ($apiEntries.Contains('PORT')) { $apiEntries['PORT'] } else { '' }
$apiHost = if ($apiEntries.Contains('HOST')) { $apiEntries['HOST'] } else { 'localhost' }
$corsOrigins = if ($apiEntries.Contains('CORS_ORIGINS')) { $apiEntries['CORS_ORIGINS'] } else { '' }

$publicUrl = if ($webEntries.Contains('PUBLIC_URL')) { $webEntries['PUBLIC_URL'] } else { '' }
$apiBaseUrl = if ($webEntries.Contains('VITE_API_BASE_URL')) { $webEntries['VITE_API_BASE_URL'] } else { '' }
$webPort = if ($webEntries.Contains('VITE_DEV_SERVER_PORT')) { $webEntries['VITE_DEV_SERVER_PORT'] } else { '' }

$dbTarget = if ($ActiveProfile) { $ActiveProfile } else { 'sin perfil (apps/api/.env)' }

$accessProfile = if ($publicUrl -match '^http://localhost:' -and $apiBaseUrl -match '^http://localhost:' -and $apiHost -eq 'localhost') {
    'local'
} elseif ($publicUrl -match '^http://\d{1,3}(\.\d{1,3}){3}:' -and $apiBaseUrl -match '^http://\d{1,3}(\.\d{1,3}){3}:') {
    'intranet-local'
} else {
    'personalizado'
}

# Un color por perfil: demo = datos ficticios, sin riesgo; preparacion =
# copia de trabajo con datos reales; produccion o cualquier otro caso = rojo,
# revisar antes de ejecutar algo.
$ProfileColor = switch ($dbTarget) {
    'demo' { 'Magenta'; break }
    'preparacion' { 'Blue'; break }
    default { 'Red'; break }
}

Write-Host "[env:status] Entorno de datos: $dbTarget" -ForegroundColor $ProfileColor
Write-Host "[env:status] Base de datos: $dbName" -ForegroundColor $ProfileColor
if ($dbProfile) {
    Write-Host "[env:status] Perfil SQL: $dbProfile" -ForegroundColor $ProfileColor
}
if ($apiPort) {
    Write-Host "[env:status] Puerto API: $apiPort" -ForegroundColor $ProfileColor
}
Write-Host "[env:status] Perfil de acceso: $accessProfile" -ForegroundColor $ProfileColor
Write-Host "[env:status] Host API: $apiHost" -ForegroundColor $ProfileColor
if ($webPort) {
    Write-Host "[env:status] Puerto WEB: $webPort" -ForegroundColor $ProfileColor
}
if ($publicUrl) {
    Write-Host "[env:status] PUBLIC_URL WEB: $publicUrl" -ForegroundColor $ProfileColor
}
if ($apiBaseUrl) {
    Write-Host "[env:status] VITE_API_BASE_URL: $apiBaseUrl" -ForegroundColor $ProfileColor
}
if ($corsOrigins) {
    Write-Host "[env:status] CORS_ORIGINS: $corsOrigins" -ForegroundColor $ProfileColor
}
Write-Host "[env:status] API .env activo: $ApiEnvPath" -ForegroundColor $ProfileColor
Write-Host "[env:status] WEB .env activo: $WebEnvPath" -ForegroundColor $ProfileColor
