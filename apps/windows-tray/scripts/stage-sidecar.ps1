#!/usr/bin/env pwsh
# Stage the sidecar resources for a local Visual Studio dev build of the Windows tray app.
# Idempotent: clears the sidecar dir then copies fresh artifacts.
#
# Output:
#   apps/windows-tray/DeepCode/Resources/sidecar/
#     ├── cli.mjs
#     ├── package.json
#     ├── node_modules/   (prod-only)
#     ├── docs/tools/
#     └── node.exe        (copy of `where.exe node` for dev; CI uses the official Node release)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path "$PSScriptRoot/../../..").Path
$sidecar = Join-Path $root "apps/windows-tray/DeepCode/Resources/sidecar"

Write-Host "[stage-sidecar] Building CLI..."
Push-Location $root
try {
    npm run build
}
finally {
    Pop-Location
}

Write-Host "[stage-sidecar] Resetting $sidecar"
if (Test-Path $sidecar) {
    Get-ChildItem -Path $sidecar -Force -Exclude '.gitkeep' | Remove-Item -Recurse -Force
}
else {
    New-Item -ItemType Directory -Force -Path $sidecar | Out-Null
}
if (-not (Test-Path (Join-Path $sidecar '.gitkeep'))) {
    New-Item -ItemType File -Force -Path (Join-Path $sidecar '.gitkeep') | Out-Null
}

Copy-Item (Join-Path $root "dist/cli.mjs") (Join-Path $sidecar "cli.mjs") -Force
Copy-Item (Join-Path $root "package.json") (Join-Path $sidecar "package.json") -Force

Write-Host "[stage-sidecar] Installing prod-only node_modules..."
$work = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("deepcode-stage-" + [guid]::NewGuid().ToString("N"))) -Force
try {
    Copy-Item (Join-Path $root "package.json") (Join-Path $work "package.json")
    Copy-Item (Join-Path $root "package-lock.json") (Join-Path $work "package-lock.json")
    Push-Location $work
    try {
        npm ci --omit=dev --ignore-scripts
    }
    finally {
        Pop-Location
    }
    Copy-Item (Join-Path $work "node_modules") (Join-Path $sidecar "node_modules") -Recurse -Force
}
finally {
    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path (Join-Path $sidecar "docs/tools") | Out-Null
Copy-Item (Join-Path $root "docs/tools/*") (Join-Path $sidecar "docs/tools") -Recurse -Force

$localNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrEmpty($localNode)) {
    Write-Warning "[stage-sidecar] No system node.exe found; bundle will be missing the runtime binary."
}
else {
    Copy-Item $localNode (Join-Path $sidecar "node.exe") -Force
}

Write-Host "[stage-sidecar] Done."
