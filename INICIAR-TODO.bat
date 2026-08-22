@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73
color 0A
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║              Nexus One POS v2.9.73                      ║
echo  ║           Iniciando todos los servicios                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: [1/5] Cerrar procesos anteriores
:: ============================================================
echo  [1/5] Cerrando procesos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Procesos anteriores cerrados.
echo.

:: ============================================================
:: [2/5] Detectar IP local
:: ============================================================
echo  [2/5] Detectando IP local para acceso movil...
set LOCAL_IP=desconocida
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do set LOCAL_IP=%%b
)
set LOCAL_IP=%LOCAL_IP: =%
echo         IP local: %LOCAL_IP%
echo.

:: ============================================================
:: [3/5] Iniciar Printer Agent en puerto 9100
:: ============================================================
echo  [3/5] Iniciando agente de impresion (puerto 9100)...
if exist "printer-agent\agent.js" (
    start "Nexus Printer Agent" /B cmd /c "node printer-agent\agent.js 2>nul"
    timeout /t 1 /nobreak >nul
    echo         Agente de impresion iniciado.
) else (
    echo         [AVISO] No se encontro printer-agent\agent.js, omitiendo.
)
echo.

:: ============================================================
:: [4/5] Generar Prisma y verificar build
:: ============================================================
echo  [4/5] Preparando base de datos y compilacion...

:: Generar cliente Prisma silenciosamente
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bunx prisma generate >nul 2>&1
) else (
    call npx prisma generate >nul 2>&1
)

echo         Prisma generado.

:: Verificar si existe el build de produccion
if not exist ".next\server" (
    echo         No se encontro build de produccion, compilando...
    where bun >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call bun run build
    ) else (
        call npm run build
    )
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERROR] La compilacion fallo. Revise los errores arriba.
        echo.
        pause
        exit /b 1
    )
    echo         Build completado.
) else (
    echo         Build de produccion encontrado, listo.
)
echo.

:: ============================================================
:: [5/5] Iniciar servidor de produccion
:: ============================================================
echo  [5/5] Iniciando servidor de produccion en puerto 3000...
echo.
echo  ┌──────────────────────────────────────────────────────────┐
echo  │  Nexus One POS v2.9.73 - SERVIDOR ACTIVO               │
echo  │                                                          │
echo  │  Local:   http://localhost:3000                          │
echo  │  Red:     http://%LOCAL_IP%:3000%                        │
echo  │                                                          │
echo  │  Presione Ctrl+C para detener el servidor.              │
echo  └──────────────────────────────────────────────────────────┘
echo.

:: Abrir navegador
echo         Abriendo navegador...
start http://localhost:3000
echo.

:: Iniciar el servidor de produccion
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bun run start
) else (
    call npm run start
)

:: Si el servidor se detiene, mostrar mensaje
echo.
echo  [INFO] El servidor se ha detenido.
echo  Para reiniciar, ejecute INICIAR-TODO.bat nuevamente.
echo.
pause
