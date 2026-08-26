@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Quitar Inicio Automatico
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  Nexus One POS v2.9.73 - Quitar Inicio Automatico         ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Eliminar del inicio de Windows
:: ============================================================
echo  Eliminando Nexus One POS del inicio de Windows...
echo.

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NexusOnePOS" /f >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo  ─────────────────────────────────────────────────────────
    echo   Nexus One POS ya no se iniciara automaticamente con Windows.
    echo  ─────────────────────────────────────────────────────────
) else (
    echo  [INFO] Nexus One POS no estaba registrado en el inicio automatico.
)

echo.
   Para reactivarlo, ejecute: CREAR-INICIO-AUTOMATICO.bat
echo.
pause
