@echo off
chcp 65001 >nul 2>&1
title Nexus One POS - Configurar Caddy HTTPS
color 0B
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  ========================================================
echo     Nexus One POS - Configuracion de Caddy HTTPS Local
echo  ========================================================
echo.
echo  Caddy proporciona HTTPS automatico con certificados validos
echo  para acceso local desde cualquier dispositivo en su red.
echo.

:: ============================================================
:: PASO 1: Verificar si Caddy esta instalado
:: ============================================================
echo  [1/5] Verificando Caddy...
set "CADDY_FOUND=0"
where caddy >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "CADDY_FOUND=1"
    echo          Caddy encontrado en el sistema.
) else (
    if exist "%LocalAppData%\Caddy\caddy.exe" (
        set "PATH=!PATH!;%LocalAppData%\Caddy"
        set "CADDY_FOUND=1"
        echo          Caddy encontrado en: %LocalAppData%\Caddy
    ) else (
        echo          Caddy NO esta instalado.
        echo.
        echo  Descargando Caddy...
        echo.

        :: Crear carpeta para Caddy
        if not exist "%LocalAppData%\Caddy" mkdir "%LocalAppData%\Caddy"

        :: Descargar Caddy para Windows x64
        echo          Descargando caddy_windows_amd64.zip...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile '%TEMP%\caddy.zip'" 2>nul

        if not exist "%TEMP%\caddy.zip" (
            echo.
            echo  [ERROR] No se pudo descargar Caddy.
            echo  Descarguelo manualmente de: https://caddyserver.com/download
            echo  Copie caddy.exe a: %LocalAppData%\Caddy\
            echo.
            pause
            exit /b 1
        )

        :: Descomprimir
        echo          Extrayendo...
        powershell -Command "Expand-Archive -Path '%TEMP%\caddy.zip' -DestinationPath '%TEMP%\caddy_extract' -Force"
        copy "%TEMP%\caddy_extract\caddy.exe" "%LocalAppData%\Caddy\caddy.exe" >nul
        rd /s /q "%TEMP%\caddy_extract" >nul 2>&1
        del "%TEMP%\caddy.zip" >nul 2>&1

        :: Agregar al PATH del usuario
        set "CADDY_PATH=%LocalAppData%\Caddy"
        for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "CUR_PATH=%%B"
        echo !CUR_PATH! | findstr /I /C:"Caddy" >nul
        if !ERRORLEVEL! NEQ 0 (
            reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "!CUR_PATH!;!CADDY_PATH!" /f >nul 2>&1
            set "PATH=!PATH!;!CADDY_PATH!"
            echo          Caddy agregado al PATH del usuario.
        )

        set "CADDY_FOUND=1"
        echo          Caddy instalado correctamente.
    )
)
echo.

:: ============================================================
:: PASO 2: Configurar dominio local
:: ============================================================
echo  [2/5] Configurando dominio local...
set /p "CADDY_DOMAIN=  Ingrese el dominio local (Enter para 'nexus.local'): "
if "!CADDY_DOMAIN!"=="" set "CADDY_DOMAIN=nexus.local"
echo          Dominio: !CADDY_DOMAIN!
echo.

:: ============================================================
:: PASO 3: Detectar IP local
:: ============================================================
echo  [3/5] Detectando IP local...
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do set "LOCAL_IP=%%~b"
)
set "LOCAL_IP=!LOCAL_IP: =!"
echo          IP local: !LOCAL_IP!
echo.

:: ============================================================
:: PASO 4: Agregar entrada al hosts file
:: ============================================================
echo  [4/5] Configurando archivo hosts para DNS local...
set "HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts"

findstr /I /C:"!CADDY_DOMAIN!" "%HOSTS_FILE%" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo  Se requiere permisos de administrador para modificar hosts.
    echo  Creando script temporal con privilegios elevados...
    echo          Agregando !CADDY_DOMAIN! -^> !LOCAL_IP! al hosts file.

    :: Crear script VBS para ejecutar como admin
    echo Set objShell = CreateObject("Shell.Application") > "%TEMP%\nexus_hosts.vbs"
    echo objShell.ShellExecute "cmd", "/c echo !LOCAL_IP! !CADDY_DOMAIN! >> %HOSTS_FILE%", "", "runas", 0 >> "%TEMP%\nexus_hosts.vbs"
    cscript //nologo "%TEMP%\nexus_hosts.vbs"
    del "%TEMP%\nexus_hosts.vbs" >nul 2>&1

    echo          Espere a que se complete la ventana de UAC...
    timeout /t 3 /nobreak >nul
) else (
    echo          La entrada ya existe en el hosts file.
)
echo.

:: ============================================================
:: PASO 5: Crear script de inicio de Caddy y acceso directo
:: ============================================================
echo  [5/5] Creando scripts de inicio de Caddy...

:: Crear INICIAR-CADDY.bat
echo @echo off > INICIAR-CADDY.bat
echo chcp 65001 ^>nul 2^>^&1 >> INICIAR-CADDY.bat
echo cd /d "%%~dp0" >> INICIAR-CADDY.bat
echo echo Iniciando Caddy HTTPS en https://!CADDY_DOMAIN!... >> INICIAR-CADDY.bat
echo set DOMAIN=!CADDY_DOMAIN! >> INICIAR-CADDY.bat
echo start "Nexus Caddy HTTPS" /B caddy run --config Caddyfile >> INICIAR-CADDY.bat
echo timeout /t 3 /nobreak ^>nul >> INICIAR-CADDY.bat
echo start https://!CADDY_DOMAIN! >> INICIAR-CADDY.bat
echo echo. >> INICIAR-CADDY.bat
echo echo Caddy corriendo. Presione Ctrl+C para detener. >> INICIAR-CADDY.bat
echo pause >> INICIAR-CADDY.bat

:: Crear DETENER-CADDY.bat
echo @echo off > DETENER-CADDY.bat
echo echo Deteniendo Caddy... >> DETENER-CADDY.bat
echo taskkill /F /IM caddy.exe ^>nul 2^>^&1 >> DETENER-CADDY.bat
echo echo Caddy detenido. >> DETENER-CADDY.bat
echo pause >> DETENER-CADDY.bat

echo          Scripts creados: INICIAR-CADDY.bat, DETENER-CADDY.bat
echo.

:: ============================================================
:: RESUMEN
:: ============================================================
echo.
echo  ========================================================
echo     CONFIGURACION DE CADDY COMPLETADA
echo  ========================================================
echo.
echo  Para usar HTTPS local:
echo.
echo    1. Primero inicie el POS:  INICIAR-TODO.bat
echo    2. Luego inicie Caddy:    INICIAR-CADDY.bat
echo    3. Abra en navegador:     https://!CADDY_DOMAIN!
echo.
echo  Desde otros dispositivos en la red:
echo    1. Configure el DNS en cada dispositivo apuntando
echo       !CADDY_DOMAIN! a !LOCAL_IP!
echo    2. O edite su archivo hosts en cada dispositivo.
echo    3. Acceda a: https://!CADDY_DOMAIN!
echo.
echo  Para detener Caddy: DETENER-CADDY.bat
echo.
pause