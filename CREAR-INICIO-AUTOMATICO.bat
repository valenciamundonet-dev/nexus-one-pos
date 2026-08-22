@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Inicio Automatico
color 0A

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   Nexus One POS v2.9.73 - Configurar Inicio Automatico   ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Registrar en el inicio de Windows
:: ============================================================
echo  Registrando Nexus One POS en el inicio de Windows...
echo.

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NexusOnePOS" /t REG_SZ /d "\"%~dp0INICIAR-TODO.bat\"" /f >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo  ─────────────────────────────────────────────────────────
    echo   Nexus One POS se iniciara automaticamente con Windows.
    echo  ─────────────────────────────────────────────────────────
) else (
    echo  [ERROR] No se pudo registrar el inicio automatico.
    echo  Ejecute este script como administrador.
)

echo.
echo  Para desactivar el inicio automatico, ejecute:
    ELIMINAR-INICIO-AUTOMATICO.bat
echo.
pause
