param(
    [string]$CaFile,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$exitCode = 1
$securePassword = $null
$passwordBuffer = [IntPtr]::Zero
$plainPassword = $null
$previousUrl = [Environment]::GetEnvironmentVariable('BILLING_OPERATOR_DATABASE_URL', 'Process')
$previousCa = [Environment]::GetEnvironmentVariable('BILLING_OPERATOR_CA_FILE', 'Process')

try {
    $workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
    $projectRef = [IO.File]::ReadAllText((Join-Path $workspace 'supabase/.temp/project-ref')).Trim()
    $pooler = [Uri]([IO.File]::ReadAllText((Join-Path $workspace 'supabase/.temp/pooler-url')).Trim())
    if ($projectRef -cnotmatch '^[a-z0-9]{20}$' -or $pooler.Scheme -cnotin @('postgres', 'postgresql') -or
        $pooler.Host -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com$' -or
        $pooler.Port -ne 5432 -or $pooler.AbsolutePath -cne '/postgres' -or $pooler.Query -or $pooler.Fragment -or
        [Uri]::UnescapeDataString($pooler.UserInfo) -cne "postgres.$projectRef") {
        throw 'Invalid linked pooler metadata'
    }
    foreach ($name in @('PADDLE_ENVIRONMENT', 'VITE_PADDLE_ENVIRONMENT', 'VITE_PADDLE_CLIENT_TOKEN', 'PADDLE_API_KEY', 'VITE_SUPABASE_URL')) {
        if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) { throw 'Provider environment missing' }
    }
    if ($CaFile) {
        $resolvedCa = (Resolve-Path -LiteralPath $CaFile).Path
        if (-not [IO.File]::Exists($resolvedCa)) { throw 'Certificate unavailable' }
    }
    $node = (Get-Command node -CommandType Application -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $workspace 'output/billing-postgres-tools/node_modules/pg/lib/index.js'))) {
        throw 'Local operator driver unavailable'
    }

    if ($ValidateOnly) {
        Write-Output 'Local input prerequisites verified. No password read, network connection or database operation performed.'
        $exitCode = 0
    } else {
        Write-Host "Read-only inspection of linked Supabase project $projectRef. No migrations or repairs."
        $securePassword = Read-Host 'PostgreSQL database password (hidden)' -AsSecureString
        if ($securePassword.Length -eq 0) { throw 'Empty password' }
        $passwordBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBuffer)
        $env:BILLING_OPERATOR_DATABASE_URL = 'postgresql://postgres.{0}:{1}@{2}:5432/postgres' -f $projectRef, [Uri]::EscapeDataString($plainPassword), $pooler.Host
        if ($CaFile) { $env:BILLING_OPERATOR_CA_FILE = $resolvedCa }
        & $node (Join-Path $PSScriptRoot 'accountBillingTargetPreflight.mjs')
        $exitCode = $LASTEXITCODE
    }
} catch {
    [Console]::Error.WriteLine('Read-only target setup unavailable. Check linked project, local pg driver and provider environment. No secret is printed.')
} finally {
    [Environment]::SetEnvironmentVariable('BILLING_OPERATOR_DATABASE_URL', $previousUrl, 'Process')
    [Environment]::SetEnvironmentVariable('BILLING_OPERATOR_CA_FILE', $previousCa, 'Process')
    if ($passwordBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBuffer) }
    if ($securePassword) { $securePassword.Dispose() }
    $plainPassword = $null
}
exit $exitCode
