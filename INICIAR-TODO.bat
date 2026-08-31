@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.80 - Iniciar Todo
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  ========================================================
echo    Nexus One POS v2.9.80 - Iniciando todos los servicios
echo    (version visible - para depuracion)
echo  ========================================================
echo.

:: Refrescar PATH
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"

:: ============================================================
:: [1/7] Cerrar procesos anteriores
:: ============================================================
echo  [1/7] Cerrando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Listo.
echo.

:: ============================================================
:: [2/7] Detectar IP local
:: ============================================================
echo  [2/7] Detectando IP local...
set LOCAL_IP=desconocida
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do set "LOCAL_IP=%%~b"
)
set "LOCAL_IP=!LOCAL_IP: =!"
echo         IP: !LOCAL_IP!
echo.

:: ============================================================
:: [3/7] Iniciar Printer Agent
:: ============================================================
echo  [3/7] Iniciando agente de impresion (puerto 9100)...
if exist "printer-agent\agent.js" (
    start "Nexus Printer Agent" /B cmd /c "node printer-agent\agent.js 2>nul"
    timeout /t 1 /nobreak >nul
    echo         Agente iniciado.
) else (
    echo         [AVISO] No se encontro printer-agent\agent.js.
)
echo.

:: ============================================================
:: [4/7] Preparar base de datos y Prisma
:: ============================================================
echo  [4/7] Preparando base de datos y Prisma...

set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"

:: Generar cliente Prisma
if "!PKG!"=="bun" (
    call bunx prisma generate >nul 2>&1
) else (
    call npx prisma generate >nul 2>&1
)

:: Crear/actualizar base de datos
if not exist "prisma\dev.db" (
    if "!PKG!"=="bun" (
        call bunx prisma db push 2>nul
    ) else (
        call npx prisma db push 2>nul
    )
)
echo         Base de datos lista.
echo.

:: ============================================================
:: [5/7] Verificar build de produccion
:: ============================================================
echo  [5/7] Verificando build de produccion...

set "NEEDS_BUILD=0"
if not exist ".next\BUILD_ID" set "NEEDS_BUILD=1"

if "!NEEDS_BUILD!"=="1" (
    echo         Compilando aplicacion...
    if "!PKG!"=="bun" (
        call bun run build
    ) else (
        call npm run build
    )
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo  [ERROR] La compilacion fallo.
        echo.
        pause
        exit /b 1
    )
    echo         Build completado.
) else (
    echo         Build existente encontrado.
)
echo.

:: ============================================================
:: [6/7] Iniciar Caddy HTTPS
:: ============================================================
echo  [6/7] Iniciando Caddy HTTPS...
set "CADDY_STARTED=0"

if exist "caddy\caddy.exe" (
    if exist "caddy\Caddyfile" (
        cd caddy
        start "Nexus Caddy Domain" /B cmd /c "caddy.exe run --config Caddyfile 2>nul"
        cd ..
        set "CADDY_STARTED=1"
        echo         Caddy dominio: https://nexusone.ve
    )
    timeout /t 2 /nobreak >nul
    if exist "caddy\Caddyfile-mobile" (
        cd caddy
        start "Nexus Caddy Mobile" /B cmd /c "caddy.exe run --config Caddyfile-mobile 2>nul"
        cd ..
        echo         Caddy movil: https://!LOCAL_IP!:8443
    )
) else (
    echo         Caddy no encontrado, saltando HTTPS.
)
echo.

:: ============================================================
:: [7/7] Iniciar Next.js + abrir navegador
:: ============================================================
echo  [7/7] Iniciando servidor en puerto 3000...
echo.
echo  ========================================================
echo  Nexus One POS v2.9.80 - SERVIDOR ACTIVO
echo.
if "!CADDY_STARTED!"=="1" (
echo  HTTPS:  https://nexusone.ve
echo  MOVIL: https://!LOCAL_IP!:8443
)
echo  HTTP:   http://localhost:3000
echo  RED:    http://!LOCAL_IP!:3000
echo.
echo  Presione Ctrl+C para detener.
echo  ========================================================
echo.

:: Abrir navegador
if "!CADDY_STARTED!"=="1" (
    start https://nexusone.ve
) else (
    start http://localhost:3000
)

:: Iniciar servidor
if "!PKG!"=="bun" (
    call bun run start
) else (
    call npm run start
)

echo.
echo  [INFO] El servidor se ha detenido.
echo  Para reiniciar, ejecute INICIAR-TODO.bat o doble clic en el acceso directo.
echo.
pause
