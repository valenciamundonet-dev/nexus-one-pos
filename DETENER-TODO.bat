@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.75 - Detener
color 0C

cd /d "%~dp0"

echo.
echo  ========================================================
echo     Nexus One POS v2.9.75 - Deteniendo todos los servicios
echo  ========================================================
echo.

echo  [1/3] Deteniendo Caddy HTTPS...
taskkill /F /IM caddy.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Caddy detenido.
) else (
    echo         Caddy no estaba corriendo.
)

echo  [2/3] Deteniendo servidor Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Node.js detenido.
) else (
    echo         Node.js no estaba corriendo.
)

echo  [3/3] Verificando que todo este detenido...
timeout /t 1 /nobreak >nul
tasklist | findstr /I "caddy.exe node.exe" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         [AVISO] Algunos procesos siguen activos.
    taskkill /F /IM node.exe >nul 2>&1
    taskkill /F /IM caddy.exe >nul 2>&1
) else (
    echo         Todos los procesos detendidos correctamente.
)

echo.
echo  ========================================================
echo  Todos los servicios de Nexus One POS han sido detenidos.
echo  ========================================================
echo.
timeout /t 5
