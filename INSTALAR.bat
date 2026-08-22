@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Instalador
color 0A
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║           Nexus One POS v2.9.73 - Instalador            ║
echo  ║         Sistema Punto de Venta Professional            ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  ESTE INSTALADOR REALIZARA UNA INSTALACION LIMPIA.
echo  Se eliminaran: node_modules, .next, .env y la base de datos.
echo.
pause
echo.

cd /d "%~dp0"

:: ============================================================
:: Funcion de barra de progreso
:: ============================================================
:showProgress
set /a "filled=%~1 / 2"
set /a "empty=50 - filled"
set "bar="
for /L %%i in (1,1,!filled!) do set "bar=!bar!▓"
for /L %%i in (1,1,!empty!) do set "bar=!bar!░"
set /a "pct=%~1"
echo   [!bar!] !pct!%% - %~2
goto :eof

:: ============================================================
:: PASO 1/9: Cerrar procesos Node (0%%)
:: ============================================================
call :showProgress 0 "Cerrando procesos Node.js anteriores..."
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
call :showProgress 11 "Procesos Node.js cerrados"
echo.

:: ============================================================
:: PASO 2/9: Limpieza total (22%%)
:: ============================================================
call :showProgress 22 "Limpiando archivos de instalacion anterior..."
if exist node_modules rd /s /q node_modules 2>nul
if exist .next rd /s /q .next 2>nul
if exist .env del .env 2>nul
if exist prisma\dev.db del prisma\dev.db 2>nul
if exist prisma\dev.db-journal del prisma\dev.db-journal 2>nul
if exist prisma\dev.db-wal del prisma\dev.db-wal 2>nul
if exist prisma\dev.db-shm del prisma\dev.db-shm 2>nul
if exist .prisma rd /s /q .prisma 2>nul
if exist printer-agent\spool rd /s /q printer-agent\spool 2>nul
call :showProgress 33 "Archivos limpiados correctamente"
echo.

:: Eliminar accesos directos antiguos del escritorio
if exist "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" del "%USERPROFILE%\Desktop\MyeCommerce POS.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\MyeCommerce.lnk" del "%USERPROFILE%\Desktop\MyeCommerce.lnk" 2>nul
if exist "%USERPROFILE%\Desktop\Nexus One POS.lnk" del "%USERPROFILE%\Desktop\Nexus One POS.lnk" 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommercePOS" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyeCommerceHidden" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NexusOnePOS" /f >nul 2>&1

:: ============================================================
:: PASO 3/9: Verificar Node.js 18+ (44%%)
:: ============================================================
call :showProgress 44 "Verificando Node.js..."

:: Refrescar PATH desde el registro (por si se instalo Node.js recientemente)
set "SYS_PATH="
set "USR_PATH="
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "SYS_PATH=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "USR_PATH=%%B"
if defined SYS_PATH set "PATH=!SYS_PATH;!PATH!"
if defined USR_PATH set "PATH=!USR_PATH;!PATH!"

:: Buscar node.exe - primero con where, luego en rutas comunes
set "NODE_FOUND=0"
where node >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "NODE_FOUND=1"
) else (
    echo   [INFO] where no encontro node, buscando en rutas tipicas...
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
            echo   [OK] Encontrado en: %%P
        )
    )
)

if "!NODE_FOUND!"=="0" (
    echo.
    echo   [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo.
    echo   Si acaba de instalar Node.js:
    echo     1. CIERRA esta ventana
    echo     2. ABRA UNA NUEVA ventana CMD
    echo     3. Vuelve a ejecutar INSTALAR.bat
    echo.
    echo   O descarguelo de: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Obtener version de Node.js de forma robusta
for /f "tokens=*" %%i in ('node -v 2^>^&1') do set "NODEVER=%%i"
set "NODEVER=!NODEVER: =!"

:: Extraer numero mayor: quitar la 'v' inicial, luego tomar todo antes del primer '.'
set "VER_CLEAN=!NODEVER:v=!"
set "MAJOR=0"
for /f "tokens=1 delims=." %%a in ("!VER_CLEAN!") do set "MAJOR=%%a"

echo   Node.js detectado: !NODEVER! (version mayor: !MAJOR!)

if !MAJOR! LSS 18 (
    echo.
    echo   [ERROR] Node.js !NODEVER! es demasiado antiguo. Se requiere v18+.
    echo   Descargue una version reciente de https://nodejs.org
    echo.
    pause
    exit /b 1
)
call :showProgress 50 "Node.js !NODEVER! - Version compatible"
echo.

:: ============================================================
:: PASO 4/9: Verificar conexion a internet (55%%)
:: ============================================================
call :showProgress 55 "Verificando conexion a internet..."
ping -n 1 -w 3000 registry.npmjs.org >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo   [ADVERTENCIA] No se detecto conexion a internet.
    echo   Presione ENTER para continuar o Ctrl+C para cancelar...
    pause >nul
) else (
    echo   Conexion a internet verificada.
)
call :showProgress 60 "Internet verificado"
echo.

:: ============================================================
:: PASO 5/9: Instalar dependencias (65%% - 75%%)
:: ============================================================
if not exist "package.json" (
    echo.
    echo   [ERROR] No se encontro package.json. Verifique la carpeta del proyecto.
    echo.
    pause
    exit /b 1
)

call :showProgress 65 "Instalando dependencias con Bun..."
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    call bun install
    if !ERRORLEVEL! EQU 0 goto DEPS_OK
    echo   [AVISO] Bun fallo, intentando con npm...
)
call :showProgress 70 "Instalando dependencias con npm (fallback)..."
call npm install --legacy-peer-deps
if !ERRORLEVEL! EQU 0 goto DEPS_OK
echo   [AVISO] Primer intento fallo, reintentando con --force...
if exist node_modules rd /s /q node_modules 2>nul
call npm install --legacy-peer-deps --force
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo   [ERROR] No se pudieron instalar las dependencias.
    echo   Soluciones: actualice Node.js, verifique conexion, o ejecute
    echo   manualmente: npm cache clean --force ^&^& npm install --legacy-peer-deps
    echo.
    pause
    exit /b 1
)
:DEPS_OK
call :showProgress 78 "Dependencias instaladas correctamente"
echo.

:: ============================================================
:: PASO 6/9: Generar Prisma y base de datos (80%% - 85%%)
:: ============================================================
call :showProgress 80 "Generando cliente Prisma..."
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    call bunx prisma generate
) else (
    call npx prisma generate
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo   [ERROR] Fallo la generacion de Prisma.
    echo.
    pause
    exit /b 1
)

call :showProgress 83 "Creando base de datos SQLite..."
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    call bunx prisma db push
) else (
    call npx prisma db push
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo   [ERROR] Fallo la creacion de la base de datos.
    echo.
    pause
    exit /b 1
)
call :showProgress 88 "Base de datos creada correctamente"
echo.

:: ============================================================
:: PASO 7/9: Crear .env desde .env.example si no existe (90%%)
:: ============================================================
call :showProgress 90 "Configurando variables de entorno..."
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   .env creado desde .env.example
    ) else (
        echo DATABASE_URL="file:./dev.db"> .env
        echo APP_PORT=3000>> .env
        echo NODE_ENV=production>> .env
        echo   .env creado con valores predeterminados
    )
) else (
    echo   .env ya existe, se conserva.
)
call :showProgress 93 "Variables de entorno configuradas"
echo.

:: ============================================================
:: PASO 8/9: Crear acceso directo en el escritorio (95%%)
:: ============================================================
call :showProgress 95 "Creando acceso directo en el escritorio..."
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\nexus_shortcut.vbs"
echo strDesktop = WshShell.SpecialFolders("Desktop") >> "%TEMP%\nexus_shortcut.vbs"
echo Set oShellLink = WshShell.CreateShortcut(strDesktop ^& "\Nexus One POS.lnk") >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.TargetPath = "%~dp0INICIAR-TODO.bat" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.WorkingDirectory = "%~dp0" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Description = "Nexus One POS v2.9.73" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.IconLocation = "shell32.dll,14" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Save >> "%TEMP%\nexus_shortcut.vbs"
cscript //nologo "%TEMP%\nexus_shortcut.vbs" >nul 2>&1
del "%TEMP%\nexus_shortcut.vbs" >nul 2>&1
call :showProgress 97 "Acceso directo creado"
echo.

:: ============================================================
:: PASO 9/9: Crear carpeta respaldos (100%%)
:: ============================================================
if not exist "respaldos" mkdir "respaldos"
call :showProgress 100 "Carpeta de respaldos creada"
echo.

:: ============================================================
:: INSTALACION COMPLETADA
:: ============================================================
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║          INSTALACION COMPLETADA EXITOSAMENTE            ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Para iniciar el sistema:
echo    - Doble clic en el acceso directo "Nexus One POS" del Escritorio
echo    - O ejecute: INICIAR-TODO.bat
echo.
echo  El sistema abrira automaticamente en su navegador:
echo    http://localhost:3000
echo.
echo  USUARIO POR DEFECTO: admin / admin
echo  (Se crea automaticamente al primer inicio de sesion)
echo.
echo  Nexus One POS v2.9.73 - Next.js 15 + Bun + Prisma + SQLite WAL
echo.
pause
