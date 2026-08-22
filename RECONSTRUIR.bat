@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Reconstruir
color 0E

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         Nexus One POS v2.9.73 - Reconstruccion            ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Paso 1: Cerrar procesos Node
:: ============================================================
echo  [1/3] Cerrando procesos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Procesos cerrados.
echo.

:: ============================================================
:: Paso 2: Eliminar .next
:: ============================================================
echo  [2/3] Eliminando carpeta .next...
if exist .next (
    rd /s /q .next
    echo         Carpeta .next eliminada.
) else (
    echo         La carpeta .next no existia.
)
echo.

:: ============================================================
:: Paso 3: Compilar con bun (o npm)
:: ============================================================
echo  [3/3] Iniciando compilacion de produccion...
echo.
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Usando: bun run build
    call bun run build
) else (
    echo         Usando: npm run build
    call npm run build
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  ─────────────────────────────────────────────────────────
    echo   RECONSTRUCCION COMPLETADA EXITOSAMENTE.
    echo  ─────────────────────────────────────────────────────────
    echo.
    echo   Para iniciar el sistema, ejecute:
    echo     INICIAR-TODO.bat
    echo.
) else (
    echo.
    echo  ─────────────────────────────────────────────────────────
    echo   [ERROR] La compilacion fallo. Revise los errores arriba.
    echo  ─────────────────────────────────────────────────────────
    echo.
)
pause
