@echo off
title Nexus One POS - Generador de Licencias
echo.
echo  ======================================================
echo   Nexus One POS - Generador de Licencias
echo  ======================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Node.js no esta instalado.
    echo  Descarguelo de https://nodejs.org
    pause
    exit /b 1
)

echo.
node "%~dp0GENERAR-LICENCIA.js" %*
echo.
pause