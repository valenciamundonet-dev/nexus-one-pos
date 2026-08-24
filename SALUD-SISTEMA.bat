@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.80 - Salud del Sistema
color 0B

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║          Nexus One POS v2.9.80 - Diagnostico del Sistema    ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Funcion helper para rellenar con espacios (max %2 caracteres)
:: ============================================================
setlocal enabledelayedexpansion

:: Variable para detectar problemas
set "ISSUES=0"

:: Leer version desde package.json
set "APP_VERSION=2.9.80"
if exist "package.json" (
    for /f "tokens=2 delims=:, " %%a in ('findstr /R /C:"\"version\"" package.json') do (
        set "APP_VERSION=%%~a"
    )
)

:: ============================================================
:: Funcion para mostrar fila de tabla
:: ============================================================
:showRow
set "COL1=%~1"
set "COL2=%~2"
set "COL3=%~3"

:: Truncar COL1 a 24 chars, COL2 a 39 chars
if defined COL1 (
    set "COL1=!COL1:~0,24!"
) else (
    set "COL1=                        "
)
if defined COL2 (
    set "COL2=!COL2:~0,39!"
) else (
    set "COL2=                                       "
)

:: Rellenar COL1 a 24 caracteres
set "PAD1=!COL1!                        "
set "PAD1=!PAD1:~0,24!"

:: Rellenar COL2 a 39 caracteres
set "PAD2=!COL2!                                       "
set "PAD2=!PAD2:~0,39!"

:: Rellenar COL3 a 8 caracteres
if defined COL3 (
    set "PAD3=!COL3!        "
    set "PAD3=!PAD3:~0,8!"
) else (
    set "PAD3=        "
)

echo  │ !PAD1! │ !PAD2! │ !PAD3! │
goto :eof

:: ============================================================
:: Imprimir encabezado de tabla
:: ============================================================
echo  ┌──────────────────────────┬───────────────────────────────────┬──────────┐
echo  │ Componente               │ Detalle                           │ Estado   │
echo  ├──────────────────────────┼───────────────────────────────────┼──────────┤

:: ============================================================
:: 1. Node.js
:: ============================================================
set "NODE_STATUS=[NO INSTALADO]"
set "NODE_DETAIL=No se encontro en PATH"
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node -v') do (
        set "NODE_DETAIL=Node.js %%i"
        set "NODE_VER=%%i"
    )
    set "NODE_STATUS=[  OK  ]"
    for /f "tokens=1 delims=v." %%m in ("%NODE_VER%") do (
        if %%m LSS 18 (
            set "NODE_STATUS=[ WARN ]"
            set "NODE_DETAIL=%NODE_VER% (se necesita v18+)"
            set /a ISSUES+=1
        )
    )
) else (
    set /a ISSUES+=1
)
call :showRow "Node.js" "%NODE_DETAIL%" "%NODE_STATUS%"

:: ============================================================
:: 2. Bun
:: ============================================================
set "BUN_STATUS=[ OPC. ]"
set "BUN_DETAIL=No instalado, se usa npm"
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('bun -v') do set "BUN_DETAIL=Bun %%i"
    set "BUN_STATUS=[  OK  ]"
)
call :showRow "Bun" "%BUN_DETAIL%" "%BUN_STATUS%"

:: ============================================================
:: 3. Base de datos SQLite
:: ============================================================
set "DB_STATUS=[ FALTA]"
set "DB_DETAIL=prisma/dev.db no encontrado"
if exist "prisma\dev.db" (
    set "DB_STATUS=[  OK  ]"
    for %%F in ("prisma\dev.db") do set "DB_DETAIL=dev.db (%%~zF bytes)"
) else (
    set /a ISSUES+=1
)
call :showRow "Base de Datos" "%DB_DETAIL%" "%DB_STATUS%"

:: ============================================================
:: 4. node_modules
:: ============================================================
set "DEPS_STATUS=[ FALTA]"
set "DEPS_DETAIL=Ejecutar INSTALAR.bat"
if exist "node_modules" (
    set "DEPS_STATUS=[  OK  ]"
    set "DEPS_DETAIL=Dependencias instaladas"
) else (
    set /a ISSUES+=1
)
call :showRow "Dependencias" "%DEPS_DETAIL%" "%DEPS_STATUS%"

:: ============================================================
:: 5. Build de produccion
:: ============================================================
set "BUILD_STATUS=[ FALTA]"
set "BUILD_DETAIL=Ejecutar RECONSTRUIR.bat"
if exist ".next\server" (
    set "BUILD_STATUS=[  OK  ]"
    set "BUILD_DETAIL=Build de produccion listo"
) else (
    set /a ISSUES+=1
)
call :showRow "Build (.next)" "%BUILD_DETAIL%" "%BUILD_STATUS%"

:: ============================================================
:: 6. Puerto 3000
:: ============================================================
set "PORT_STATUS=[  OK  ]"
set "PORT_DETAIL=Puerto 3000 disponible"
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PORT_STATUS=[USADO ]"
    set "PORT_DETAIL=Puerto 3000 en uso"
    for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        set "PORT_DETAIL=En uso por PID %%p"
    )
)
call :showRow "Puerto 3000" "%PORT_DETAIL%" "%PORT_STATUS%"

:: ============================================================
:: 7. Espacio en disco
:: ============================================================
set "DISK_FREE=Desconocido"
for /f "tokens=3" %%a in ('dir /-c "%~dp0" 2^>nul ^| findstr /C:"bytes free"') do set "DISK_FREE=%%a"
call :showRow "Espacio Disco" "Libre: %DISK_FREE% bytes" "[  OK  ]"

:: ============================================================
:: 8. Version
:: ============================================================
call :showRow "Version App" "Nexus One POS %APP_VERSION%" "[  OK  ]"

:: ============================================================
:: 9. Printer Agent
:: ============================================================
set "AGENT_STATUS=[ FALTA]"
set "AGENT_DETAIL=printer-agent/agent.js no existe"
if exist "printer-agent\agent.js" (
    set "AGENT_STATUS=[  OK  ]"
    set "AGENT_DETAIL=Archivo agente presente"
)
call :showRow "Printer Agent" "%AGENT_DETAIL%" "%AGENT_STATUS%"

echo  └──────────────────────────┴───────────────────────────────────┴──────────┘
echo.

:: ============================================================
:: Resumen
:: ============================================================
if %ISSUES% EQU 0 (
    echo  ┌─────────────────────────────────────────────────────────┐
    echo  │  TODOS LOS COMPONENTES ESTAN OPERATIVOS.               │
    echo  │  El sistema esta listo para ejecutarse.               │
    echo  │  Ejecute INICIAR-TODO.bat para iniciar.                │
    echo  └─────────────────────────────────────────────────────────┘
) else (
    echo  ┌─────────────────────────────────────────────────────────┐
    echo  │  SE DETECTARON %ISSUES% PROBLEMA(S) REQUIEREN ATENCION.     │
    echo  │  Revise la tabla y ejecute INSTALAR.bat si es necesario.│
    echo  └─────────────────────────────────────────────────────────┘
)

echo.
pause
