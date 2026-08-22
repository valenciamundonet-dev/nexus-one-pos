#Requires -Version 5.1
<#
.SYNOPSIS
    Nexus One POS v2.9.73 — Iniciar aplicacion completa (app + agente de impresion)
.DESCRIPTION
    Script de inicio para Windows. Detecta bun/npm, instala dependencias,
    inicializa la base de datos SQLite (WAL) y levanta ambos servicios.
.PARAMETER SkipInstall
    Omitir la instalacion de dependencias (bun install / npm install)
.PARAMETER Production
    Ejecutar en modo produccion (next start en vez de next dev)
.EXAMPLE
    .\INICIAR-TODO.ps1
    .\INICIAR-TODO.ps1 -SkipInstall
    .\INICIAR-TODO.ps1 -Production
#>

param(
    [switch]$SkipInstall,
    [switch]$Production
)

# --- English code comments, Spanish user-facing messages ---

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Nexus One POS — Iniciando...'

$APP_PORT = if ($env:APP_PORT) { $env:APP_PORT } else { '3000' }
$PRINTER_PORT = if ($env:PRINTER_AGENT_PORT) { $env:PRINTER_AGENT_PORT } else { '9100' }
$DB_PATH = 'prisma\dev.db'

Write-Host ''
Write-Host '╔═══════════════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║        Nexus One POS v2.9.73 — Inicio Rapido        ║' -ForegroundColor Cyan
Write-Host '║        Next.js 15 + Bun + SQLite WAL + shadcn/ui    ║' -ForegroundColor Cyan
Write-Host '╚═══════════════════════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''

# ─── 1. Check runtime availability ───────────────────────────
$bunCmd = $null
$npmCmd = 'npm'

if (Get-Command bun -ErrorAction SilentlyContinue) {
    $bunCmd = 'bun'
    Write-Host '[OK] Bun detectado:' (bun --version) -ForegroundColor Green
} else {
    Write-Host '[INFO] Bun no encontrado. Se usara npm como alternativa.' -ForegroundColor Yellow
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host '[OK] npm detectado:' (npm --version) -ForegroundColor Green
    } else {
        Write-Host '[ERROR] No se encontro bun ni npm. Instale Bun desde https://bun.sh' -ForegroundColor Red
        exit 1
    }
}

# Helper: run command with preferred package manager
function Invoke-Pkg {
    param([string]$Command)
    if ($bunCmd) {
        & bun $Command
    } else {
        & npm $Command
    }
}

# ─── 2. Install dependencies ─────────────────────────────────
if (-not $SkipInstall) {
    Write-Host ''
    Write-Host '[1/5] Instalando dependencias...' -ForegroundColor White
    Invoke-Pkg 'install'
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[ERROR] Fallo la instalacion de dependencias.' -ForegroundColor Red
        exit 1
    }
    Write-Host '[OK] Dependencias instaladas.' -ForegroundColor Green
} else {
    Write-Host '[1/5] Instalacion omitida (-SkipInstall).' -ForegroundColor Yellow
}

# ─── 3. Generate Prisma client ───────────────────────────────
Write-Host ''
Write-Host '[2/5] Generando cliente Prisma...' -ForegroundColor White
if ($bunCmd) {
    & bunx prisma generate
} else {
    & npx prisma generate
}
if ($LASTEXITCODE -ne 0) {
    Write-Host '[ERROR] Fallo la generacion del cliente Prisma.' -ForegroundColor Red
    exit 1
}
Write-Host '[OK] Cliente Prisma generado.' -ForegroundColor Green

# ─── 4. Push database schema (SQLite WAL) ────────────────────
Write-Host ''
Write-Host '[3/5] Sincronizando esquema de base de datos...' -ForegroundColor White
if ($bunCmd) {
    & bunx prisma db push --skip-generate
} else {
    & npx prisma db push --skip-generate
}
if ($LASTEXITCODE -ne 0) {
    Write-Host '[WARN] La sincronizacion de esquema fallo. Continuando...' -ForegroundColor Yellow
} else {
    Write-Host '[OK] Base de datos SQLite (WAL) sincronizada.' -ForegroundColor Green
}

# Verify DB file exists
if (Test-Path $DB_PATH) {
    $dbSize = (Get-Item $DB_PATH).Length / 1KB
    Write-Host "[OK] Base de datos: $DB_PATH ($([math]::Round($dbSize, 1)) KB)" -ForegroundColor Green
} else {
    Write-Host "[WARN] No se encontro $DB_PATH. Se creara al primer acceso." -ForegroundColor Yellow
}

# ─── 5. Start Printer Agent ──────────────────────────────────
Write-Host ''
Write-Host '[4/5] Iniciando agente de impresion (puerto $PRINTER_PORT)...' -ForegroundColor White
$agentPath = Join-Path $PSScriptRoot 'printer-agent' 'agent.js'
if (Test-Path $agentPath) {
    $agentProc = Start-Process -FilePath 'node' -ArgumentList $agentPath `
        -Environment @{ PORT = $PRINTER_PORT } `
        -WindowStyle Minimized -PassThru
    Write-Host "[OK] Agente de impresion iniciado (PID: $($agentProc.Id))" -ForegroundColor Green
    Start-Sleep -Seconds 1
} else {
    Write-Host '[WARN] No se encontro printer-agent/agent.js. El agente no se iniciara.' -ForegroundColor Yellow
}

# ─── 6. Start Next.js application ────────────────────────────
Write-Host ''
Write-Host '[5/5] Iniciando Nexus One POS (puerto $APP_PORT)...' -ForegroundColor White
Write-Host ''
Write-Host '╔═══════════════════════════════════════════════════════╗' -ForegroundColor Green
Write-Host '║  Nexus One POS listo en http://localhost:' + $APP_PORT + '          ║' -ForegroundColor Green
Write-Host '║  Agente de impresion en http://localhost:' + $PRINTER_PORT + '     ║' -ForegroundColor Green
Write-Host '║  Presione Ctrl+C para detener ambos servicios.       ║' -ForegroundColor Green
Write-Host '╚═══════════════════════════════════════════════════════╝' -ForegroundColor Green
Write-Host ''

$Host.UI.RawUI.WindowTitle = "Nexus One POS v2.9.73 — localhost:$APP_PORT"

try {
    if ($Production) {
        Invoke-Pkg 'run start'
    } else {
        Invoke-Pkg 'run dev'
    }
} finally {
    # Cleanup: stop printer agent on exit
    if ($agentProc -and -not $agentProc.HasExited) {
        Stop-Process -Id $agentProc.Id -Force -ErrorAction SilentlyContinue
        Write-Host ''
        Write-Host '[INFO] Agente de impresion detenido.' -ForegroundColor Yellow
    }
    Write-Host '[INFO] Nexus One POS detenido. Hasta pronto.' -ForegroundColor Yellow
}
