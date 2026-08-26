@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Actualizador
color 0B
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║       Nexus One POS v2.9.73 - Actualizador OTA            ║
echo  ║          Preservando datos del usuario                    ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

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
:: PASO 1/6: Respaldar base de datos (0%% - 15%%)
:: ============================================================
if not exist "prisma\dev.db" (
    call :showProgress 0 "No se encontro base de datos, se creara una nueva."
    goto STEP_GIT
)

call :showProgress 0 "Respaldando base de datos antes de actualizar..."
if not exist "respaldos" mkdir "respaldos"
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "FECHA=%%c%%a%%b"
for /f "tokens=1-3 delims=:. " %%a in ('time /t') do set "HORA=%%a%%b"
set "TIMESTAMP=%FECHA%-%HORA%"
copy "prisma\dev.db" "respaldos\pre-update-%TIMESTAMP%.db" >nul 2>&1
copy "prisma\dev.db-wal" "respaldos\pre-update-%TIMESTAMP%.db-wal" >nul 2>&1
copy "prisma\dev.db-shm" "respaldos\pre-update-%TIMESTAMP%.db-shm" >nul 2>&1
call :showProgress 15 "Base de datos respaldada: pre-update-%TIMESTAMP%.db"
echo.

:: ============================================================
:: PASO 2/6: Git pull (20%% - 35%%)
:: ============================================================
:STEP_GIT
call :showProgress 20 "Descargando actualizaciones (git pull)..."
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call git pull origin main 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo   [ADVERTENCIA] git pull fallo. Verifique su conexion o estado del repositorio.
        echo   Presione ENTER para continuar con la actualizacion local...
        pause >nul
    )
    call :showProgress 35 "Codigo actualizado"
) else (
    call :showProgress 35 "Git no disponible, continuando con codigo local"
)
echo.

:: ============================================================
:: PASO 3/6: Instalar dependencias (40%% - 55%%)
:: ============================================================
call :showProgress 40 "Instalando/actualizando dependencias..."
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bun install
    if %ERRORLEVEL% NEQ 0 (
        echo   [AVISO] Bun fallo, intentando con npm...
        call npm install --legacy-peer-deps
    )
) else (
    call npm install --legacy-peer-deps
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] No se pudieron instalar las dependencias.
    echo   Ejecute manualmente: npm install --legacy-peer-deps
    echo.
    pause
    exit /b 1
)
call :showProgress 55 "Dependencias actualizadas"
echo.

:: ============================================================
:: PASO 4/6: Generar Prisma (60%% - 70%%)
:: ============================================================
call :showProgress 60 "Generando cliente Prisma..."
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bunx prisma generate
) else (
    call npx prisma generate
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] Fallo la generacion de Prisma.
    echo.
    pause
    exit /b 1
)
call :showProgress 70 "Prisma generado"
echo.

:: ============================================================
:: PASO 5/6: Actualizar esquema de base de datos (75%% - 85%%)
:: ============================================================
call :showProgress 75 "Aplicando cambios al esquema de base de datos..."
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bunx prisma db push
) else (
    call npx prisma db push
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] Fallo la actualizacion del esquema de base de datos.
    echo.
    pause
    exit /b 1
)
call :showProgress 85 "Esquema de base de datos actualizado"
echo.

:: ============================================================
:: PASO 6/6: Compilar produccion (90%% - 100%%)
:: ============================================================
call :showProgress 90 "Compilando para produccion..."
if exist .next rd /s /q .next
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bun run build
) else (
    call npm run build
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] La compilacion fallo. Revise los errores.
    echo.
    pause
    exit /b 1
)
call :showProgress 100 "Compilacion completada"
echo.

:: ============================================================
:: ACTUALIZACION COMPLETADA
:: ============================================================
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        ACTUALIZACION COMPLETADA EXITOSAMENTE             ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Sus datos han sido preservados. Puede iniciar el sistema con:
echo    INICIAR-TODO.bat
echo.
echo  Si experimenta problemas, puede restaurar la base de datos
echo  desde la carpeta respaldos/.
echo.
pause
