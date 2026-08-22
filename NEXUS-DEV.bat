@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.73 - Modo Desarrollo
color 0B

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        Nexus One POS v2.9.73 - Modo Desarrollo           ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Iniciando servidor de desarrollo con hot-reload...
echo  URL: http://localhost:3000
echo.
echo  Presione Ctrl+C para detener.
echo.

:: Abrir navegador
start http://localhost:3000

:: Ejecutar modo desarrollo
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bun dev
) else (
    call npm run dev
)
