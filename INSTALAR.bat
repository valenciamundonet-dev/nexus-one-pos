@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.80 - Instalador Completo
color 0A
setlocal enabledelayedexpansion

echo.
echo  ========================================================
echo    Nexus One POS v2.9.80 - Instalador Profesional
echo    Sistema Punto de Venta - Venezuela
echo    Doble Moneda USD/Bs + Impresion Termica + Caddy HTTPS
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
:: PASO 1/11: Cerrar procesos previos
:: ============================================================
echo  [ 1/11] Cerrando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM caddy.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo           Listo.
echo.

:: ============================================================
:: PASO 2/11: Limpieza total
:: ============================================================
echo  [ 2/11] Limpiando archivos de instalacion anterior...
if exist node_modules rd /s /q node_modules 2>nul
if exist .next rd /s /q .next 2>nul
if exist .prisma rd /s /q .prisma 2>nul
if exist .env del .env 2>nul
if exist prisma\dev.db del prisma\dev.db 2>nul
if exist prisma\dev.db-journal del prisma\dev.db-journal 2>nul
if exist prisma\dev.db-wal del prisma\dev.db-wal 2>nul
if exist prisma\dev.db-shm del prisma\dev.db-shm 2>nul
if exist printer-agent\spool rd /s /q printer-agent\spool 2>nul
if exist caddy\caddy.exe del caddy\caddy.exe 2>nul
if exist .caddy-env.bat del .caddy-env.bat 2>nul
if exist .caddy-domain del .caddy-domain 2>nul

:: Eliminar accesos directos antiguos
if exist "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" del "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\MyeCommerce.lnk" del "%USERPROFILE%\Desktop\MyeCommerce.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\Nexus One POS.lnk" del "%USERPROFILE%\Desktop\Nexus One POS.lnk" 2>nul

:: Eliminar claves de registro (tolerante - no falla si no existen)
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommercePOS" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommerceHidden" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NexusOnePOS" /f >nul 2>&1

echo           Limpieza completada.
echo.

:: ============================================================
:: PASO 3/11: Refrescar PATH del sistema
:: ============================================================
echo  [ 3/11] Refrescando PATH del sistema...
set "SYS_PATH="
set "USR_PATH="
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "SYS_PATH=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "USR_PATH=%%B"
if defined SYS_PATH set "PATH=!SYS_PATH;!PATH!"
if defined USR_PATH set "PATH=!USR_PATH;!PATH!"
echo           PATH actualizado.
echo.

:: ============================================================
:: PASO 4/11: Verificar Node.js 18+
:: ============================================================
echo  [ 4/11] Verificando Node.js...
set "NODE_FOUND=0"
where node >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "NODE_FOUND=1"
) else (
    echo           Buscando en rutas tipicas...
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
            echo           [OK] Encontrado en: %%P
        )
    )
)

if "!NODE_FOUND!"=="0" (
    echo.
    echo  [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo  Descarguelo de https://nodejs.org (version 20 LTS recomendada)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v 2^>^&1') do set "NODEVER=%%i"
set "NODEVER=!NODEVER: =!"
set "VER_CLEAN=!NODEVER:v=!"
set "MAJOR=0"
for /f "tokens=1 delims=." %%a in ("!VER_CLEAN!") do set "MAJOR=%%a"

if !MAJOR! LSS 18 (
    echo.
    echo  [ERROR] Node.js !NODEVER! es demasiado antiguo. Se requiere v18+.
    echo  Descargue de https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo           Node.js !NODEVER! (v!MAJOR!) - Compatible.
echo.

:: ============================================================
:: PASO 5/11: Verificar conexion a internet
:: ============================================================
echo  [ 5/11] Verificando conexion a internet...
ping -n 1 -w 3000 registry.npmjs.org >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo  [ADVERTENCIA] No se detecto conexion.
    echo  Presione ENTER para continuar o Ctrl+C para cancelar...
    pause >nul
) else (
    echo           Conexion OK.
)
echo.

:: ============================================================
:: PASO 6/11: Instalar dependencias
:: ============================================================
if not exist "package.json" (
    echo  [ERROR] No se encontro package.json.
    pause
    exit /b 1
)

echo  [ 6/11] Instalando dependencias...
set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"
echo           Gestor: !PKG!

if "!PKG!"=="bun" (
    call bun install
    if !ERRORLEVEL! NEQ 0 goto DEPS_RETRY
    goto DEPS_OK
) else (
    call npm install --legacy-peer-deps
    if !ERRORLEVEL! NEQ 0 goto DEPS_RETRY
    goto DEPS_OK
)

:DEPS_RETRY
echo  [REINTENTO] Limpiando e instalando...
if exist node_modules rd /s /q node_modules 2>nul
if "!PKG!"=="bun" (
    call bun install
) else (
    call npm cache clean --force
    call npm install --legacy-peer-deps --force
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo  [ERROR] No se pudieron instalar las dependencias.
    echo  Soluciones: actualice Node.js, verifique conexion a internet.
    echo.
    pause
    exit /b 1
)

:DEPS_OK
echo           Dependencias instaladas.
echo.

:: ============================================================
:: PASO 7/11: Generar Prisma + Base de Datos
:: ============================================================
echo  [ 7/11] Generando Prisma y creando base de datos...
if "!PKG!"=="bun" (
    call bunx prisma generate
    if !ERRORLEVEL! NEQ 0 (
        echo  [ERROR] Fallo la generacion de Prisma.
        pause
        exit /b 1
    )
    call bunx prisma db push
    if !ERRORLEVEL! NEQ 0 (
        echo  [ERROR] Fallo la creacion de la base de datos.
        pause
        exit /b 1
    )
) else (
    call npx prisma generate
    if !ERRORLEVEL! NEQ 0 (
        echo  [REINTENTO] Reintentando prisma generate...
        call npx prisma generate
        if !ERRORLEVEL! NEQ 0 (
            echo  [ERROR] Fallo la generacion de Prisma.
            pause
            exit /b 1
        )
    )
    call npx prisma db push
    if !ERRORLEVEL! NEQ 0 (
        echo  [REINTENTO] Reintentando prisma db push...
        call npx prisma db push
        if !ERRORLEVEL! NEQ 0 (
            echo  [ERROR] Fallo la creacion de la base de datos.
            pause
            exit /b 1
        )
    )
)
echo           Prisma + BD listos.
echo.

:: ============================================================
:: PASO 8/11: Crear .env
:: ============================================================
echo  [ 8/11] Configurando .env...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo           Creado desde .env.example
    ) else (
        echo DATABASE_URL="file:./dev.db"> .env
        echo APP_PORT=3000>> .env
        echo NODE_ENV=production>> .env
        echo           Creado con valores predeterminados
    )
) else (
    echo           Ya existe, se conserva.
)
echo.

:: ============================================================
:: PASO 9/11: Compilar aplicacion (next build)
:: ============================================================
echo  [ 9/11] Compilando aplicacion (next build)...
echo           Esto puede tardar 1-3 minutos...
echo.

if "!PKG!"=="bun" (
    call bun run build
) else (
    call npm run build
)
if !ERRORLEVEL! NEQ 0 (
    echo  [REINTENTO] Reintentando compilacion...
    call npm run build
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo  [ERROR] La compilacion fallo.
        echo  Posibles soluciones: actualice Node.js, revise errores arriba.
        echo.
        pause
        exit /b 1
    )
)
echo.
echo           Compilacion exitosa.
echo.

:: ============================================================
:: PASO 10/11: Instalar y configurar Caddy HTTPS
:: ============================================================
echo  [10/11] Configurando Caddy HTTPS...
set "CADDY_DOMAIN=nexusone.ve"
set "CADDY_EXE="
set "CADDY_OK=0"

:: Buscar Caddy en PATH o ubicaciones conocidas
where caddy >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    for /f "delims=" %%C in ('where caddy 2^>nul') do set "CADDY_EXE=%%C"
    echo           Caddy encontrado en PATH.
    set "CADDY_OK=1"
)
if "!CADDY_OK!"=="0" (
    if exist "%LocalAppData%\Caddy\caddy.exe" (
        set "CADDY_EXE=%LocalAppData%\Caddy\caddy.exe"
        set "PATH=!PATH!;%LocalAppData%\Caddy"
        echo           Caddy encontrado en AppData.
        set "CADDY_OK=1"
    )
)
if "!CADDY_OK!"=="0" (
    if exist "caddy\caddy.exe" (
        set "CADDY_EXE=%~dp0caddy\caddy.exe"
        echo           Caddy encontrado en caddy\.
        set "CADDY_OK=1"
    )
)

if "!CADDY_OK!"=="0" (
    echo           Descargando Caddy para Windows...
    if not exist "caddy" mkdir "caddy"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile '%~dp0caddy\caddy.exe' -UseBasicParsing; Write-Host 'DOWNLOAD_OK' } catch { Write-Host 'DOWNLOAD_FAIL' }" 2>nul | findstr /C:"DOWNLOAD_OK" >nul
    if exist "caddy\caddy.exe" (
        set "CADDY_EXE=%~dp0caddy\caddy.exe"
        echo           Caddy descargado e instalado.
        set "CADDY_OK=1"
    ) else (
        echo           [AVISO] No se pudo descargar Caddy.
        echo           Puede descargarlo de https://caddyserver.com/download
        echo           y copiar caddy.exe a la carpeta caddy\.
        echo           El sistema funcionara en http://localhost:3000 sin HTTPS.
        goto CADDY_SKIP
    )
)

:: Configurar DNS local en hosts
echo           Configurando DNS local...
set "HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts"
findstr /I /C:"!CADDY_DOMAIN!" "%HOSTS_FILE%" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo           Agregando nexusone.ve al archivo hosts...
    echo Set objShell = CreateObject("Shell.Application") > "%TEMP%\nexus_hosts.vbs"
    echo objShell.ShellExecute "cmd", "/c echo 127.0.0.1    !CADDY_DOMAIN! >> %HOSTS_FILE%", "", "runas", 0 >> "%TEMP%\nexus_hosts.vbs"
    cscript //nologo "%TEMP%\nexus_hosts.vbs" >nul 2>&1
    del "%TEMP%\nexus_hosts.vbs" >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo           DNS local ya configurado.
)

:: Configurar Caddyfiles
if not exist "caddy\Caddyfile" (
    echo # Nexus One POS - Caddy HTTPS Local> caddy\Caddyfile
    echo http://nexusone.ve {>> caddy\Caddyfile
    echo     redir https://nexusone.ve{uri}>> caddy\Caddyfile
    echo }>> caddy\Caddyfile
    echo nexusone.ve {>> caddy\Caddyfile
    echo     tls internal>> caddy\Caddyfile
    echo     reverse_proxy localhost:3000>> caddy\Caddyfile
    echo }>> caddy\Caddyfile
)

if not exist "caddy\Caddyfile-mobile" (
    echo {> caddy\Caddyfile-mobile
    echo     admin off>> caddy\Caddyfile-mobile
    echo }>> caddy\Caddyfile-mobile
    echo :8443 {>> caddy\Caddyfile-mobile
    echo     tls internal>> caddy\Caddyfile-mobile
    echo     reverse_proxy localhost:3000>> caddy\Caddyfile-mobile
    echo     header {>> caddy\Caddyfile-mobile
    echo         Cross-Origin-Embedder-Policy "credentialless">> caddy\Caddyfile-mobile
    echo         Cross-Origin-Opener-Policy "same-origin">> caddy\Caddyfile-mobile
    echo         X-Content-Type-Options "nosniff">> caddy\Caddyfile-mobile
    echo     }>> caddy\Caddyfile-mobile
    echo }>> caddy\Caddyfile-mobile
)

:: Confiar en certificado SSL de Caddy
echo           Instalando certificado SSL...
pushd caddy
caddy.exe trust 2>nul
popd

:: Firewall puerto 8443
echo           Configurando firewall...
netsh advfirewall firewall delete rule name="Nexus POS Mobile 8443" >nul 2>&1
netsh advfirewall firewall add rule name="Nexus POS Mobile 8443" dir=in action=allow protocol=TCP localport=8443 profile=private,public >nul 2>&1

:CADDY_SKIP
echo.

:: ============================================================
:: PASO 11/11: Acceso directo + carpetas finales
:: ============================================================
echo  [11/11] Creando acceso directo en el escritorio...

:: Crear acceso directo -> INICIAR-TODO-OCULTO.vbs (inicio SIN ventanas de consola)
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\nexus_shortcut.vbs"
echo strDesktop = WshShell.SpecialFolders("Desktop") >> "%TEMP%\nexus_shortcut.vbs"
echo Set oShellLink = WshShell.CreateShortcut(strDesktop ^& "\Nexus One POS.lnk") >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.TargetPath = "%~dp0INICIAR-TODO-OCULTO.vbs" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.WorkingDirectory = "%~dp0" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Description = "Nexus One POS v2.9.80" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.IconLocation = "shell32.dll,14" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Save >> "%TEMP%\nexus_shortcut.vbs"
cscript //nologo "%TEMP%\nexus_shortcut.vbs" >nul 2>&1
del "%TEMP%\nexus_shortcut.vbs" >nul 2>&1

if not exist "respaldos" mkdir "respaldos"
echo           Acceso directo creado (apunta a inicio oculto).
echo.

:: ============================================================
:: INSTALACION COMPLETADA
:: ============================================================
echo.
echo  ========================================================
echo     INSTALACION COMPLETADA EXITOSAMENTE
echo  ========================================================
echo.
if "!CADDY_OK!"=="1" (
echo  Acceso HTTPS:  https://!CADDY_DOMAIN!
echo  Acceso HTTP:   http://localhost:3000
echo  Acceso Movil:  https://IP_LOCAL:8443
) else (
echo  Acceso:        http://localhost:3000
echo  (Caddy no disponible - instale como Administrador para HTTPS)
)
echo.
echo  Para iniciar el sistema:
echo    - Doble clic en "Nexus One POS" del Escritorio
echo    - El sistema iniciara SIN ventanas de consola
echo    - Se abrira automaticamente en su navegador
echo.
echo  Para detener: ejecute DETENER-TODO.bat
echo.
echo  USUARIO POR DEFECTO: admin / admin
echo.
echo  Nexus One POS v2.9.80
echo.
pause
