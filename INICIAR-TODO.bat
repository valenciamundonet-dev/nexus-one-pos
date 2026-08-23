@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.77
color 0A
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: Refrescar PATH desde el registro
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "PATH=%%B;!PATH!"

echo.
echo  ========================================================
echo     Nexus One POS v2.9.77 - Iniciando todo el sistema
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
:: [1/7] Cerrar procesos anteriores
:: ============================================================
echo  [1/7] Cerrando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo          Listo.
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
echo          IP: !LOCAL_IP!
echo.

:: ============================================================
:: [3/7] Iniciar Printer Agent
:: ============================================================
echo  [3/7] Iniciando agente de impresion (puerto 9100)...
if exist "printer-agent\agent.js" (
    start "Nexus Printer Agent" /B cmd /c "node printer-agent\agent.js 2>nul"
    timeout /t 1 /nobreak >nul
    echo          Agente iniciado.
) else (
    echo          [AVISO] No se encontro printer-agent\agent.js, omitiendo.
)
echo.

:: ============================================================
:: [4/7] Verificar dependencias y Prisma
:: ============================================================
echo  [4/7] Preparando base de datos y Prisma...

set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"

:: Si no hay node_modules, instalar dependencias
if not exist "node_modules" (
    echo          Instalando dependencias...
    if "!PKG!"=="bun" (
        call bun install
    ) else (
        call npm install --legacy-peer-deps
    )
    if !ERRORLEVEL! NEQ 0 (
        echo  [ERROR] No se pudieron instalar dependencias.
        pause
        exit /b 1
    )
)

:: Generar cliente Prisma
if "!PKG!"=="bun" (
    call bunx prisma generate >nul 2>&1
) else (
    call npx prisma generate >nul 2>&1
)

:: Crear/actualizar base de datos (prisma db push)
if "!PKG!"=="bun" (
    call bunx prisma db push 2>nul
) else (
    call npx prisma db push 2>nul
)
echo          Base de datos lista (!PKG!).
echo.

:: ============================================================
:: [5/7] Verificar build de produccion
:: ============================================================
echo  [5/7] Verificando build de produccion...

set "NEEDS_BUILD=0"
if not exist ".next\BUILD_ID" set "NEEDS_BUILD=1"
if not exist ".next\server" set "NEEDS_BUILD=1"

if "!NEEDS_BUILD!"=="1" (
    echo          Compilando aplicacion...
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
:: [6/7] Iniciar Caddy HTTPS (si esta disponible)
:: ============================================================
if not "!CADDY_EXE!"=="" (
    echo  [6/7] Iniciando Caddy HTTPS...
    if exist "Caddyfile" (
        set DOMAIN=!CADDY_DOMAIN!
        start "Nexus Caddy HTTPS" /B cmd /c ""!CADDY_EXE!" run --config "%~dp0Caddyfile" 2>nul"
        timeout /t 3 /nobreak >nul
        echo          Caddy iniciado: https://!CADDY_DOMAIN!
    ) else (
        echo          [AVISO] No se encontro Caddyfile.
    )
) else (
    echo  [6/7] Caddy no instalado, saltando HTTPS.
)
echo.

:: ============================================================
:: [7/7] Iniciar servidor Next.js + abrir navegador
:: ============================================================
echo  [7/7] Iniciando servidor en puerto 3000...
echo.
echo  ========================================================
echo  Nexus One POS v2.9.77 - SERVIDOR ACTIVO
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

:: Abrir navegador
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
