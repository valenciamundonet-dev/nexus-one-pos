#!/usr/bin/env bash
# ============================================================
# Nexus One POS v2.9.73 — Instalador Limpio (Linux / macOS)
# ============================================================
set -euo pipefail
IFS=$'\n\t'

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Detectar SO
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_NAME="macOS"
else
    OS_NAME="Linux"
fi

# Ir al directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "         Nexus One POS v2.9.73 — Instalador Limpio"
echo "         Sistema Punto de Venta"
echo "         SO detectado: $OS_NAME"
echo "============================================================${NC}"
echo

# Contador de pasos
TOTAL_STEPS=7
STEP=0

progress() {
    STEP=$((STEP + 1))
    local pct=$(( STEP * 100 / TOTAL_STEPS ))
    local filled=$(( pct / 5 ))
    local empty=$(( 20 - filled ))
    local bar="$(printf '%*s' "$filled" '' | tr ' ' '▓')$(printf '%*s' "$empty" '' | tr ' ' '░')"
    echo -e "${CYAN}[$bar] ${pct}%${NC} — $1"
}

# --------------------------------------------------
# PASO 0: Confirmar limpieza
# --------------------------------------------------
echo -e "${YELLOW}Este instalador eliminara toda instalacion anterior.${NC}"
read -rp "Continuar? [s/N] " confirm
if [[ ! "$confirm" =~ ^[sSyY]$ ]]; then
    echo "Instalacion cancelada."
    exit 0
fi
echo

# --------------------------------------------------
# PASO 1: Cerrar procesos
# --------------------------------------------------
progress "Cerrando procesos Node anteriores..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "node.*agent.js" 2>/dev/null || true
sleep 1
echo -e "  ${GREEN}OK${NC}"
echo

# --------------------------------------------------
# PASO 2: Limpieza total
# --------------------------------------------------
progress "Limpiando instalacion anterior..."
rm -rf node_modules .next .prisma package-lock.json 2>/dev/null
rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm 2>/dev/null
rm -rf respaldos 2>/dev/null
mkdir -p respaldos
echo -e "  ${GREEN}OK${NC}"
echo

# --------------------------------------------------
# PASO 3: Verificar Node.js / Bun
# --------------------------------------------------
progress "Verificando requisitos..."

# Detectar gestor de paquetes
if command -v bun &>/dev/null; then
    PKG_MGR="bun"
    PKG_INSTALL="bun install"
    PKG_RUN="bun run"
    PKG_EXEC="bunx"
    BUN_VER=$(bun --version 2>/dev/null || echo "desconocida")
    echo -e "  ${GREEN}Bun v${BUN_VER} detectado${NC}"
elif command -v node &>/dev/null; then
    PKG_MGR="npm"
    PKG_INSTALL="npm install --legacy-peer-deps"
    PKG_RUN="npm run"
    PKG_EXEC="npx"
    NODE_VER=$(node -v 2>/dev/null || echo "desconocida")
    NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
    if [[ "$NODE_MAJOR" -lt 18 ]]; then
        echo -e "  ${RED}ERROR: Node.js ${NODE_VER} es demasiado antiguo. Se requiere v18+${NC}"
        echo "  Descargue de https://nodejs.org (version 20 LTS)"
        exit 1
    fi
    echo -e "  ${GREEN}Node.js ${NODE_VER} detectado${NC}"
    echo -e "  ${YELLOW}Bun no encontrado. Se recomienda instalar Bun para mejor rendimiento.${NC}"
else
    echo -e "  ${RED}ERROR: No se encontro ni Bun ni Node.js.${NC}"
    echo "  Instale Bun: curl -fsSL https://bun.sh/install | bash"
    echo "  O Node.js: https://nodejs.org (version 20 LTS)"
    exit 1
fi

# Verificar estructura
if [[ ! -f "package.json" ]]; then
    echo -e "  ${RED}ERROR: No se encontro package.json en ${SCRIPT_DIR}${NC}"
    exit 1
fi
if [[ ! -f "prisma/schema.prisma" ]]; then
    echo -e "  ${RED}ERROR: No se encontro prisma/schema.prisma${NC}"
    exit 1
fi
echo -e "  ${GREEN}Estructura del proyecto verificada${NC}"
echo

# --------------------------------------------------
# PASO 4: Instalar dependencias
# --------------------------------------------------
progress "Instalando dependencias (${PKG_MGR})..."
echo -e "  ${YELLOW}Esto puede tardar unos minutos...${NC}"
if $PKG_INSTALL; then
    echo -e "  ${GREEN}Dependencias instaladas correctamente${NC}"
else
    echo -e "  ${YELLOW}Primer intento fallo, limpiando cache...${NC}"
    rm -rf node_modules
    if [[ "$PKG_MGR" == "npm" ]]; then
        npm cache clean --force 2>/dev/null
    fi
    if $PKG_INSTALL; then
        echo -e "  ${GREEN}Dependencias instaladas (segundo intento)${NC}"
    else
        echo -e "  ${RED}ERROR: No se pudieron instalar las dependencias.${NC}"
        echo "  Intentar manualmente: cd $SCRIPT_DIR && $PKG_INSTALL"
        exit 1
    fi
fi
echo

# --------------------------------------------------
# PASO 5: Generar Prisma + Base de datos
# --------------------------------------------------
progress "Generando Prisma y base de datos..."

if $PKG_EXEC prisma generate; then
    echo -e "  ${GREEN}Cliente Prisma generado${NC}"
else
    echo -e "  ${YELLOW}Reintentando generacion de Prisma...${NC}"
    $PKG_EXEC prisma generate
fi

if $PKG_EXEC prisma db push; then
    echo -e "  ${GREEN}Base de datos SQLite creada${NC}"
else
    echo -e "  ${YELLOW}Reintentando creacion de DB...${NC}"
    $PKG_EXEC prisma db push
fi
echo

# --------------------------------------------------
# PASO 6: Crear .env si no existe
# --------------------------------------------------
progress "Configurando variables de entorno..."
if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
    cp .env.example .env
    echo -e "  ${GREEN}.env creado desde .env.example${NC}"
elif [[ ! -f ".env" ]]; then
    # Crear .env minimo
    cat > .env << 'EOF'
# Nexus One POS — Configuracion de entorno
DATABASE_URL="file:./dev.db"
APP_PORT=3000
NODE_ENV=production
EOF
    echo -e "  ${GREEN}.env creado con valores por defecto${NC}"
else
    echo -e "  ${YELLOW}.env ya existe, no se modifica${NC}"
fi
echo

# --------------------------------------------------
# PASO 7: Compilar para produccion
# --------------------------------------------------
progress "Compilando para produccion..."
if $PKG_RUN build; then
    echo -e "  ${GREEN}Compilacion exitosa${NC}"
else
    echo -e "  ${YELLOW}La compilacion fallo, pero puede usar modo desarrollo con: ${PKG_RUN} dev${NC}"
fi
echo

# --------------------------------------------------
# RESUMEN
# --------------------------------------------------
echo -e "${GREEN}${BOLD}"
echo "============================================================"
echo "   INSTALACION COMPLETADA EXITOSAMENTE"
echo "============================================================${NC}"
echo
echo -e "  Para iniciar el sistema ejecute:"
echo -e "    ${CYAN}./start.sh${NC}"
echo
echo -e "  O en modo desarrollo:"
echo -e "    ${CYAN}${PKG_RUN} dev${NC}"
echo
echo -e "  El sistema estara disponible en: ${BOLD}http://localhost:3000${NC}"
echo -e "  Usuario por defecto: ${BOLD}admin / admin${NC}"
echo
