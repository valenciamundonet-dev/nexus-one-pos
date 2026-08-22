#!/usr/bin/env bash
# ============================================================
# Nexus One POS v2.9.73 — Respaldo de Base de Datos
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="respaldos"
mkdir -p "$BACKUP_DIR"

DB_PATH="prisma/dev.db"

if [[ ! -f "$DB_PATH" ]]; then
    echo -e "${RED}ERROR: No se encontro la base de datos en ${DB_PATH}${NC}"
    exit 1
fi

echo -e "${CYAN}${BOLD}Nexus One POS — Respaldo de Base de Datos${NC}"
echo

# 1. Copia binaria del DB + WAL
BACKUP_FILE="${BACKUP_DIR}/nexus-backup-${TIMESTAMP}.db"
cp "$DB_PATH" "$BACKUP_FILE"
cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal" 2>/dev/null || true
cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm" 2>/dev/null || true

DB_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "  ${GREEN}OK${NC} — Respaldo binario: ${BACKUP_FILE} (${DB_SIZE})"

# 2. Export SQL si sqlite3 esta disponible
if command -v sqlite3 &>/dev/null; then
    SQL_FILE="${BACKUP_DIR}/nexus-backup-${TIMESTAMP}.sql"
    sqlite3 "$DB_PATH" ".dump" > "$SQL_FILE" 2>/dev/null
    SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
    echo -e "  ${GREEN}OK${NC} — Export SQL: ${SQL_FILE} (${SQL_SIZE})"
else
    echo -e "  ${CYAN}INFO${NC} — sqlite3 no disponible, solo respaldo binario"
fi

# 3. Limpiar respaldos antiguos (mantener ultimos 30)
TOTAL_BACKUPS=$(ls -1 "${BACKUP_DIR}/nexus-backup-"*.db 2>/dev/null | wc -l)
if [[ $TOTAL_BACKUPS -gt 30 ]]; then
    ls -1t "${BACKUP_DIR}/nexus-backup-"*.db | tail -n +31 | xargs rm -f 2>/dev/null
    ls -1t "${BACKUP_DIR}/nexus-backup-"*.sql | tail -n +31 | xargs rm -f 2>/dev/null
    echo -e "  ${CYAN}LIMPIEZA${NC} — Respaldos antiguos eliminados (se mantienen 30)"
fi

echo
echo -e "  ${BOLD}Respaldo completado: ${TIMESTAMP}${NC}"
echo -e "  Total de respaldos: $(ls -1 "${BACKUP_DIR}/nexus-backup-"*.db 2>/dev/null | wc -l)"
echo