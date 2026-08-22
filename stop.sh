#!/usr/bin/env bash
# ============================================================
# Nexus One POS v2.9.73 — Detener todos los servicios
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}Nexus One POS — Deteniendo servicios...${NC}"
echo

# Matar procesos del proyecto
KILLED=0

# Matar Next.js dev
if pkill -f "next dev" 2>/dev/null; then
    echo -e "  ${GREEN}OK${NC} — next dev detenido"
    KILLED=$((KILLED + 1))
fi

# Matar Next.js start (produccion)
if pkill -f "next start" 2>/dev/null; then
    echo -e "  ${GREEN}OK${NC} — next start detenido"
    KILLED=$((KILLED + 1))
fi

# Matar printer-agent
if pkill -f "node.*agent.js" 2>/dev/null; then
    echo -e "  ${GREEN}OK${NC} — printer-agent detenido"
    KILLED=$((KILLED + 1))
fi

# Matar cualquier proceso node en el puerto 3000
PID_3000=$(lsof -ti:3000 2>/dev/null || true)
if [[ -n "$PID_3000" ]]; then
    kill -9 $PID_3000 2>/dev/null || true
    echo -e "  ${GREEN}OK${NC} — puerto 3000 liberado"
    KILLED=$((KILLED + 1))
fi

# Matar puerto 9100 (printer-agent)
PID_9100=$(lsof -ti:9100 2>/dev/null || true)
if [[ -n "$PID_9100" ]]; then
    kill -9 $PID_9100 2>/dev/null || true
    echo -e "  ${GREEN}OK${NC} — puerto 9100 liberado"
    KILLED=$((KILLED + 1))
fi

if [[ $KILLED -eq 0 ]]; then
    echo -e "  ${CYAN}No hay servicios activos.${NC}"
else
    echo -e "  ${BOLD}Servicios detenidos: ${KILLED}${NC}"
fi
echo