# Khởi chạy đồng thời Backend (FastAPI port 8001) + Frontend (Next.js port 3000) trên máy Local
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting FPT ClassSwap Backend on http://localhost:8001 ..." -ForegroundColor Cyan
$backendProc = Start-Process -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8001" `
    -WorkingDirectory (Join-Path $root "backend") `
    -PassThru -NoNewWindow

try {
    Write-Host "Starting FPT ClassSwap Frontend on http://localhost:3000 ..." -ForegroundColor Green
    Push-Location (Join-Path $root "frontend")
    npm run dev
} finally {
    Pop-Location
    if ($backendProc -and !$backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
}
