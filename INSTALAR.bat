@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.74 - Instalador
color 0A
setlocal enabledelayedexpansion

echo.
echo  ========================================================
echo    Nexus One POS v2.9.74 - Instalador Completo
echo    Sistema Punto de Venta Professional
echo  ========================================================
echo.
echo  ESTE INSTALADOR REALIZARA UNA INSTALACION LIMPIA.
echo  Se eliminaran: node_modules, .next, .env y la base de datos.
echo  Luego se compilara la aplicacion completamente.
echo.
pause
echo.

cd /d "%~dp0"

:: ============================================================
:: PASO 1/10: Cerrar procesos Node
:: ============================================================
echo  [1/10] Cerrando procesos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo          Procesos cerrados.
echo.

:: ============================================================
:: PASO 2/10: Limpieza total
:: ============================================================
echo  [2/10] Limpiando archivos de instalacion anterior...
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
:: PASO 3/10: Verificar Node.js 18+
:: ============================================================
echo  [3/10] Verificando Node.js...

:: Refrescar PATH desde el registro
set "SYS_PATH="
set "USR_PATH="
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "SYS_PATH=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "USR_PATH=%%B"
if defined SYS_PATH set "PATH=!SYS_PATH;!PATH!"
if defined USR_PATH set "PATH=!USR_PATH;!PATH!"

:: Buscar node.exe
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

:: Obtener version de Node.js
for /f "tokens=*" %%i in ('node -v 2^>^&1') do set "NODEVER=%%i"
set "NODEVER=!NODEVER: =!"
set "VER_CLEAN=!NODEVER:v=!"
set "MAJOR=0"
for /f "tokens=1 delims=." %%a in ("!VER_CLEAN!") do set "MAJOR=%%a"

echo          Node.js !NODEVER! detectado (v!MAJOR!).

if !MAJOR! LSS 18 (
    echo.
    echo  [ERROR] Node.js !NODEVER! es demasiado antiguo. Se requiere v18+.
    echo  Descargue una version reciente de https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo          Version compatible.
echo.

:: ============================================================
:: PASO 4/10: Verificar conexion a internet
:: ============================================================
echo  [4/10] Verificando conexion a internet...
ping -n 1 -w 3000 registry.npmjs.org >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo  [ADVERTENCIA] No se detecto conexion a internet.
    echo  Presione ENTER para continuar o Ctrl+C para cancelar...
    pause >nul
) else (
    echo          Conexion verificada.
)
echo.

:: ============================================================
:: PASO 5/10: Instalar dependencias
:: ============================================================
if not exist "package.json" (
    echo.
    echo  [ERROR] No se encontro package.json.
    echo  Verifique que este en la carpeta del proyecto.
    echo.
    pause
    exit /b 1
)

echo  [5/10] Instalando dependencias...
set "PKG=npm"
where bun >nul 2>&1
if !ERRORLEVEL! EQU 0 set "PKG=bun"
echo          Usando: !PKG!

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
        echo.
        echo  [ERROR] No se pudieron instalar las dependencias.
        echo.
        pause
        exit /b 1
    )
)
echo          Dependencias instaladas correctamente.
echo.

:: ============================================================
:: PASO 6/10: Generar Prisma
:: ============================================================
echo  [6/10] Generando cliente Prisma...
if "!PKG!"=="bun" (
    call bunx prisma generate
) else (
    call npx prisma generate
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo  [ERROR] Fallo la generacion de Prisma.
    echo.
    pause
    exit /b 1
)
echo          Prisma generado.
echo.

:: ============================================================
:: PASO 7/10: Crear base de datos SQLite
:: ============================================================
echo  [7/10] Creando base de datos SQLite...
if "!PKG!"=="bun" (
    call bunx prisma db push
) else (
    call npx prisma db push
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo  [ERROR] Fallo la creacion de la base de datos.
    echo.
    pause
    exit /b 1
)
echo          Base de datos creada.
echo.

:: ============================================================
:: PASO 8/10: Crear .env
:: ============================================================
echo  [8/10] Configurando variables de entorno...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo          .env creado desde .env.example
    ) else (
        echo DATABASE_URL="file:./dev.db"> .env
        echo APP_PORT=3000>> .env
        echo NODE_ENV=production>> .env
        echo          .env creado con valores predeterminados
    )
) else (
    echo          .env ya existe, se conserva.
)
echo.

:: ============================================================
:: PASO 9/10: COMPILAR LA APLICACION (next build)
:: ============================================================
echo  [9/10] Compilando la aplicacion (next build)...
echo          Esto puede tardar 1-3 minutos, por favor espere...
echo.

if "!PKG!"=="bun" (
    call bun run build
) else (
    call npm run build
)
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo  [ERROR] La compilacion fallo.
    echo  Revise los errores arriba.
    echo.
    pause
    exit /b 1
)
echo.
echo          Compilacion completada exitosamente.
echo.

:: ============================================================
:: PASO 10/10: Acceso directo y carpetas finales
:: ============================================================
echo  [10/10] Creando acceso directo en el escritorio...
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\nexus_shortcut.vbs"
echo strDesktop = WshShell.SpecialFolders("Desktop") >> "%TEMP%\nexus_shortcut.vbs"
echo Set oShellLink = WshShell.CreateShortcut(strDesktop ^& "\Nexus One POS.lnk") >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.TargetPath = "%~dp0INICIAR-TODO.bat" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.WorkingDirectory = "%~dp0" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Description = "Nexus One POS v2.9.74" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.IconLocation = "shell32.dll,14" >> "%TEMP%\nexus_shortcut.vbs"
echo oShellLink.Save >> "%TEMP%\nexus_shortcut.vbs"
cscript //nologo "%TEMP%\nexus_shortcut.vbs" >nul 2>&1
del "%TEMP%\nexus_shortcut.vbs" >nul 2>&1

if not exist "respaldos" mkdir "respaldos"

echo.
echo  ========================================================
echo     INSTALACION COMPLETADA EXITOSAMENTE
  ========================================================
echo.
echo  Para iniciar el sistema:
echo    - Doble clic en "Nexus One POS" del Escritorio
echo    - O ejecute: INICIAR-TODO.bat
echo.
echo  El sistema abrira automaticamente en su navegador.
echo.
echo  USUARIO POR DEFECTO: admin / admin
echo  (Se crea automaticamente al primer inicio de sesion)
echo.
echo  Para HTTPS local con Caddy, ejecute:
echo    CONFIGURAR-CADDY.bat
echo.
echo  Nexus One POS v2.9.74
echo  Next.js 15 + Prisma + SQLite WAL
echo.
pause
