# Xentra — Install GCC via MSYS2 pacman
# Assumes MSYS2 is installed at C:\msys64 (or installs it via winget)

$ErrorActionPreference = 'Continue'

Write-Host '════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host '  Installing C / C++ (GCC) via MSYS2' -ForegroundColor Cyan
Write-Host '════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host ''

# ── 1. Ensure MSYS2 is installed ──
if (-not (Test-Path 'C:\msys64')) {
    Write-Host '→ MSYS2 not found. Installing via winget...' -ForegroundColor Yellow
    winget install -e --id MSYS2.MSYS2 --silent `
        --accept-package-agreements --accept-source-agreements --disable-interactivity

    if (-not (Test-Path 'C:\msys64')) {
        Write-Host '✗ MSYS2 install failed.' -ForegroundColor Red
        Read-Host 'Press Enter to close'
        exit 1
    }
    Write-Host '✓ MSYS2 installed.' -ForegroundColor Green
} else {
    Write-Host '✓ MSYS2 found at C:\msys64' -ForegroundColor Green
}

Write-Host ''
Write-Host '→ Installing GCC inside MSYS2 (this takes 2-5 minutes)...' -ForegroundColor Cyan
Write-Host ''

# ── 2. Install GCC via pacman ──
$bashPath = 'C:\msys64\usr\bin\bash.exe'
if (-not (Test-Path $bashPath)) {
    Write-Host '✗ MSYS2 bash not found.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

& $bashPath -lc "pacman -Sy --noconfirm --needed mingw-w64-x86_64-gcc mingw-w64-x86_64-gdb mingw-w64-x86_64-make"

if ($LASTEXITCODE -eq 0 -and (Test-Path 'C:\msys64\mingw64\bin\gcc.exe')) {
    Write-Host ''
    Write-Host '✓ GCC installed successfully!' -ForegroundColor Green
    Write-Host '  Verifying...' -ForegroundColor DarkGray
    & 'C:\msys64\mingw64\bin\gcc.exe' --version | Select-Object -First 1
    Write-Host ''
    Write-Host '→ Xentra will auto-detect GCC. Click Refresh on the Integrations page.' -ForegroundColor Cyan
} else {
    Write-Host ''
    Write-Host "✗ pacman failed (exit $LASTEXITCODE)." -ForegroundColor Red
    Write-Host 'Try opening MSYS2 manually and running:' -ForegroundColor Yellow
    Write-Host '   pacman -Sy mingw-w64-x86_64-gcc' -ForegroundColor Yellow
}

Write-Host ''
Read-Host 'Press Enter to close'