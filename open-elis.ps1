# open-elis.ps1
# One-click launcher: starts the frontend (Vite) and opens browser.
# Compatible with Windows PowerShell 5.1 and PowerShell 7+.

$ErrorActionPreference = 'Stop'

# Project root (use script directory to avoid hard-coded paths)
$project = Split-Path -Path $PSCommandPath -Parent

# Desktop shortcut
$desk = [Environment]::GetFolderPath('Desktop')
$link = Join-Path $desk 'elis-frontend.lnk'

function Get-PowerShellExe {
    $cmd = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return (Get-Command powershell -ErrorAction Stop).Source
}

function Ensure-DesktopShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$LinkPath,
        [Parameter(Mandatory = $true)][string]$PsExe,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    if (Test-Path $LinkPath) { return }

    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($LinkPath)
    $sc.TargetPath = $PsExe
    $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $sc.WorkingDirectory = $WorkingDirectory
    $sc.Save()
}

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$EnvPath)
    if (-not (Test-Path $EnvPath)) { return }

    Get-Content $EnvPath | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path ("Env:\" + $name) -Value $value
        }
    }
}

$psExe = Get-PowerShellExe

# Manual install mode
if ($args -contains '-InstallShortcut') {
    Ensure-DesktopShortcut -LinkPath $link -PsExe $psExe -ScriptPath $PSCommandPath -WorkingDirectory $project
    Write-Host ("Shortcut created on Desktop: " + $link)
    exit 0
}

# Auto-create shortcut if missing
try {
    Ensure-DesktopShortcut -LinkPath $link -PsExe $psExe -ScriptPath $PSCommandPath -WorkingDirectory $project
} catch {
    Write-Warning ("Failed to create Desktop shortcut: " + $_.Exception.Message)
}

# Load env vars
Import-DotEnv -EnvPath (Join-Path $project '.env')

$port = $env:VITE_PORT
if (-not $port) { $port = $env:PORT }
if (-not $port) { $port = 5173 }

$url = $env:APP_URL
if (-not $url) { $url = ("http://localhost:" + $port) }

# Check if port is listening
$listening = $false
try {
    $conn = Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { $listening = $true }
} catch { $listening = $false }

if (-not $listening) {
    Write-Host "No running server detected. Starting: npm run dev ..."
    Start-Process $psExe -ArgumentList @("-NoExit", "-Command", "cd `"$project`"; npm run dev -- --port $port --strictPort")

    # Wait until the port is actually listening (max ~60s)
    $maxTries = 60
    for ($i = 0; $i -lt $maxTries; $i++) {
        Start-Sleep -Seconds 1
        try {
            $conn = Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($conn) { $listening = $true; break }
        } catch { }
    }
} else {
    Write-Host "Server already running. Skipping start."
}

Start-Process $url
