@echo off
chcp 65001 >nul 2>&1
title Nexus One POS v2.9.80 - Crear Administrador
color 0B

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║      Nexus One POS v2.9.80 - Crear Usuario Administrador  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: Verificar que la base de datos existe
:: ============================================================
if not exist "prisma\dev.db" (
    echo  [ERROR] No se encontro prisma\dev.db
    echo  Ejecute primero INSTALAR.bat o INICIAR-TODO.bat.
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: Intentar usar bunx para ejecutar Prisma seed
:: ============================================================
echo  [1/2] Generando cliente Prisma...
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call bunx prisma generate >nul 2>&1
) else (
    call npx prisma generate >nul 2>&1
)
if %ERRORLEVEL% NEQ 0 (
    echo  [AVISO] Fallo la generacion de Prisma, continuando...
)

echo  [2/2] Creando usuario admin...
echo.

:: Crear usuario admin usando un one-liner de Node.js con Prisma Client
echo  Ejecutando creacion de usuario administrador...
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { try { const existing = await prisma.user.findUnique({ where: { username: 'admin' } }); if (existing) { console.log('  El usuario admin ya existe. No se realizan cambios.'); } else { const user = await prisma.user.create({ data: { username: 'admin', name: 'Administrador', password: 'admin', role: 'ADMIN', active: true } }); console.log('  Usuario creado exitosamente:'); console.log('    Usuario: admin'); console.log('    Contrasena: admin'); } } catch (e) { if (e.code === 'P2002') { console.log('  El usuario admin ya existe.'); } else { console.error('  Error:', e.message); } } finally { await prisma.$disconnect(); } })();"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] No se pudo crear el usuario.
    echo  Verifique que las dependencias esten instaladas (ejecute INSTALAR.bat).
)

echo.
echo  NOTA: Recomendamos cambiar la contrasena del usuario admin
        despues del primer inicio de sesion desde la configuracion.
echo.
pause
