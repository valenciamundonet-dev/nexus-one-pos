# NexusOne POS v2.9.73

Sistema Punto de Venta offline-first construido con Next.js 15, Bun, Prisma, SQLite (WAL) y shadcn/ui. Diseñado para ejecutarse en un solo equipo sin dependencias externas.

---

## 🏗️ Arquitectura y Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Runtime | Bun 1.1.x (npm como alternativa) |
| Base de datos | SQLite con modo WAL (`prisma/dev.db`) |
| ORM | Prisma 5.22 + generador de cliente |
| UI | shadcn/ui + Tailwind CSS 3.4 + Lucide Icons |
| Estado | Zustand 5 (stores atómicos) |
| Impresión | Agente ESC/POS vía winspool.drv (Windows) |
| CI/CD | GitHub Actions (lint, build, test-db, release) |

### Refactorizaciones incluidas

- **Atomic Stores** — Stores Zustand inmutables con transacciones atómicas (`atomic-cart-store`, `atomic-features-store`)
- **Hot Cache** — Caché en memoria de productos con invalidación automática (`hot-products-cache`)
- **Web Workers** — Búsqueda de productos en hilo separado (`search-worker-client` + `public/workers/search-worker.js`)
- **WAL DB** — SQLite en modo Write-Ahead Logging para lecturas concurrentes sin bloqueos
- **Feature Flags** — Sistema de activación de funciones en tiempo de ejecución
- **Motor de Impuestos** — Cálculo automático con tipos SENIAT: exento (0%), reducido (8%), general (16%)
- **Auto-Focus** — Navegación por teclado y enfoque automático en campos de búsqueda
- **Virtualización** — Renderizado eficiente de listas grandes de productos
- **Pestañas de Diagnóstico** — 3 pestañas (`diagnostics-tab`, `db-health-tab`, `tax-reload-tab`) con 3 APIs (`/api/diagnostics`, `/api/db-health`, `/api/tax-reload`)

---

## 🚀 Inicio Rápido

### Requisitos previos

- **Bun** ≥ 1.1 (recomendado) — [instalar](https://bun.sh)  
  o **Node.js** ≥ 20 + **npm** ≥ 10 (alternativa)
- **Windows** para impresión térmica (agente usa `winspool.drv`)

### Instalación

```bash
# Clonar e instalar
bun install          # o: npm install

# Generar cliente Prisma y sincronizar SQLite
bunx prisma generate
bunx prisma db push

# Copiar variables de entorno
cp .env.example .env
# Editar .env y cambiar JWT_SECRET
```

### Iniciar (todos los servicios)

**Linux / macOS:**
```bash
chmod +x start.sh
./start.sh                    # Desarrollo
./start.sh --production       # Producción
./start.sh --skip-install     # Sin reinstalar dependencias
```

**Windows (PowerShell):**
```powershell
.\INICIAR-TODO.ps1                    # Desarrollo
.\INICIAR-TODO.ps1 -Production        # Producción
.\INICIAR-TODO.ps1 -SkipInstall       # Sin reinstalar
```

**Windows (cmd):**
```cmd
INICIAR-TODO.bat
```

La aplicación queda disponible en **http://localhost:3000** y el agente de impresión en **http://localhost:9100**.

---

## 🐳 Docker

```bash
# Construir y levantar (solo la app)
docker compose up -d --build

# Incluir agente de impresion (solo para pruebas, sin acceso a impresoras reales)
docker compose --profile printer up -d --build

# Ver logs
docker compose logs -f nexus-app

# Detener
docker compose down
```

> **Nota:** El agente de impresión usa `winspool.drv` (API de Windows). En contenedores Docker (Linux) el agente arranca pero no puede acceder a impresoras. Para producción en Windows, use los scripts `.bat` o `.ps1`.

---

## 📁 Estructura del Proyecto

```
nexus-one-pos/
├── prisma/
│   ├── schema.prisma          # Esquema completo de la base de datos
│   ├── dev.db                 # SQLite WAL (se genera automaticamente)
│   └── migrations/            # Migraciones SQL
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout raiz (tema, fuentes, metadata)
│   │   ├── page.tsx           # Página principal (POS)
│   │   ├── globals.css        # Estilos globales Tailwind
│   │   └── api/               # API Routes (40+ endpoints)
│   │       ├── auth/          # Autenticacion JWT
│   │       ├── products/      # CRUD productos, importacion, exportacion
│   │       ├── sales/         # Ventas y cobros
│   │       ├── clients/       # Clientes, estadisticas, exportacion
│   │       ├── purchases/     # Compras y proveedores
│   │       ├── reports/       # Reportes (P&G, ventas)
│   │       ├── backup/        # Respaldo y restauracion de BD
│   │       ├── diagnostics/   # Diagnostico del sistema
│   │       ├── db-health/     # Salud de SQLite
│   │       ├── tax-reload/    # Recarga de motor de impuestos
│   │       ├── print-agent/   # Puente al agente ESC/POS
│   │       └── ...
│   ├── components/
│   │   ├── pos/               # Interfaz de punto de venta
│ │   │   ├── cart/            # Panel del carrito y pagos
│   │   │   ├── products/      # Grilla y lista de productos
│   │   │   ├── hooks/         # Hooks: scanner, barcode, shortcuts, cart
│   │   │   └── dialogs/       # Dialogos: receipt, client, credit, QR
│   │   ├── ui/                # Componentes shadcn/ui
│   │   ├── diagnostics-tab.tsx    # Pestaña de diagnostico general
│   │   ├── db-health-tab.tsx      # Pestaña de salud de BD
│   │   ├── tax-reload-tab.tsx     # Pestaña de recarga de impuestos
│   │   ├── products-tab.tsx       # Gestión de productos
│   │   ├── clients-tab.tsx        # Gestión de clientes
│   │   ├── reports-tab.tsx        # Reportes
│   │   ├── catalog-tab.tsx        # Catalogo visual
│   │   ├── expenses-tab.tsx       # Gastos
│   │   ├── kardex-tab.tsx         # Kardex de inventario
│   │   ├── quotes-tab.tsx         # Cotizaciones
│   │   ├── credit-tab.tsx         # Creditos y cobros
│   │   └── ...
│   ├── core/                  # Logica de negocio refactorizada
│   │   ├── atomic-cart-store.ts   # Store atomico del carrito
│   │   ├── atomic-features-store.ts  # Store atomico de features
│   │   ├── hot-products-cache.ts  # Cache en memoria de productos
│   │   ├── search-worker-client.ts # Cliente del Web Worker de busqueda
│   │   ├── performance-engine.ts  # Motor de rendimiento
│   │   ├── peripheral-isolator.ts # Aislamiento de perifericos
│   │   └── nexus-db-local.ts      # Wrapper de base de datos local
│   └── lib/                   # Utilidades compartidas
│       ├── db.ts              # Instancia singleton de Prisma
│       ├── auth.ts            # JWT y sesiones
│       ├── session.ts         # Gestion de sesion
│       ├── license.ts         # Validacion de licencia
│       ├── tax-adapter.ts     # Adaptador del motor de impuestos
│       ├── ticket-printer.ts  # Generacion de tickets ESC/POS
│       ├── escpos-buffer.ts   # Buffer binario ESC/POS
│       ├── escpos-logo.ts     # Logo en formato ESC/POS
│       ├── auto-backup.ts     # Respaldo automatico
│       ├── machine-id.ts      # Identificador unico de maquina
│       └── ...
├── printer-agent/
│   ├── agent.js               # Agente ESC/POS (Node.js puro, sin deps)
│   └── README.md
├── public/
│   ├── workers/search-worker.js  # Web Worker de busqueda
│   ├── sw.js                   # Service Worker (PWA)
│   ├── manifest.json           # Manifiesto PWA
│   └── ...
├── scripts/
│   ├── release.js              # Generador de versiones y dist ZIP
│   └── ...
├── .github/workflows/
│   └── ci.yml                  # CI/CD (lint, build, test-db, release)
├── Dockerfile                  # Imagen Docker multi-stage
├── docker-compose.yml          # Compose: app + printer-agent
├── .env.example                # Plantilla de variables de entorno
├── start.sh                    # Script de inicio (Linux/macOS)
├── INICIAR-TODO.ps1            # Script de inicio (PowerShell)
├── INICIAR-TODO.bat            # Script de inicio (cmd)
└── package.json
```

---

## 📋 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `bun run dev` | Servidor de desarrollo en puerto 3000 |
| `bun run build` | Compilacion de produccion |
| `bun run start` | Servidor de produccion |
| `bun run lint` | Linting con Next.js ESLint |
| `bun run setup` | Sincronizar esquema Prisma a SQLite |
| `bun run release` | Generar nueva version (patch). Usar `bun run release -- minor` o `major` |
| `./start.sh` | Iniciar app + agente en Linux/macOS |
| `./INICIAR-TODO.ps1` | Iniciar app + agente en Windows (PowerShell) |
| `INICIAR-TODO.bat` | Iniciar todo en Windows (cmd) |

---

## 🏷️ Versionado

El script `scripts/release.js` gestiona las versiones:

```bash
bun run release              # 2.9.73 → 2.9.74 (patch)
bun run release -- minor     # 2.9.73 → 2.10.0
bun run release -- major     # 2.9.73 → 3.0.0
```

Cada release genera:
1. Actualización de `package.json`
2. Commit y tag de Git (`v2.9.74`)
3. Archivo ZIP en `download/NexusOne-v2.9.74.zip`

En CI/CD, al pushear un tag `v*`, GitHub Actions crea un Release con el ZIP adjunto.

---

## 🔧 Configuración

### Variables de entorno

Copie `.env.example` a `.env` y ajuste los valores. Las más importantes:

| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` | Ruta a la base de datos SQLite |
| `APP_PORT` | `3000` | Puerto de la aplicación |
| `JWT_SECRET` | — | **Obligatorio en producción.** Clave para sesiones JWT |
| `PRINTER_AGENT_PORT` | `9100` | Puerto del agente de impresión |
| `AUTO_BACKUP_ENABLED` | `true` | Activar respaldos automáticos |
| `AUTO_BACKUP_INTERVAL_MINUTES` | `60` | Intervalo entre respaldos |

### Impresora térmica

El agente (`printer-agent/agent.js`) se comunica con impresoras Windows mediante `winspool.drv` directamente, sin diálogos del sistema. Endpoints:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/status` | Estado del agente, impresora configurada, contador |
| GET | `/printers` | Listar impresoras Windows disponibles |
| POST | `/detect` | Auto-detectar impresora térmica por nombre/puerto |
| POST | `/print` | Enviar buffer ESC/POS a la impresora |

---

## 🔄 CI/CD

El pipeline en `.github/workflows/ci.yml` ejecuta:

1. **Lint & Type Check** — `tsc --noEmit` + `next lint`
2. **Build** — `prisma generate` + `next build` (artifact por 7 días)
3. **SQLite Health Check** — `prisma db push` + verificación de tablas
4. **Release** (solo en tags `v*`) — Genera ZIP y crea GitHub Release

---

## 🩺 Diagnóstico (3 pestañas + 3 APIs)

| Pestaña | API | Función |
|---|---|---|
| **Diagnóstico** | `GET /api/diagnostics` | Estado de periféricos, agente de impresión, rendimiento |
| **Salud BD** | `GET /api/db-health` | Tamaño de BD, tablas, integridad WAL, estadísticas |
| **Recarga Impuestos** | `POST /api/tax-reload` | Forzar recarga del motor de impuestos SENIAT |

---

## 📄 Licencia

Software privativo. Consulte el módulo de licencia dentro de la aplicación para más detalles.
