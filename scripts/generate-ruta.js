const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, PageBreak, Header, Footer, PageNumber, NumberFormat, SectionType, TabStopPosition, TabStopType } = require('docx');
const fs = require('fs');

// Tech palette
const P = { primary: '0A1628', body: '1A2B40', secondary: '6878A0', accent: '3B82F6', surface: 'F4F8FC', white: 'FFFFFF' };

const B = { style: BorderStyle.NONE, size: 0, color: P.white };
const noBorders = { top: B, bottom: B, left: B, right: B };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' };
const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function hdr(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 150, line: 312 }, children: [new TextRun({ text, font: 'Calibri', size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 24, bold: true, color: P.primary })] });
}

function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120, line: 312 }, alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text, font: 'Calibri', size: 22, color: opts.color || P.body, bold: opts.bold || false, italics: opts.italic || false })] });
}

function statusCell(status) {
  const colors = { DONE: '16A34A', ACTIVE: '3B82F6', PENDING: '9CA3AF', BLOCKED: 'EF4444' };
  const c = colors[status] || '9CA3AF';
  return new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: status, font: 'Calibri', size: 18, bold: true, color: c })] });
}

function row(phase, task, status, priority, files) {
  return new TableRow({ tableHeader: false, children: [
    new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: tableBorders, shading: { fill: P.surface, type: ShadingType.CLEAR }, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: phase, font: 'Calibri', size: 18, bold: true, color: P.primary })] })] }),
    new TableCell({ width: { size: 3800, type: WidthType.DXA }, borders: tableBorders, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: task, font: 'Calibri', size: 18, color: P.body })] })] }),
    new TableCell({ width: { size: 1100, type: WidthType.DXA }, borders: tableBorders, children: [statusCell(status)] }),
    new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: tableBorders, children: [new Paragraph({ spacing: { before: 40, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: priority, font: 'Calibri', size: 18, bold: true, color: priority === 'ALTA' ? 'EF4444' : 'F59E0B' })] })] }),
    new TableCell({ width: { size: 3000, type: WidthType.DXA }, borders: tableBorders, children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: files, font: 'Calibri', size: 16, color: P.secondary, italics: true })] })] }),
  ] });
}

function headerRow() {
  const hdrStyle = { fill: P.primary, type: ShadingType.CLEAR };
  const mkCell = (text, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: tableBorders, shading: hdrStyle, children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, font: 'Calibri', size: 18, bold: true, color: P.white })] })] });
  return new TableRow({ tableHeader: true, children: [mkCell('Fase', 1200), mkCell('Tarea', 3800), mkCell('Estado', 1100), mkCell('Prioridad', 900), mkCell('Archivos', 3000)] });
}

const tasks = [
  ['1', 'Renombrar MyeCommerce a NexusOne + lema', 'DONE', 'ALTA', 'package.json, layout.tsx, page.tsx, version.ts, manifest.json, .bat, .vbs, LEEME.md'],
  ['1', 'Nuevo logo atomo de neon (login + PWA + favicon)', 'DONE', 'ALTA', 'icon-192.png, icon-512.png, favicon.ico, login-screen.tsx, manifest.json'],
  ['2', 'Pilar 1: Molecular Optimization (CatalogSearchEngine, rafDebounce, BatchProcessor)', 'DONE', 'ALTA', 'performance-engine.ts, CatalogSearchEngine class'],
  ['2', 'Pilar 2: Radical UX/UI (Privacy Mode, Global Shortcuts, Cinematic Dark)', 'DONE', 'ALTA', 'use-privacy-mode.ts, use-global-shortcuts.ts, globals.css, page.tsx'],
  ['2', 'Pilar 3: Local License Engine (Feature Flags + HMAC-SHA256)', 'DONE', 'ALTA', 'feature-flags.ts, license/route.ts'],
  ['2', 'Pilar 4: Tax Adapter Pattern (VE SENIAT + US Sales Tax)', 'DONE', 'ALTA', 'tax-adapter.ts, venezuela.ts, us-sales-tax.ts'],
  ['2', 'Pilar 5: Fault Tolerance (WAL/ACID + Peripheral Isolator)', 'DONE', 'ALTA', 'resilient-db.ts, peripheral-isolator.ts, db.ts, instrumentation.ts'],
  ['2', 'Integracion: instrumentation.ts conecta pilares al startup', 'DONE', 'ALTA', 'instrumentation.ts'],
  ['2', 'Integracion: safeTransaction en Sales API', 'DONE', 'ALTA', 'api/sales/route.ts'],
  ['2', 'Integracion: Feature Token en License API', 'DONE', 'ALTA', 'api/license/route.ts'],
  ['2', 'Mejoras visuales: Login cinematografico + Privacy indicator', 'DONE', 'MEDIA', 'login-screen.tsx, globals.css, page.tsx'],
  ['3', 'Feature Flags gating: ocultar tabs por plan', 'PENDING', 'ALTA', 'page.tsx (isTabAccessible + featureToken)'],
  ['3', 'Tax Adapter en tickets: usar calculateTaxes() en ticket-printer', 'PENDING', 'ALTA', 'ticket-printer.ts, escpos-buffer.ts'],
  ['3', 'Auto-focus post barcode: enfocar campo tras escaneo', 'PENDING', 'ALTA', 'use-barcode-wedge.ts, pos-tab.tsx'],
  ['3', 'Memoizacion de componentes pesados (React.memo)', 'PENDING', 'MEDIA', 'product-list.tsx, product-grid.tsx, cart-panel.tsx'],
  ['3', 'Virtualizacion de catalogo (100+ productos)', 'PENDING', 'MEDIA', 'product-list.tsx (windowing)'],
  ['4', 'Framer Motion: transiciones entre tabs', 'PENDING', 'MEDIA', 'page.tsx, app-nav.tsx (+ framer-motion dep)'],
  ['4', 'Worker Thread: busqueda de catalogo en background', 'PENDING', 'MEDIA', 'workers/catalog-search.worker.ts, pos-tab.tsx'],
  ['4', 'Worker Thread: cierres de caja por lote', 'PENDING', 'MEDIA', 'workers/batch-closing.worker.ts, cash-closing-tab.tsx'],
  ['4', 'Privacy Mode en pos-tab: ocultar totales del carrito', 'PENDING', 'MEDIA', 'pos-tab.tsx, cart-panel.tsx, payment-section.tsx'],
  ['4', 'Cinematic Dark Mode: glow en cards del dashboard', 'PENDING', 'BAJA', 'dashboard-tab.tsx, globals.css'],
  ['5', 'Monitor de perifericos en UI (printer/scanner status)', 'PENDING', 'MEDIA', 'config-tab.tsx, peripheral-isolator.ts'],
  ['5', 'Hot-reload fiscal: UI para cambiar pais/impuesto', 'PENDING', 'BAJA', 'config-tab.tsx, tax-adapter.ts'],
  ['5', 'Health check BD en UI (WAL status, tamano, integridad)', 'PENDING', 'BAJA', 'config-tab.tsx, resilient-db.ts, api endpoint'],
  ['6', 'Push a GitHub (v2.9.72+)', 'PENDING', 'ALTA', 'git push valenciamundonet-dev/valenciamundonet'],
  ['6', 'Documento PDF: Plan de refactoring con codigo de ejemplo', 'PENDING', 'MEDIA', 'scripts/generate-pdf.ts'],
];

const doc = new Document({
  sections: [
    // Cover
    {
      properties: { page: { size: { width: 11906, height: 16838, orientation: 0 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: [
        new Paragraph({ spacing: { before: 4000 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'NEXUS ONE POS', font: 'Calibri', size: 72, bold: true, color: P.primary })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Conecta \u00b7 Gestiona \u00b7 Crece', font: 'Calibri', size: 28, color: P.accent, bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 200 }, children: [new TextRun({ text: 'Ruta de Trabajo e Implementacion', font: 'Calibri', size: 40, bold: true, color: P.body })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Plan Maestro de Desarrollo', font: 'Calibri', size: 24, color: P.secondary })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [new TextRun({ text: 'Version 2.9.72 | 20 Agosto 2026', font: 'Calibri', size: 22, color: P.secondary })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: '5 Pilares Arquitectonicos | Windows 10+ Local', font: 'Calibri', size: 20, color: P.secondary, italics: true })] }),
      ]
    },
    // Body
    {
      properties: { 
        page: { size: { width: 11906, height: 16838, orientation: 0 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
        pageNumbers: { start: 1 }
      },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'NexusOne POS \u2014 Ruta de Implementacion', font: 'Calibri', size: 16, color: P.secondary, italics: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Pagina ', font: 'Calibri', size: 16, color: P.secondary }), new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 16, color: P.secondary })] })] }) },
      children: [
        // Resumen
        hdr('Resumen Ejecutivo'),
        para('Este documento define la ruta de trabajo completa para NexusOne POS, un sistema punto de venta local diseñado para correr en hardware minimo (2GB RAM, Celeron) con Windows 10+. La arquitectura se basa en 5 pilares que garantizan rendimiento, experiencia de usuario, licenciamiento offline, cumplimiento fiscal y tolerancia a fallos.'),
        para('La Fase 1 (rename y branding) y la Fase 2 (integracion de los 5 pilares al core del sistema) estan completadas. El trabajo actual se centra en la Fase 3 (conexion de los motores a la UI), la Fase 4 (optimizaciones avanzadas con Worker Threads y Framer Motion) y la Fase 5 (herramientas de diagnostico y monitoreo en la interfaz).'),
        para('Cada tarea incluye los archivos afectados, la prioridad y el estado actual. El objetivo es llegar a v3.0.0 con todos los pilares funcionando de punta a punta.'),

        // Arquitectura
        hdr('Arquitectura de los 5 Pilares'),
        para('Pilar 1 - Molecular Optimization: El motor de rendimiento incluye un CatalogSearchEngine con indice invertido O(1), funciones rafDebounce y throttleTrailing basadas en requestAnimationFrame, un BatchProcessor para operaciones masivas que no bloquea el event loop, y un monitor de memoria que activa modo ahorro cuando se supera el umbral de 1200MB. Todo orientado a mantener 60+ FPS en hardware de baja gama.'),
        para('Pilar 2 - Radical UX/UI: El hook usePrivacyMode permite ocultar o difuminar montos de dinero con Ctrl+Shift+P. El hook useGlobalShortcuts registra atajos globales (F2 buscar, F4 vender, F5 limpiar, Ctrl+B productos, Ctrl+R reportes, Ctrl+D dashboard). El CSS incluye Cinematic Dark Mode con variables de glow, sombras con halo primario, y animaciones de pulse para el login.'),
        para('Pilar 3 - Local License Engine: Tres planes (Conecta/Gratis, Gestiona/ Basico, Crece/Profesional) con 30+ feature flags firmados criptograficamente con HMAC-SHA256. El token se genera server-side y se verifica localmente sin internet. Cada tab del sistema tiene un mapeo a la feature requerida.'),
        para('Pilar 4 - Tax Adapter Pattern: El core de ventas es agnostico fiscal. Cada pais es un TaxStrategy independiente registrado en el TaxRegistry. Venezuela (SENIAT) con IVA 16%/8%/exento y US Sales Tax con tasas por estado estan implementados. Soporta hot-reload de configuraciones fiscales via JSON cuando detecta internet.'),
        para('Pilar 5 - Fault Tolerance: SQLite configurado con WAL mode, synchronous FULL, busy timeout 5s, cache 8MB, y secure delete. La funcion safeTransaction envuelve operaciones con retry automatico ante SQLITE_BUSY. El PeripheralIsolator implementa Circuit Breaker con timeout, retry y cooldown para impresora, escaner y cajon.'),

        // Ruta detallada
        hdr('Ruta de Implementacion Detallada'),
        hdr('Fase 3: Conexion Motores-UI (Prioridad Alta)', HeadingLevel.HEADING_2),
        para('Esta fase conecta los motores core que ya estan implementados con la interfaz de usuario. Es la prioridad mas alta porque los pilares existen pero no son visibles para el usuario final.'),
        para('Feature Flags Gating: El archivo page.tsx recibe featureToken desde la API de licencia, pero actualmente no lo usa para ocultar tabs. Se debe importar isTabAccessible del feature-flags y filtrar las TabsContent para que solo muestre las tabs permitidas por el plan activo. Esto transforma el sistema de licencia en algo tangible para el usuario.'),
        para('Tax Adapter en Tickets: El ticket-printer.ts actualmente calcula impuestos de forma hardcoded. Debe importar calculateTaxes del tax-adapter y usar la estrategia registrada para generar las lineas fiscales del ticket. Esto permite que el mismo sistema funcione en Venezuela o EE.UU sin cambiar codigo de ventas.'),
        para('Auto-focus Post Barcode: Cuando el escaner de codigo de barras lee un producto, el cursor debe volver automaticamente al campo de busqueda para permitir escaneo continuo estilo WhatsApp. El hook use-barcode-wedge.ts ya existe y detecta lecturas rapidas, pero no esta conectado al flujo de auto-focus del POS.'),

        hdr('Fase 4: Optimizaciones Avanzadas (Prioridad Media)', HeadingLevel.HEADING_2),
        para('Memoizacion de Componentes: Envolver componentes pesados como product-list, product-grid y cart-panel con React.memo para evitar re-renders innecesarios. Usar useMemo para listas de productos filtradas y useCallback para handlers que se pasan como props. Esto es critico para mantener 60 FPS con catalogos grandes.'),
        para('Virtualizacion de Catalogo: Cuando el catalogo supera 100 productos, implementar windowing para solo renderizar los items visibles en pantalla. El CatalogSearchEngine ya tiene el metodo needsVirtualization() que indica cuando activarla. Se puede usar una implementacion simple con IntersectionObserver.'),
        para('Framer Motion: Agregar la dependencia framer-motion y envolver las transiciones entre tabs con AnimatePresence y motion.div. Las animaciones deben ser sutiles (fade + slide de 150ms) para no afectar el rendimiento en hardware de baja gama.'),
        para('Worker Threads: Mover la busqueda de catalogo y el procesamiento de cierres de lote a Web Workers para no bloquear el hilo principal. Next.js soporta Worker Threads via new Worker(). Esto es critico para la Prueba de la Tostadora en Celeron/2GB.'),

        hdr('Fase 5: Diagnostico y Monitoreo (Prioridad Baja-Media)', HeadingLevel.HEADING_2),
        para('Monitor de Perifericos: Crear un panel en config-tab.tsx que muestre el estado en tiempo real de impresora, escaner y cajon usando los datos del PeripheralIsolator. Verde = conectado, rojo = desconectado, amarillo = reintentando. Esto hace visible el Pilar 5 al usuario.'),
        para('Health Check de BD: Crear un endpoint API y una seccion en config-tab que muestre: estado WAL (on/off), tamano de BD, tamano del WAL, integridad (ok/corrupto), y boton para forzar checkpoint manual. Usar las funciones checkDBIntegrity y forceCheckpoint del resilient-db.'),

        // Tabla de tareas
        hdr('Tabla de Tareas Completa'),
        new Table({
          width: { size: 10000, type: WidthType.DXA },
          rows: [headerRow(), ...tasks.map(t => row(...t))]
        }),

        // Versiones
        hdr('Historial de Versiones'),
        para('v2.9.68-v2.9.69: Rename completo MyeCommerce a NexusOne + primer push a GitHub.', { bold: false }),
        para('v2.9.70: Preparacion para Fase 2 (archivos core creados pero no integrados).', { bold: false }),
        para('v2.9.71 (Fase 2): Integracion de los 5 pilares al sistema. Instrumentation.ts conecta motores al startup. Sales API usa safeTransaction. License API genera featureToken. Creado us-sales-tax.ts como segundo ejemplo de TaxAdapter.', { bold: false }),
        para('v2.9.72: Fix build (coma doble en license/route.ts). Nuevo logo aplicado. Login cinematografico con glow/shimmer. Privacy Mode indicator visual en footer.', { bold: false }),
        para('v2.9.73+ (Fase 3): Feature flags gating, tax adapter en tickets, auto-focus post barcode.', { bold: true }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/z/my-project/download/NexusOne-Ruta-de-Implementacion.docx', buffer);
  console.log('OK: NexusOne-Ruta-de-Implementacion.docx');
});
