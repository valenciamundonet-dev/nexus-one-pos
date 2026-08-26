#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Nexus One POS v2.9.73 — Script de inicio para Linux y macOS
#
# Detecta bun (preferido) o npm, instala dependencias,
# inicializa SQLite WAL y levanta la app + agente de impresion.
#
# Uso:
#   chmod +x start.sh
#   ./start.sh                  # modo desarrollo
#   ./start.sh --skip-install   # omitir instalacion
#   ./start.sh --production     # modo produccion
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# --- Configuration ---
APP_PORT="${APP_PORT:-3000}"
PRINTER_PORT="${PRINTER_AGENT_PORT:-9100}"
DB_PATH="prisma/dev.db"
SKIP_INSTALL=false
PRODUCTION_MODE=false

# --- Parse arguments ---
for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=true ;;
    --production)  PRODUCTION_MODE=true ;;
    -h|--help)
      echo "Uso: $0 [--skip-install] [--production]"
      exit 0
      ;;
  esac
done

# --- Detect package manager (bun preferred, npm fallback) ---
if command -v bun &>/dev/null; then
  PKG="bun"
  echo -e "\033[32m[OK] Bun detectado: $(bun --version)\033[0m"
else
  PKG="npm"
  if command -v npm &>/dev/null; then
    echo -e "\033[33m[INFO] Bun no encontrado. Se usara npm: $(npm --version)\033[0m"
  else
    echo -e "\033[31m[ERROR] No se encontro bun ni npm. Instale Bun: https://bun.sh\033[0m"
    exit 1
  fi
fi

# Helper: invoke package manager
run_pkg() {
  $PKG "$@"
}

# --- Banner ---
echo ''
echo -e '\033[36m╔═══════════════════════════════════════════════════════╗\033[0m'
echo -e '\033[36m║        Nexus One POS v2.9.73 — Inicio Rapido        ║\033[0m'
echo -e '\033[36m║        Next.js 15 + Bun + SQLite WAL + shadcn/ui    ║\033[0m'
echo -e '\033[36m╚═══════════════════════════════════════════════════════╝\033[0m'
echo ''

# --- Step 1: Install dependencies ---
echo -e '\033[1m[1/5] Instalando dependencias...\033[0m'
if [ "$SKIP_INSTALL" = true ]; then
  echo -e '\033[33m[INFO] Instalacion omitida (--skip-install).\033[0m'
else
  run_pkg install
  echo -e '\033[32m[OK] Dependencias instaladas.\033[0m'
fi

# --- Step 2: Generate Prisma client ---
echo ''
echo -e '\033[1m[2/5] Generando cliente Prisma...\033[0m'
if [ "$PKG" = "bun" ]; then
  bunx prisma generate
else
  npx prisma generate
fi
echo -e '\033[32m[OK] Cliente Prisma generado.\033[0m'

# --- Step 3: Push database schema (SQLite WAL) ---
echo ''
echo -e '\033[1m[3/5] Sincronizando esquema de base de datos...\033[0m'
if [ "$PKG" = "bun" ]; then
  bunx prisma db push --skip-generate 2>/dev/null || true
else
  npx prisma db push --skip-generate 2>/dev/null || true
fi

# Verify DB file exists
if [ -f "$DB_PATH" ]; then
  db_size=$(du -k "$DB_PATH" | cut -f1)
  echo -e "\033[32m[OK] Base de datos: $DB_PATH (${db_size} KB)\033[0m"
else
  echo -e "\033[33m[WARN] No se encontro $DB_PATH. Se creara al primer acceso.\033[0m"
fi

# --- Step 4: Start printer agent (background) ---
echo ''
echo -e "\033[1m[4/5] Iniciando agente de impresion (puerto $PRINTER_PORT)...\033[0m"
AGENT_PATH="printer-agent/agent.js"
if [ -f "$AGENT_PATH" ]; then
  PRINTER_AGENT_PORT="$PRINTER_PORT" node "$AGENT_PATH" &
  AGENT_PID=$!
  echo -e "\033[32m[OK] Agente de impresion iniciado (PID: $AGENT_PID)\033[0m"
  sleep 1
else
  echo -e "\033[33m[WARN] No se encontro $AGENT_PATH. El agente no se iniciara.\033[0m"
  AGENT_PID=""
fi

# --- Step 5: Start Next.js application ---
echo ''
echo -e "\033[1m[5/5] Iniciando Nexus One POS (puerto $APP_PORT)...\033[0m"
echo ''
echo -e '\033[32m╔═══════════════════════════════════════════════════════╗\033[0m'
echo -e "\033[32m║  Nexus One POS listo en http://localhost:$APP_PORT            ║\033[0m"
echo -e "\033[32m║  Agente de impresion en http://localhost:$PRINTER_PORT       ║\033[0m"
echo -e '\033[32m║  Presione Ctrl+C para detener ambos servicios.       ║\033[0m'
echo -e '\033[32m╚═══════════════════════════════════════════════════════╝\033[0m'
echo ''

# Cleanup function: kill printer agent on exit
cleanup() {
  echo ''
  if [ -n "${AGENT_PID:-}" ] && kill -0 "$AGENT_PID" 2>/dev/null; then
    kill "$AGENT_PID" 2>/dev/null || true
    echo -e '\033[33m[INFO] Agente de impresion detenido.\033[0m'
  fi
  echo -e '\033[33m[INFO] Nexus One POS detenido. Hasta pronto.\033[0m'
  exit 0
}
trap cleanup INT TERM

# Start the app
if [ "$PRODUCTION_MODE" = true ]; then
  run_pkg run start
else
  run_pkg run dev
fi
