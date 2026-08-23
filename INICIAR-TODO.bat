@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.75
color 0A
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: Refrescar PATH desde el registro
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"

echo.
echo  ========================================================
echo     Nexus One POS v2.9.75 - Iniciando todo el sistema
echo  ========================================================
echo.

:: Cargar configuracion de Caddy si existe
set "CADDY_DOMAIN=nexusone.ve"
set "CADDY_EXE="
if exist ".caddy-env.bat" (
    call .caddy-env.bat
)
where caddy >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    for /f "delims=" %%C in ('where caddy 2^>nul') do set "CADDY_EXE=%%C"
)
if "!CADDY_EXE!"=="" (
    if exist "%LocalAppData%\Caddy\caddy.exe" (
        set "CADDY_EXE=%LocalAppData%\Caddy\caddy.exe"
        set "PATH=!PATH!;%LocalAppData%\Caddy"
    )
)

:: ============================================================
:: [1/6] Cerrar procesos anteriores
:: ============================================================
echo  [1/6] Cerrando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo          Listo.
echo.

:: ============================================================
:: [2/6] Detectar IP local
:: ============================================================
echo  [2/6] Detectando IP local...
set LOCAL_IP=desconocida
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do set "LOCAL_IP=%%~b"
)
set "LOCAL_IP=!LOCAL_IP: =!"
echo          IP: !LOCAL_IP!
echo.

:: ============================================================
:: [3/6] Iniciar Printer Agent
:: ============================================================
echo  [3/6] Iniciando agente de impresion (puerto 9100)...
if exist "printer-agent\agent.js" (
    start "Nexus Printer Agent" /B cmd /c "node printer-agent\agent.js 2>nul"
    timeout /t 1 /nobreak >nul
    echo          Agente iniciado.
) else (
    echo          [AVISO] No se encontro printer-agent\agent.js, omitiendo.
)
echo.

:: ============================================================
:: [4/6] Verificar build de produccion
:: ============================================================
echo  [4/6] Verificando build de produccion...

set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"

:: Generar cliente Prisma
if "!PKG!"=="bun" (
    call bunx prisma generate >nul 2>&1
) else (
    call npx prisma generate >nul 2>&1
)
echo          Prisma generado (!PKG!).

:: Verificar build
set "NEEDS_BUILD=0"
if not exist ".next\BUILD_ID" set "NEEDS_BUILD=1"
if not exist ".next\server" set "NEEDS_BUILD=1"

if "!NEEDS_BUILD!"=="1" (
    echo          No se encontro build, compilando...
    if "!PKG!"=="bun" (
        call bun run build
    ) else (
        call npm run build
    )
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo  [ERROR] La compilacion fallo.
        pause
        exit /b 1
    )
    echo          Build completado.
) else (
    echo          Build existente encontrado, listo.
)
echo.

:: ============================================================
:: [5/6] Iniciar Caddy HTTPS (si esta disponible)
:: ============================================================
if not "!CADDY_EXE!"=="" (
    echo  [5/6] Iniciando Caddy HTTPS... 
    if exist "Caddyfile" (
        set DOMAIN=!CADDY_DOMAIN!
        start "Nexus Caddy HTTPS" /B cmd /c ""!CADDY_EXE!" run --config "%~dp0Caddyfile" 2>nul"
        timeout /t 3 /nobreak >nul
        echo          Caddy iniciado: https://!CADDY_DOMAIN!
    ) else (
        echo          [AVISO] No se encontro Caddyfile, Caddy no iniciado.
    )
) else (
    echo  [5/6] Caddy no instalado, saltando HTTPS.
)
echo.

:: ============================================================
:: [6/6] Iniciar servidor Next.js + abrir navegador
:: ============================================================
echo  [6/6] Iniciando servidor en puerto 3000...
echo.
echo  ========================================================
echo  Nexus One POS v2.9.75 - SERVIDOR ACTIVO
echo.
if not "!CADDY_EXE!"=="" (
echo  HTTPS:  https://!CADDY_DOMAIN!
)
echo  HTTP:   http://localhost:3000
echo  RED:    http://!LOCAL_IP!:3000
echo.
echo  Presione Ctrl+C para detener el servidor.
echo  ========================================================
echo.

:: Abrir navegador - preferir HTTPS si Caddy esta activo
if not "!CADDY_EXE!"=="" (
    echo          Abriendo navegador (HTTPS)...
    start https://!CADDY_DOMAIN!
) else (
    echo          Abriendo navegador (HTTP)...
    start http://localhost:3000
)
echo.

:: Iniciar el servidor de produccion
if "!PKG!"=="bun" (
    call bun run start
) else (
    call npm run start
)

echo.
echo  [INFO] El servidor se ha detenido.
echo  Para reiniciar, ejecute INICIAR-TODO.bat.
echo.
pause
