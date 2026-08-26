@echo off
chcp 65001 >nul 2>&1
title NexusOne POS v2.9.80 - Respaldo de Base de Datos
color 0E

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║      NexusOne POS v2.9.80 - Respaldo de Base de Datos   ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Verificar que la base de datos existe
:: ============================================================
if not exist "prisma\dev.db" (
    echo  [ERROR] No se encontro prisma\dev.db
    echo  La base de datos no existe o no se ha inicializado.
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: Crear carpeta de respaldos si no existe
:: ============================================================
if not exist "respaldos" mkdir "respaldos"

:: ============================================================
:: Generar timestamp
:: ============================================================
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "D=%%c%%a%%b"
for /f "tokens=1-3 delims=:. " %%a in ('time /t') do set "T=%%a%%b%%c"
set "TIMESTAMP=%D%-%T%"

:: ============================================================
:: Copiar archivos de base de datos SQLite
:: ============================================================
echo  [1/2] Copiando archivos SQLite...
echo.
copy "prisma\dev.db" "respaldos\nexus-backup-%TIMESTAMP%.db" >nul
if %ERRORLEVEL% EQU 0 (
    echo         OK: nexus-backup-%TIMESTAMP%.db
) else (
    echo         [ERROR] No se pudo copiar dev.db
)

copy "prisma\dev.db-wal" "respaldos\nexus-backup-%TIMESTAMP%.db-wal" >nul 2>&1
copy "prisma\dev.db-shm" "respaldos\nexus-backup-%TIMESTAMP%.db-shm" >nul 2>&1
echo.

:: ============================================================
:: Exportar a SQL si sqlite3 esta disponible
:: ============================================================
echo  [2/2] Exportando a formato SQL...
where sqlite3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sqlite3 prisma/dev.db ".dump" > "respaldos\nexus-backup-%TIMESTAMP%.sql" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo         OK: nexus-backup-%TIMESTAMP%.sql
    ) else (
        echo         [AVISO] La exportacion SQL fallo, pero la copia .db es valida.
    )
) else (
    echo         [INFO] sqlite3 no esta instalado, se omite la exportacion SQL.
    echo         La copia .db es completamente funcional para restaurar.
)
echo.

:: ============================================================
:: Mostrar tamano de archivos de respaldo
:: ============================================================
echo  ─────────────────────────────────────────────────────────
echo   Archivos de respaldo creados en: respaldos\
echo  ─────────────────────────────────────────────────────────
for %%f in (respaldos\nexus-backup-%TIMESTAMP%.*) do (
    echo   %%~nxf  -  %%~zf bytes
)
echo  ─────────────────────────────────────────────────────────
echo.
echo  Respaldo completado exitosamente.
echo.
pause
