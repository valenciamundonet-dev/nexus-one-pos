@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Licencia
color 0E

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        Nexus One POS v2.9.73 - Sistema de Licencia        ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Leer version desde package.json
:: ============================================================
set "VERSION=2.9.73"
if exist "package.json" (
    for /f "tokens=2 delims=:, " %%a in ('findstr /R /C:"\"version\"" package.json') do (
        set "VERSION=%%~a"
    )
)

:: ============================================================
:: Mostrar informacion de licencia
:: ============================================================
echo  El sistema de licencias de Nexus One POS se gestiona
  de forma integral a traves de la interfaz de la aplicacion.

echo.
echo  ─────────────────────────────────────────────────────────
echo   Version actual:  %VERSION%
echo   Producto:        Nexus One POS
echo   Tecnologia:     Next.js 15 + Bun + Prisma + SQLite WAL
echo  ─────────────────────────────────────────────────────────
echo.
echo  Para activar o gestionar su licencia:
echo    1. Inicie Nexus One POS (ejecute INICIAR-TODO.bat)
echo    2. Inicie sesion con su cuenta de administrador
echo    3. Vaya a Configuracion ^> Licencia

echo.
echo  Si necesita soporte tecnico, contacte al equipo de Nexus One.
echo.
pause
