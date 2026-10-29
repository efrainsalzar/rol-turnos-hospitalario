param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('local', 'intranet-local')]
    [string]$Profile,

    [Parameter(Position = 1)]
    [string]$IpAddress
)

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

    $lines = Get-Content $Path
    $map = [ordered]@{}
    foreach ($line in $lines) {
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

function Write-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [System.Collections.Specialized.OrderedDictionary]$Entries
    )

    $lines = foreach ($entry in $Entries.GetEnumerator()) {
        "$($entry.Key)=$($entry.Value)"
    }

    Set-Content -Path $Path -Value $lines
}

function Set-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.Specialized.OrderedDictionary]$Entries,

        [Parameter(Mandatory = $true)]
        [string]$Key,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Entries.Contains($Key)) {
        $Entries[$Key] = $Value
        return
    }

    $Entries.Add($Key, $Value)
}

function Assert-ValidIpv4 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $segments = $Value.Split('.')
    if ($segments.Length -ne 4) {
        throw "La IP '$Value' no tiene formato IPv4 valido."
    }

    foreach ($segment in $segments) {
        $parsed = 0
        if (-not [int]::TryParse($segment, [ref]$parsed)) {
            throw "La IP '$Value' no tiene formato IPv4 valido."
        }

        if ($parsed -lt 0 -or $parsed -gt 255) {
            throw "La IP '$Value' no tiene formato IPv4 valido."
        }
    }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
# Mismo criterio que apps/api/src/infrastructure/config/load-env.ts: si hay
# perfil activo (npm run env:<perfil>), se edita apps/api/.env.<perfil>.
$ApiEnvPath = Join-Path $RepoRoot 'apps\api\.env'
$SelectorPath = Join-Path $RepoRoot 'apps\api\.env.active'
if (Test-Path $SelectorPath) {
    $SelectorLine = Get-Content $SelectorPath | Where-Object { $_ -match '^API_ENV_PROFILE=' } | Select-Object -First 1
    $ActiveProfile = if ($SelectorLine) { ($SelectorLine -replace '^API_ENV_PROFILE=', '').Trim() } else { '' }
    if ($ActiveProfile) {
        $ApiEnvPath = Join-Path $RepoRoot "apps\api\.env.$ActiveProfile"
    }
}
$WebEnvPath = Join-Path $RepoRoot 'apps\web\.env'

$apiEntries = Read-EnvFile -Path $ApiEnvPath
$webEntries = Read-EnvFile -Path $WebEnvPath

$WebPort = if ($webEntries.Contains('VITE_DEV_SERVER_PORT')) { $webEntries['VITE_DEV_SERVER_PORT'] } else { '3001' }
$ApiPort = if ($apiEntries.Contains('PORT')) { $apiEntries['PORT'] } else { '3000' }

switch ($Profile) {
    'local' {
        Set-EnvValue -Entries $apiEntries -Key 'HOST' -Value 'localhost'
        Set-EnvValue -Entries $apiEntries -Key 'CORS_ORIGINS' -Value "http://localhost:$WebPort,http://127.0.0.1:$WebPort"

        Set-EnvValue -Entries $webEntries -Key 'PUBLIC_URL' -Value "http://localhost:$WebPort"
        Set-EnvValue -Entries $webEntries -Key 'VITE_APP_BASE_NAME' -Value '/'
        Set-EnvValue -Entries $webEntries -Key 'VITE_API_BASE_URL' -Value "http://localhost:$ApiPort"
    }
    'intranet-local' {
        if (-not $IpAddress) {
            throw "Debes indicar la IPv4 local. Ejemplo: npm run env:access:intranet-local -- 192.168.1.250"
        }

        Assert-ValidIpv4 -Value $IpAddress

        Set-EnvValue -Entries $apiEntries -Key 'HOST' -Value '0.0.0.0'
        Set-EnvValue -Entries $apiEntries -Key 'CORS_ORIGINS' -Value "http://localhost:$WebPort,http://127.0.0.1:$WebPort,http://${IpAddress}:$WebPort"

        Set-EnvValue -Entries $webEntries -Key 'PUBLIC_URL' -Value "http://${IpAddress}:$WebPort"
        Set-EnvValue -Entries $webEntries -Key 'VITE_APP_BASE_NAME' -Value '/'
        Set-EnvValue -Entries $webEntries -Key 'VITE_API_BASE_URL' -Value "http://${IpAddress}:$ApiPort"
    }
}

Write-EnvFile -Path $ApiEnvPath -Entries $apiEntries
Write-EnvFile -Path $WebEnvPath -Entries $webEntries

Write-Host "[set-access-profile] Perfil de acceso activado: $Profile" -ForegroundColor Green
Write-Host "[set-access-profile] API .env actualizado: $ApiEnvPath" -ForegroundColor Green
Write-Host "[set-access-profile] WEB .env actualizado: $WebEnvPath" -ForegroundColor Green

if ($Profile -eq 'intranet-local') {
    Write-Host "[set-access-profile] IP local configurada: $IpAddress" -ForegroundColor Green
}
