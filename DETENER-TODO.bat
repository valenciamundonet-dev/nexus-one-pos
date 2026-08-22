@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Detener
color 0C

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         Nexus One POS v2.9.73 - Deteniendo servicios     ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Cerrar procesos Node.js (servidor Next.js y printer-agent)
echo  [1/2] Deteniendo procesos Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Procesos Node.exe finalizados.
) else (
    echo         No se encontraron procesos Node.exe activos.
)

:: Cerrar especificamente el agente de impresion
echo  [2/2] Deteniendo agente de impresion...
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "agent.js"') do (
    taskkill /F /PID %%a >nul 2>&1
)
:: Verificar que node.exe no siga ejecutando agent.js
timeout /t 1 /nobreak >nul
echo         Agente de impresion verificado.
echo.
echo  ─────────────────────────────────────────────────────────
echo   Todos los servicios de Nexus One POS han sido detenidos.
  ─────────────────────────────────────────────────────────
echo.
timeout /t 5
