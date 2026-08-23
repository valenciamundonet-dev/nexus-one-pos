@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.75 - Instalador Completo
color 0A
setlocal enabledelayedexpansion

echo.
echo  ========================================================
echo    Nexus One POS v2.9.75 - Instalador Completo
echo    Sistema Punto de Venta Professional
echo    Incluye Caddy HTTPS local automatico
echo  ========================================================
echo.
echo  ESTE INSTALADOR REALIZARA UNA INSTALACION LIMPIA.
echo  Se eliminaran: node_modules, .next, .env y la base de datos.
echo  Luego se compilara todo y se configurara Caddy HTTPS.
echo.
pause
echo.

cd /d "%~dp0"

:: ============================================================
:: PASO 1/13: Cerrar procesos previos
:: ============================================================
echo  [1/13] Cerrando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo          Listo.
echo.

:: ============================================================
:: PASO 2/13: Limpieza total
:: ============================================================
echo  [2/13] Limpiando archivos de instalacion anterior...
if exist node_modules rd /s /q node_modules 2>nul
if exist .next rd /s /q .next 2>nul
if exist .env del .env 2>nul
if exist prisma\dev.db del prisma\dev.db 2>nul
if exist prisma\dev.db-journal del prisma\dev.db-journal 2>nul
if exist prisma\dev.db-wal del prisma\dev.db-wal 2>nul
if exist prisma\dev.db-shm del prisma\dev.db-shm 2>nul
if exist .prisma rd /s /q .prisma 2>nul
if exist printer-agent\spool rd /s /q printer-agent\spool 2>nul
if exist respaldos rd /s /q respaldos 2>nul
if exist INICIAR-CADDY.bat del INICIAR-CADDY.bat 2>nul
if exist DETENER-CADDY.bat del DETENER-CADDY.bat 2>nul
if exist caddy-access.log del caddy-access.log 2>nul

:: Eliminar accesos directos antiguos
if exist "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" del "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\MyeCommerce.lnk" del "%USERPROFILE%\Desktop\MyeCommerce.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\Nexus One POS.lnk" del "%USERPROFILE%\Desktop\Nexus One POS.lnk" 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommercePOS" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommerceHidden" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NexusOnePOS" /f >nul 2>&1

echo          Limpieza completada.
echo.

:: ============================================================
:: PASO 3/13: Refrescar PATH del sistema
:: ============================================================
echo  [3/13] Refrescando PATH del sistema...
set "SYS_PATH="
set "USR_PATH="
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "SYS_PATH=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "USR_PATH=%%B"
if defined SYS_PATH set "PATH=!SYS_PATH;!PATH!"
if defined USR_PATH set "PATH=!USR_PATH;!PATH!"
echo          PATH actualizado.
echo.

:: ============================================================
:: PASO 4/13: Verificar Node.js 18+
:: ============================================================
echo  [4/13] Verificando Node.js...
set "NODE_FOUND=0"
where node >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "NODE_FOUND=1"
) else (
    echo          Buscando en rutas tipicas...
    for %%P in (
        "%ProgramFiles%\nodejs\node.exe"
        "%ProgramFiles(x86)%\nodejs\node.exe"
        "%LocalAppData%\Programs\nodejs\node.exe"
        "C:\Program Files\nodejs\node.exe"
        "C:\Program Files (x86)\nodejs\node.exe"
    ) do (
        if exist %%P (
            set "PATH=!PATH!;%%~dP%%~pP"
            set "NODE_FOUND=1"
            echo          [OK] Encontrado en: %%P
        )
    )
)

if "!NODE_FOUND!"=="0" (
    echo.
    echo  [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo.
    echo  Si acaba de instalar Node.js:
    echo    1. CIERRA esta ventana
    echo    2. ABRA UNA NUEVA ventana CMD
    echo    3. Vuelva a ejecutar INSTALAR.bat
    echo.
    echo  O descarguelo de: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v 2^>^&1') do set "NODEVER=%%i"
set "NODEVER=!NODEVER: =!"
set "VER_CLEAN=!NODEVER:v=!"
set "MAJOR=0"
for /f "tokens=1 delims=." %%a in ("!VER_CLEAN!") do set "MAJOR=%%a"

echo          Node.js !NODEVER! (v!MAJOR!) - Compatible.
echo.

if !MAJOR! LSS 18 (
    echo  [ERROR] Node.js !NODEVER! es demasiado antiguo. Se requiere v18+.
    echo  Descargue de https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: PASO 5/13: Verificar conexion a internet
:: ============================================================
echo  [5/13] Verificando conexion a internet...
ping -n 1 -w 3000 registry.npmjs.org >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo  [ADVERTENCIA] No se detecto conexion.
    echo  Presione ENTER para continuar o Ctrl+C para cancelar...
    pause >nul
) else (
    echo          Conexion OK.
)
echo.

:: ============================================================
:: PASO 6/13: Instalar dependencias
:: ============================================================
if not exist "package.json" (
    echo  [ERROR] No se encontro package.json.
    pause
    exit /b 1
)

echo  [6/13] Instalando dependencias...
set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"
echo          Gestor: !PKG!

if "!PKG!"=="bun" (
    call bun install
) else (
    call npm install --legacy-peer-deps
)
if !ERRORLEVEL! NEQ 0 (
    echo  [REINTENTO] Limpiando e instalando con --force...
    if exist node_modules rd /s /q node_modules 2>nul
    if "!PKG!"=="bun" (
        call bun install
    ) else (
        call npm install --legacy-peer-deps --force
    )
    if !ERRORLEVEL! NEQ 0 (
        echo  [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)
echo          Dependencias instaladas.
echo.

:: ============================================================
:: PASO 7/13: Generar Prisma
:: ============================================================
echo  [7/13] Generando cliente Prisma...
if "!PKG!"=="bun" (
    call bunx prisma generate
) else (
    call npx prisma generate
)
if !ERRORLEVEL! NEQ 0 (
    echo  [ERROR] Fallo la generacion de Prisma.
    pause
    exit /b 1
)
echo          Prisma generado.
echo.

:: ============================================================
:: PASO 8/13: Crear base de datos
:: ============================================================
echo  [8/13] Creando base de datos SQLite...
if "!PKG!"=="bun" (
    call bunx prisma db push
) else (
    call npx prisma db push
)
if !ERRORLEVEL! NEQ 0 (
    echo  [ERROR] Fallo la creacion de la base de datos.
    pause
    exit /b 1
)
echo          Base de datos creada.
echo.

:: ============================================================
:: PASO 9/13: Crear .env
:: ============================================================
echo  [9/13] Configurando .env...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo          Creado desde .env.example
    ) else (
        echo DATABASE_URL="file:./dev.db"> .env
        echo APP_PORT=3000>> .env
        echo NODE_ENV=production>> .env
        echo          Creado con valores predeterminados
    )
) else (
    echo          Ya existe, se conserva.
)
echo.

:: ============================================================
:: PASO 10/13: Compilar aplicacion (next build)
:: ============================================================
echo  [10/13] Compilando aplicacion (next build)...
echo          Esto puede tardar 1-3 minutos...
echo.

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
echo.
echo          Compilacion exitosa.
echo.

:: ============================================================
:: PASO 11/13: Instalar y configurar Caddy HTTPS
:: ============================================================
echo  [11/13] Instalando Caddy para HTTPS local...

:: Dominio local por defecto
set "CADDY_DOMAIN=nexusone.ve"

:: Verificar si Caddy ya esta instalado
set "CADDY_EXE="
where caddy >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    for /f "delims=" %%C in ('where caddy 2^>nul') do set "CADDY_EXE=%%C"
    echo          Caddy ya instalado: !CADDY_EXE!
) else (
    if exist "%LocalAppData%\Caddy\caddy.exe" (
        set "CADDY_EXE=%LocalAppData%\Caddy\caddy.exe"
        set "PATH=!PATH!;%LocalAppData%\Caddy"
        echo          Caddy encontrado en: !CADDY_EXE!
    )
)

if "!CADDY_EXE!"=="" (
    echo          Descargando Caddy para Windows...
    if not exist "%LocalAppData%\Caddy" mkdir "%LocalAppData%\Caddy"

    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile '%TEMP%\caddy.zip' -UseBasicParsing; Write-Host 'DOWNLOAD_OK' } catch { Write-Host 'DOWNLOAD_FAIL' }" 2>nul | findstr /C:"DOWNLOAD_OK" >nul

    if not exist "%TEMP%\caddy.zip" (
        echo          [AVISO] No se pudo descargar Caddy automaticamente.
        echo          Puede descargarlo manualmente de https://caddyserver.com/download
        echo          y copiar caddy.exe a: %LocalAppData%\Caddy\
        echo.
        echo          El sistema funcionara en http://localhost:3000 sin HTTPS.
        goto CADDY_SKIP
    )

    echo          Extrayendo...
    powershell -Command "Expand-Archive -Path '%TEMP%\caddy.zip' -DestinationPath '%TEMP%\caddy_extract' -Force" 2>nul
    if exist "%TEMP%\caddy_extract\caddy.exe" (
        copy /Y "%TEMP%\caddy_extract\caddy.exe" "%LocalAppData%\Caddy\caddy.exe" >nul
        set "CADDY_EXE=%LocalAppData%\Caddy\caddy.exe"
        echo          Caddy instalado en: !CADDY_EXE!
    ) else (
        :: Buscar en subcarpetas
        for /r "%TEMP%\caddy_extract" %%F in (caddy.exe) do (
            copy /Y "%%F" "%LocalAppData%\Caddy\caddy.exe" >nul
            set "CADDY_EXE=%LocalAppData%\Caddy\caddy.exe"
        )
    )
    rd /s /q "%TEMP%\caddy_extract" >nul 2>&1
    del "%TEMP%\caddy.zip" >nul 2>&1

    :: Agregar al PATH del usuario
    set "CADDY_DIR=%LocalAppData%\Caddy"
    set "ADD_PATH=1"
    for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do (
        set "CUR_PATH=%%B"
        echo !CUR_PATH! | findstr /I /C:"Caddy" >nul
        if !ERRORLEVEL! EQU 0 set "ADD_PATH=0"
    )
    if "!ADD_PATH!"=="1" (
        if defined CUR_PATH (
            reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "!CUR_PATH!;!CADDY_DIR!" /f >nul 2>&1
        ) else (
            reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "!CADDY_DIR!" /f >nul 2>&1
        )
        set "PATH=!PATH!;!CADDY_DIR!"
        echo          Caddy agregado al PATH del usuario.
    )
)

:CADDY_SKIP

:: Configurar archivo hosts para DNS local
if defined CADDY_EXE (
    echo          Configurando DNS local...
    set "HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts"

    :: Detectar IP local
    set "LOCAL_IP=127.0.0.1"
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
        for /f "tokens=*" %%b in ("%%a") do set "LOCAL_IP=%%~b"
    )
    set "LOCAL_IP=!LOCAL_IP: =!"

    findstr /I /C:"!CADDY_DOMAIN!" "%HOSTS_FILE%" >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo          Solicitando permisos para DNS local (UAC)...
        echo Set objShell = CreateObject("Shell.Application") > "%TEMP%\nexus_hosts.vbs"
        echo objShell.ShellExecute "cmd", "/c echo !LOCAL_IP! !CADDY_DOMAIN! >> %HOSTS_FILE%", "", "runas", 0 >> "%TEMP%\nexus_hosts.vbs"
        cscript //nologo "%TEMP%\nexus_hosts.vbs" >nul 2>&1
        del "%TEMP%\nexus_hosts.vbs" >nul 2>&1
        timeout /t 3 /nobreak >nul
        echo          !CADDY_DOMAIN! -> !LOCAL_IP! configurado.
    ) else (
        echo          DNS local ya configurado.
    )

    :: Generar Caddyfile con la IP detectada
    echo  # Nexus One POS - Caddy HTTPS Local> Caddyfile
    echo  # Generado automaticamente por INSTALAR.bat>> Caddyfile
    echo.>> Caddyfile
    echo  !CADDY_DOMAIN! {>> Caddyfile
    echo   reverse_proxy localhost:3000>> Caddyfile
    echo   header {>> Caddyfile
    echo     X-Content-Type-Options "nosniff">> Caddyfile
    echo     X-Frame-Options "SAMEORIGIN">> Caddyfile
    echo   }>> Caddyfile
    echo   encode gzip zstd>> Caddyfile
    echo  }>> Caddyfile

    echo          Caddyfile generado para https://!CADDY_DOMAIN!
    echo          Caddy instalado y configurado correctamente.
) else (
    echo          Caddy no disponible. Se usara HTTP en localhost:3000.
)
echo.

:: ============================================================
:: PASO 12/13: Acceso directo + carpetas finales
:: ============================================================
echo  [12/13] Creando acceso directo en el escritorio...
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\nexus_shortcut.vbs"
echo strDesktop = WshShell.SpecialFolders("Desktop") >> "%TEMP%\nexus_shortcut.vbs"
echo Set oShellLink = WshShell.CreateShortcut(strDesktop ^& "\Nexus One POS.lnk") >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.TargetPath = "%~dp0INICIAR-TODO.bat" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.WorkingDirectory = "%~dp0" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Description = "Nexus One POS v2.9.75" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.IconLocation = "shell32.dll,14" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Save >> "%TEMP%\nexus_shortcut.vbs"
cscript //nologo "%TEMP%\nexus_shortcut.vbs" >nul 2>&1
del "%TEMP%\nexus_shortcut.vbs" >nul 2>&1

if not exist "respaldos" mkdir "respaldos"
echo          Acceso directo creado.
echo.

:: ============================================================
:: PASO 13/13: Guardar configuracion para INICIAR-TODO
:: ============================================================
echo  [13/13] Guardando configuracion...

:: Guardar el dominio configurado para que INICIAR-TODO lo use
if defined CADDY_EXE (
    echo !CADDY_DOMAIN!> .caddy-domain
    echo set CADDY_DOMAIN=!CADDY_DOMAIN!> .caddy-env.bat
    echo set CADDY_EXE=!CADDY_EXE!>> .caddy-env.bat
) else (
    if exist .caddy-domain del .caddy-domain 2>nul
    if exist .caddy-env.bat del .caddy-env.bat 2>nul
)

echo          Configuracion guardada.
echo.

:: ============================================================
:: INSTALACION COMPLETADA
:: ============================================================
echo.
echo  ========================================================
echo     INSTALACION COMPLETADA EXITOSAMENTE
echo  ========================================================
echo.
if defined CADDY_EXE (
echo  Acceso HTTPS: https://!CADDY_DOMAIN!
echo  Acceso HTTP:  http://localhost:3000
echo  Acceso RED:   http://!LOCAL_IP!:3000
) else (
echo  Acceso:       http://localhost:3000
)
echo.
echo  Para iniciar el sistema:
echo    - Doble clic en "Nexus One POS" del Escritorio
echo    - O ejecute: INICIAR-TODO.bat
echo.
echo  El sistema abrira automaticamente en su navegador.
echo.
echo  USUARIO POR DEFECTO: admin / admin
echo.
echo  Nexus One POS v2.9.75
echo.
pause
