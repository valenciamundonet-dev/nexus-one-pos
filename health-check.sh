#!/usr/bin/env bash
# ============================================================
# Nexus One POS v2.9.73 — Verificacion de Salud del Sistema
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Leer version del proyecto
APP_VERSION=$(python3 -c "import json; print(json.load(open('package.json')).get('version','?'))" 2>/dev/null || echo "?")

# Version del SO
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_INFO="$(sw_vers -productName 2>/dev/null || echo macOS) $(sw_vers -productVersion 2>/dev/null || echo '')"
else
    OS_INFO="$(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo Linux)"
fi

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║     Nexus One POS v${APP_VERSION} — Diagnostico del Sistema    ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Componente${NC}              ${BOLD}Estado${NC}         ${BOLD}Detalle${NC}"
echo "  ─────────────────────── ─────────────── ──────────────────────"

# Funcion para mostrar estado
status() {
    local name="$1" status_icon="$2" detail="$3"
    printf "  %-24s %s  %s\n" "$name" "$status_icon" "$detail"
}

# Verificar Node.js
if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    status "Node.js" "${GREEN}[  OK  ]${NC}" "$NODE_VER"
else
    status "Node.js" "${RED}[FALTA ]${NC}" "No instalado"
fi

# Verificar Bun
if command -v bun &>/dev/null; then
    BUN_VER=$(bun --version)
    status "Bun" "${GREEN}[  OK  ]${NC}" "v${BUN_VER}"
else
    status "Bun" "${YELLOW}[ WARN ]${NC}" "No instalado (opcional)"
fi

# Verificar npm
if command -v npm &>/dev/null; then
    NPM_VER=$(npm -v)
    status "npm" "${GREEN}[  OK  ]${NC}" "v${NPM_VER}"
else
    status "npm" "${RED}[FALTA ]${NC}" "No instalado"
fi

# Verificar Prisma
if command -v npx &>/dev/null && npx prisma --version &>/dev/null; then
    PRISMA_VER=$(npx prisma --version 2>/dev/null | head -1 | awk '{print $NF}')
    status "Prisma CLI" "${GREEN}[  OK  ]${NC}" "${PRISMA_VER}"
else
    status "Prisma CLI" "${YELLOW}[ WARN ]${NC}" "No verificado"
fi

# Base de datos
if [[ -f "prisma/dev.db" ]]; then
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    DB_TABLES=$(sqlite3 prisma/dev.db ".tables" 2>/dev/null | wc -w || echo "?")
    status "Base de Datos" "${GREEN}[  OK  ]${NC}" "${DB_SIZE}, ${DB_TABLES} tablas"
else
    status "Base de Datos" "${RED}[FALTA ]${NC}" "No encontrada"
fi

# node_modules
if [[ -d "node_modules" ]]; then
    DEPS_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l)
    status "Dependencias" "${GREEN}[  OK  ]${NC}" "${DEPS_COUNT} paquetes"
else
    status "Dependencias" "${RED}[FALTA ]${NC}" "Ejecutar install.sh"
fi

# Build
if [[ -d ".next/server" ]]; then
    BUILD_DATE=$(stat -c %y .next/server 2>/dev/null | cut -d'.' -f1 || stat -f %Sm .next/server 2>/dev/null || echo "?")
    status "Build Produccion" "${GREEN}[  OK  ]${NC}" "$BUILD_DATE"
else
    status "Build Produccion" "${YELLOW}[ WARN ]${NC}" "No compilado"
fi

# Puerto 3000
if command -v lsof &>/dev/null; then
    PORT_3000=$(lsof -ti:3000 2>/dev/null || echo "")
    if [[ -n "$PORT_3000" ]]; then
        status "Puerto 3000" "${GREEN}[  OK  ]${NC}" "En uso (PID: $(echo $PORT_3000 | head -1))"
    else
        status "Puerto 3000" "${CYAN}[LIBRE ]${NC}" "Disponible"
    fi
else
    status "Puerto 3000" "${YELLOW}[ INFO ]${NC}" "lsof no disponible"
fi

# Espacio en disco
DISK_INFO=$(df -h . | awk 'NR==2{print $4" libre de "$2" ("$5" usado)"}')
status "Espacio Disco" "${GREEN}[  OK  ]${NC}" "$DISK_INFO"

# SO
echo
echo -e "  ${BOLD}Sistema Operativo:${NC} ${OS_INFO}"
echo -e "  ${BOLD}Directorio:${NC}      ${SCRIPT_DIR}"
echo -e "  ${BOLD}Version App:${NC}     v${APP_VERSION}"
echo