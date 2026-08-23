@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.80 - Detener

cd /d "%~dp0"

echo.
echo  ========================================================
echo     Nexus One POS v2.9.80 - Deteniendo todos los servicios
echo  ========================================================
echo.

echo  Deteniendo Caddy HTTPS...
taskkill /F /IM caddy.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo      Caddy detenido.
) else (
    echo      Caddy no estaba corriendo.
)

echo  Deteniendo Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo      Node.js detenido.
) else (
    echo      Node.js no estaba corriendo.
)

echo  Verificando...
timeout /t 1 /nobreak >nul
tasklist | findstr /I "caddy.exe node.exe" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo      Forzando cierre...
    taskkill /F /IM node.exe >nul 2>&1
    taskkill /F /IM caddy.exe >nul 2>&1
) else (
    echo      Todos los servicios detenidos correctamente.
)

echo.
echo  Nexus One POS detenido.
echo  Para reiniciar: doble clic en "Nexus One POS" del escritorio.
echo.
timeout /t 3
