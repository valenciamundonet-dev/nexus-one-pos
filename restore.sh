#!/usr/bin/env bash
# ============================================================
# Nexus One POS v2.9.73 — Restaurar Base de Datos desde respaldo
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BACKUP_DIR="respaldos"
DB_PATH="prisma/dev.db"

echo -e "${CYAN}${BOLD}Nexus One POS — Restaurar Base de Datos${NC}"
echo

# Listar respaldos disponibles
if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -1 ${BACKUP_DIR}/nexus-backup-*.db 2>/dev/null)" ]]; then
    echo -e "${RED}ERROR: No hay respaldos disponibles en ${BACKUP_DIR}/${NC}"
    exit 1
fi

echo "  Respaldos disponibles:"
echo
echo "  # | FechaHora | Tamano"
echo "  --+-----------+-------"

i=1
FILES=()
for f in $(ls -1t "${BACKUP_DIR}/nexus-backup-"*.db 2>/dev/null); do
    SIZE=$(du -h "$f" | cut -f1)
    BASENAME=$(basename "$f")
    DATE_STR=$(echo "$BASENAME" | sed 's/nexus-backup-\([0-9-]*\)\.db/\1/')
    echo "  ${i} | ${DATE_STR} | ${SIZE}"
    FILES+=("$f")
    i=$((i + 1))
    if [[ $i -gt 10 ]]; then break; fi
done

echo
read -rp "  Seleccione el numero de respaldo a restaurar [1]: " SELECTED
SELECTED=${SELECTED:-1}

if [[ ! "$SELECTED" =~ ^[0-9]+$ ]] || [[ $SELECTED -lt 1 ]] || [[ $SELECTED -gt ${#FILES[@]} ]]; then
    echo -e "${RED}Seleccion invalida.${NC}"
    exit 1
fi

TARGET="${FILES[$((SELECTED-1))]}"
echo
echo -e "${YELLOW}ATENCION: Esto reemplazara la base de datos actual.${NC}"
read -rp "  Confirmar restauracion? [s/N] " confirm
if [[ ! "$confirm" =~ ^[sSyY]$ ]]; then
    echo "  Restauracion cancelada."
    exit 0
fi

echo -e "  Deteniendo servicios..."
pkill -f "next" 2>/dev/null || true
sleep 1

# Backup actual antes de restaurar
if [[ -f "$DB_PATH" ]]; then
    PRE_RESTORE="${BACKUP_DIR}/pre-restore-$(date +%Y%m%d-%H%M%S).db"
    cp "$DB_PATH" "$PRE_RESTORE"
    echo -e "  ${CYAN}Respaldo pre-restauracion: ${PRE_RESTORE}${NC}"
fi

# Restaurar
cp "$TARGET" "$DB_PATH"
cp "${TARGET}-wal" "${DB_PATH}-wal" 2>/dev/null || true
cp "${TARGET}-shm" "${DB_PATH}-shm" 2>/dev/null || true

echo -e "  ${GREEN}OK${NC} — Base de datos restaurada desde: $(basename "$TARGET")"
echo
echo -e "  Para iniciar: ${CYAN}./start.sh${NC}"
echo