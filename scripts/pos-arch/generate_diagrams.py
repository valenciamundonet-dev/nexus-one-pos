#!/usr/bin/env python3
"""Generate architecture diagrams as PNG via Playwright+CSS for the POS Architecture Blueprint PDF."""
import os, subprocess, json

OUTPUT_DIR = "/home/z/my-project/scripts/pos-arch/diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def render_diagram(html_content: str, filename: str, width: int = 1200, height: int = 800):
    """Render HTML diagram to PNG via Playwright."""
    html_path = os.path.join(OUTPUT_DIR, f"{filename}.html")
    png_path = os.path.join(OUTPUT_DIR, f"{filename}.png")
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    # Use a small Node script to screenshot with Playwright
    js_code = f"""
    const {{ chromium }} = require('playwright');
    (async () => {{
      const browser = await chromium.launch();
      const page = await browser.newPage({{ viewport: {{ width: {width}, height: {height} }} }});
      await page.goto('file://{html_path}');
      await page.waitForTimeout(300);
      await page.screenshot({{ path: '{png_path}', scale: 'device', deviceScaleFactor: 2 }});
      await browser.close();
    }})();
    """
    js_path = os.path.join(OUTPUT_DIR, f"{filename}.js")
    with open(js_path, "w") as f:
        f.write(js_code)
    
    subprocess.run(["node", js_path], check=True, capture_output=True, timeout=30)
    print(f"  Generated: {png_path}")
    return png_path


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 1: System Architecture Overview
# ═══════════════════════════════════════════════════════════════════

diagram1_html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #f4f5f5;
    width: 1200px; height: 850px;
    padding: 30px;
    color: #131514;
  }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #324e40; }
  
  /* Main grid */
  .arch-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto auto auto;
    gap: 14px;
  }
  
  .layer-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 2px; color: #747e79;
    grid-column: 1 / -1;
    padding: 4px 0;
    border-bottom: 1px solid #acc5b9;
    margin-top: 6px;
  }
  
  .box {
    background: white;
    border: 1px solid #e8ebe9;
    border-radius: 8px;
    padding: 14px 16px;
    position: relative;
  }
  .box.highlight {
    border-color: #1f9259;
    border-width: 2px;
    background: #f0faf4;
  }
  .box-title {
    font-size: 13px; font-weight: 700; margin-bottom: 6px;
    color: #324e40;
  }
  .box-items {
    font-size: 11px; color: #747e79; line-height: 1.6;
  }
  .box-items span {
    display: inline-block;
    background: #e8ebe9;
    padding: 2px 8px;
    border-radius: 4px;
    margin: 2px 3px 2px 0;
    font-size: 10px;
    color: #324e40;
  }
  
  .full-width { grid-column: 1 / -1; }
  
  /* Arrow connectors */
  .arrow-row {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 20px;
  }
  .arrow-row svg { width: 100%; height: 20px; }
  
  .badge {
    position: absolute; top: -8px; right: 12px;
    background: #1f9259; color: white;
    font-size: 9px; font-weight: 600;
    padding: 2px 8px; border-radius: 10px;
  }
  .badge.blue { background: #507aa4; }
  .badge.orange { background: #8c7443; }
</style>
</head>
<body>
<div class="title">Arquitectura del Sistema MyeCommerce Global</div>
<div class="arch-grid">
  
  <div class="layer-label">Capa de Presentacion (Tauri + React)</div>
  
  <div class="box highlight">
    <div class="box-title">POS Terminal</div>
    <div class="box-items">
      <span>Facturacion</span><span>Carrito</span><span>Busqueda</span><br>
      <span>Pagos</span><span>Impresion</span><span>Offline</span>
    </div>
    <div class="badge">LOCAL-FIRST</div>
  </div>
  
  <div class="box highlight">
    <div class="box-title">Dashboard Admin</div>
    <div class="box-items">
      <span>Reportes</span><span>Inventario</span><span>Clientes</span><br>
      <span>Compras</span><span>Config</span><span>Kardex</span>
    </div>
    <div class="badge">LOCAL-FIRST</div>
  </div>
  
  <div class="box">
    <div class="box-title">Motor de UI</div>
    <div class="box-items">
      <span>React 19</span><span>TypeScript</span><span>Tailwind 4</span><br>
      <span>Zustand</span><span>Recharts</span><span>PWA</span>
    </div>
  </div>
  
  <div class="arrow-row"><svg><line x1="50%" y1="0" x2="50%" y2="20" stroke="#acc5b9" stroke-width="2"/><polygon points="498,18 600,18 550,2" fill="#acc5b9" transform="translate(-548,0)"/></svg></div>
  
  <div class="layer-label">Capa de Aplicacion (Domain Services)</div>
  
  <div class="box">
    <div class="box-title">Sale Service</div>
    <div class="box-items">
      Transacciones ACID<br>Calculos de precio<br>Descuentos e impuestos
    </div>
  </div>
  
  <div class="box">
    <div class="box-title">Inventory Service</div>
    <div class="box-items">
      Control de stock<br>Kardex automatico<br>Alertas de reposicion
    </div>
  </div>
  
  <div class="box">
    <div class="box-title">Sync Engine</div>
    <div class="box-items">
      <span>CRDTs</span><span>Conflict Resolution</span><br>
      <span>Delta Sync</span><span>Queue Offline</span>
    </div>
    <div class="badge blue">HIBRIDO</div>
  </div>
  
  <div class="arrow-row"><svg><line x1="50%" y1="0" x2="50%" y2="20" stroke="#acc5b9" stroke-width="2"/></svg></div>
  
  <div class="layer-label">Capa de Infraestructura (Data & Hardware)</div>
  
  <div class="box">
    <div class="box-title">SQLite Local</div>
    <div class="box-items">
      <span>27 Modelos</span><span>Prisma ORM</span><br>
      WAL Mode<br>Encriptacion AES-256
    </div>
    <div class="badge orange">CIFRADO</div>
  </div>
  
  <div class="box">
    <div class="box-title">Hardware Bridge</div>
    <div class="box-items">
      <span>ESC/POS</span><span>Escáner</span><span>Lector</span><br>
      <span>Display</span><span>Drawer</span><span>Worker Threads</span>
    </div>
  </div>
  
  <div class="box">
    <div class="box-title">Cloud Sync</div>
    <div class="box-items">
      <span>PGLite</span><span>PostgreSQL</span><br>
      <span>API REST</span><span>WebSocket</span><br>
      Solo cuando hay internet
    </div>
  </div>
</div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 2: Clean Architecture Folder Structure
# ═══════════════════════════════════════════════════════════════════

diagram2_html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    background: #f4f5f5;
    width: 1200px; height: 900px;
    padding: 30px;
    color: #131514;
  }
  .title { font-family: 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #324e40; }
  
  .tree-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  
  .tree-section {
    background: white;
    border: 1px solid #e8ebe9;
    border-radius: 8px;
    padding: 18px;
  }
  
  .tree-section-title {
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px; font-weight: 700;
    color: white;
    background: #324e40;
    padding: 6px 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    display: inline-block;
  }
  
  .tree { font-size: 11px; line-height: 1.9; color: #131514; }
  .tree .dir { color: #324e40; font-weight: 600; }
  .tree .file { color: #747e79; }
  .tree .accent { color: #1f9259; }
  .tree .comment { color: #acc5b9; font-style: italic; }
  .tree .indent1 { padding-left: 18px; }
  .tree .indent2 { padding-left: 36px; }
  .tree .indent3 { padding-left: 54px; }
  .tree .indent4 { padding-left: 72px; }
</style>
</head>
<body>
<div class="title">Clean Architecture - Estructura de Carpetas</div>
<div class="tree-container">
  <div class="tree-section">
    <div class="tree-section-title">src/domain/</div>
    <div class="tree">
      <span class="dir">domain/</span> <span class="comment">// Capa de Dominio (pura, sin dependencias)</span>
      <div class="indent1"><span class="dir">entities/</span></div>
      <div class="indent2"><span class="file">Sale.ts</span> <span class="comment">// Entidad Venta</span></div>
      <div class="indent2"><span class="file">Product.ts</span> <span class="comment">// Entidad Producto</span></div>
      <div class="indent2"><span class="file">Client.ts</span></div>
      <div class="indent2"><span class="file">InventoryMovement.ts</span></div>
      <div class="indent1"><span class="dir">value-objects/</span></div>
      <div class="indent2"><span class="file">Money.ts</span> <span class="comment">// Preciso (BigInt)</span></div>
      <div class="indent2"><span class="file">Quantity.ts</span></div>
      <div class="indent2"><span class="file">Percentage.ts</span></div>
      <div class="indent1"><span class="dir">events/</span></div>
      <div class="indent2"><span class="file">SaleCreatedEvent.ts</span></div>
      <div class="indent2"><span class="file">StockDepletedEvent.ts</span></div>
      <div class="indent1"><span class="dir">interfaces/</span> <span class="comment">// Puertos</span></div>
      <div class="indent2"><span class="file">ISaleRepository.ts</span></div>
      <div class="indent2"><span class="file">IProductRepository.ts</span></div>
      <div class="indent2"><span class="file">IPrinterAdapter.ts</span></div>
    </div>
  </div>
  
  <div class="tree-section">
    <div class="tree-section-title">src/application/</div>
    <div class="tree">
      <span class="dir">application/</span> <span class="comment">// Casos de Uso</span>
      <div class="indent1"><span class="dir">use-cases/</span></div>
      <div class="indent2"><span class="file">CreateSale.usecase.ts</span></div>
      <div class="indent2"><span class="file">ProcessPayment.usecase.ts</span></div>
      <div class="indent2"><span class="file">ManageInventory.usecase.ts</span></div>
      <div class="indent2"><span class="file">SyncToCloud.usecase.ts</span></div>
      <div class="indent2"><span class="file">GenerateReport.usecase.ts</span></div>
      <div class="indent1"><span class="dir">services/</span></div>
      <div class="indent2"><span class="file">PricingService.ts</span> <span class="accent">// Logica de precios</span></div>
      <div class="indent2"><span class="file">TaxCalculator.ts</span></div>
      <div class="indent2"><span class="file">ChangeCalculator.ts</span></div>
      <div class="indent1"><span class="dir">dto/</span></div>
      <div class="indent2"><span class="file">SaleDTO.ts</span></div>
      <div class="indent2"><span class="file">ProductDTO.ts</span></div>
      <div class="indent1"><span class="dir">validators/</span></div>
      <div class="indent2"><span class="file">ZodSchemas.ts</span> <span class="comment">// Validacion</span></div>
    </div>
  </div>
  
  <div class="tree-section">
    <div class="tree-section-title">src/infrastructure/</div>
    <div class="tree">
      <span class="dir">infrastructure/</span> <span class="comment">// Adaptadores e Implementaciones</span>
      <div class="indent1"><span class="dir">persistence/</span></div>
      <div class="indent2"><span class="file">SQLiteSaleRepository.ts</span></div>
      <div class="indent2"><span class="file">PrismaClient.ts</span></div>
      <div class="indent2"><span class="file">migrations/</span></div>
      <div class="indent1"><span class="dir">hardware/</span></div>
      <div class="indent2"><span class="file">EscposPrinterAdapter.ts</span></div>
      <div class="indent2"><span class="file">ScannerAdapter.ts</span></div>
      <div class="indent2"><span class="file">DisplayAdapter.ts</span></div>
      <div class="indent1"><span class="dir">sync/</span></div>
      <div class="indent2"><span class="file">CRDTSyncEngine.ts</span> <span class="accent">// Sincronizacion</span></div>
      <div class="indent2"><span class="file">OfflineQueue.ts</span></div>
      <div class="indent2"><span class="file">CloudApiClient.ts</span></div>
    </div>
  </div>
  
  <div class="tree-section">
    <div class="tree-section-title">src/presentation/</div>
    <div class="tree">
      <span class="dir">presentation/</span> <span class="comment">// UI Components</span>
      <div class="indent1"><span class="dir">components/</span></div>
      <div class="indent2"><span class="file">POSScreen.tsx</span></div>
      <div class="indent2"><span class="file">Dashboard.tsx</span></div>
      <div class="indent2"><span class="file">InventoryTable.tsx</span></div>
      <div class="indent2"><span class="file">PaymentModal.tsx</span></div>
      <div class="indent1"><span class="dir">hooks/</span></div>
      <div class="indent2"><span class="file">useSale.ts</span></div>
      <div class="indent2"><span class="file">useKeyboardShortcuts.ts</span></div>
      <div class="indent2"><span class="file">useOfflineStatus.ts</span></div>
      <div class="indent1"><span class="dir">stores/</span> <span class="accent">// Zustand</span></div>
      <div class="indent2"><span class="file">cartStore.ts</span></div>
      <div class="indent2"><span class="file">uiStore.ts</span></div>
      <div class="indent1"><span class="dir">design-system/</span></div>
      <div class="indent2"><span class="file">tokens.ts</span> <span class="comment">// Design tokens</span></div>
    </div>
  </div>
</div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 3: OTA Update Flow
# ═══════════════════════════════════════════════════════════════════

diagram3_html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #f4f5f5;
    width: 1200px; height: 500px;
    padding: 30px;
    color: #131514;
  }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #324e40; }
  
  .flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 28px;
  }
  
  .step {
    background: white;
    border: 1px solid #e8ebe9;
    border-radius: 8px;
    padding: 14px 18px;
    text-align: center;
    min-width: 140px;
    position: relative;
  }
  .step.active {
    border-color: #1f9259;
    background: #f0faf4;
  }
  .step-num {
    display: inline-block;
    background: #324e40;
    color: white;
    width: 22px; height: 22px;
    border-radius: 50%;
    line-height: 22px;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .step.active .step-num { background: #1f9259; }
  .step-title { font-size: 12px; font-weight: 700; color: #324e40; margin-bottom: 4px; }
  .step-desc { font-size: 10px; color: #747e79; line-height: 1.4; }
  
  .arrow { font-size: 20px; color: #acc5b9; }
  
  .details {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-top: 20px;
  }
  
  .detail-card {
    background: white;
    border: 1px solid #e8ebe9;
    border-radius: 8px;
    padding: 16px;
  }
  .detail-card h3 {
    font-size: 13px; font-weight: 700; color: #324e40; margin-bottom: 8px;
  }
  .detail-card p {
    font-size: 11px; color: #747e79; line-height: 1.6;
  }
  .detail-card ul {
    font-size: 11px; color: #747e79; line-height: 1.8;
    padding-left: 16px;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="title">Flujo de Actualizacion OTA (Over-The-Air)</div>

<div class="flow">
  <div class="step">
    <div class="step-num">1</div>
    <div class="step-title">Deteccion</div>
    <div class="step-desc">Timer cada 4h<br>o al iniciar</div>
  </div>
  <div class="arrow">&#9654;</div>
  <div class="step active">
    <div class="step-num">2</div>
    <div class="step-title">Descarga</div>
    <div class="step-desc">Background<br>Delta patches<br>Checksum SHA-256</div>
  </div>
  <div class="arrow">&#9654;</div>
  <div class="step">
    <div class="step-num">3</div>
    <div class="step-title">Verificacion</div>
    <div class="step-desc">Firma Ed25519<br>Integridad<br>Compatible version</div>
  </div>
  <div class="arrow">&#9654;</div>
  <div class="step active">
    <div class="step-num">4</div>
    <div class="step-title">Preparacion</div>
    <div class="step-desc">Backup DB<br>Staging files<br>Sin interrumpir POS</div>
  </div>
  <div class="arrow">&#9654;</div>
  <div class="step">
    <div class="step-num">5</div>
    <div class="step-title">Aplicacion</div>
    <div class="step-desc">Al cerrar dia<br>o inicio de dia<br>Swap atomico</div>
  </div>
  <div class="arrow">&#9654;</div>
  <div class="step">
    <div class="step-num">6</div>
    <div class="step-title">Rollback</div>
    <div class="step-desc">Si falla boot<br>Restaurar backup<br>Auto-report</div>
  </div>
</div>

<div class="details">
  <div class="detail-card">
    <h3>Silencioso e Invisible</h3>
    <p>El cajero nunca ve la descarga. Se ejecuta con prioridad baja de CPU y se pausa automaticamente si la venta esta activa. Reanuda automaticamente al quedar inactivo.</p>
  </div>
  <div class="detail-card">
    <h3>Seguridad Criptografica</h3>
    <ul>
      <li>Firma Ed25519 del paquete</li>
      <li>Checksum SHA-256 por archivo</li>
      <li>Cadena de confianza PIN-to-PUB</li>
      <li>Verificacion pre-instalacion</li>
    </ul>
  </div>
  <div class="detail-card">
    <h3>Tolerancia a Fallos</h3>
    <ul>
      <li>Backup completo de SQLite antes</li>
      <li>Swap atomico de archivos</li>
      <li>Auto-rollback si falla arranque</li>
      <li>Reporte automatico al servidor</li>
    </ul>
  </div>
</div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 4: UX POS Screen Layout
# ═══════════════════════════════════════════════════════════════════

diagram4_html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #f4f5f5;
    width: 1200px; height: 750px;
    padding: 30px;
    color: #131514;
  }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #324e40; }
  
  .pos-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    grid-template-rows: 52px 1fr 64px;
    gap: 0;
    background: white;
    border: 2px solid #e8ebe9;
    border-radius: 10px;
    overflow: hidden;
    height: 620px;
  }
  
  .pos-header {
    grid-column: 1 / -1;
    background: #324e40;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }
  .pos-header span { font-size: 13px; font-weight: 600; }
  .pos-header .right { font-size: 11px; opacity: 0.8; }
  
  .pos-main {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 0;
  }
  
  .search-panel {
    background: #f4f5f5;
    padding: 12px;
    border-right: 1px solid #e8ebe9;
  }
  .search-box {
    background: white;
    border: 2px solid #1f9259;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 12px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #1f9259;
    font-weight: 600;
  }
  .search-box .icon { font-size: 16px; }
  .cat-list { font-size: 11px; line-height: 2; color: #747e79; }
  .cat-list .active { color: #1f9259; font-weight: 700; background: #e8ebe9; padding: 2px 8px; border-radius: 4px; }
  
  .products-grid {
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    align-content: start;
  }
  .product-card {
    background: #f4f5f5;
    border: 1px solid #e8ebe9;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
  }
  .product-card .name { font-size: 10px; font-weight: 600; margin-bottom: 4px; }
  .product-card .price { font-size: 12px; font-weight: 700; color: #324e40; }
  .product-card .code { font-size: 9px; color: #acc5b9; }
  
  .cart-panel {
    background: #fafbfb;
    border-left: 1px solid #e8ebe9;
    display: flex;
    flex-direction: column;
  }
  .cart-header {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #324e40;
    border-bottom: 1px solid #e8ebe9;
  }
  .cart-items { flex: 1; padding: 8px 16px; font-size: 11px; overflow: hidden; }
  .cart-item {
    display: flex; justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #e8ebe9;
  }
  .cart-item .qty { color: #1f9259; font-weight: 700; min-width: 24px; }
  .cart-item .item-name { flex: 1; }
  .cart-item .item-price { font-weight: 600; }
  .cart-total {
    padding: 12px 16px;
    border-top: 2px solid #324e40;
    margin-top: auto;
  }
  .cart-total .label { font-size: 11px; color: #747e79; }
  .cart-total .amount { font-size: 22px; font-weight: 700; color: #324e40; }
  
  .pos-footer {
    grid-column: 1 / -1;
    background: #f4f5f5;
    border-top: 1px solid #e8ebe9;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 20px;
  }
  .action-btn {
    background: #1f9259;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 28px;
    font-size: 13px;
    font-weight: 700;
  }
  .action-btn.secondary { background: #e8ebe9; color: #324e40; }
  .action-btn.danger { background: #a25b54; }
  .shortcut-hint {
    font-size: 9px;
    color: #acc5b9;
    margin-left: 4px;
  }
  
  .annotations {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 12px;
  }
  .annotation {
    background: white;
    border: 1px solid #e8ebe9;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .annotation .ann-title { font-size: 11px; font-weight: 700; color: #1f9259; margin-bottom: 4px; }
  .annotation .ann-desc { font-size: 10px; color: #747e79; line-height: 1.5; }
</style>
</head>
<body>
<div class="title">POS Screen - Layout "Cero Friccion"</div>
<div class="pos-layout">
  <div class="pos-header">
    <span>MyeCommerce POS</span>
    <div class="right">Modo: Efectivo | Cliente: Generico | Caja: #01</div>
  </div>
  <div class="pos-main">
    <div class="search-panel">
      <div class="search-box"><span class="icon">&#128269;</span> Escanear o buscar producto...</div>
      <div class="cat-list">
        <div class="active">Todos</div>
        <div>Bebidas</div>
        <div>Snacks</div>
        <div>Lacteos</div>
        <div>Limpieza</div>
        <div>Carnes</div>
        <div>Verduras</div>
        <div>Panaderia</div>
      </div>
    </div>
    <div class="products-grid">
      <div class="product-card"><div class="name">Coca-Cola 500ml</div><div class="price">$1.50</div><div class="code">780123456</div></div>
      <div class="product-card"><div class="name">Pepsi 600ml</div><div class="price">$1.40</div><div class="code">780654321</div></div>
      <div class="product-card"><div class="name">Agua Mineral 1L</div><div class="price">$0.80</div><div class="code">780111111</div></div>
      <div class="product-card"><div class="name">Leche Entera 1L</div><div class="price">$1.20</div><div class="code">780222222</div></div>
      <div class="product-card"><div class="name">Pan Integral</div><div class="price">$2.00</div><div class="code">780333333</div></div>
      <div class="product-card"><div class="name">Arroz 1kg</div><div class="price">$1.80</div><div class="code">780444444</div></div>
      <div class="product-card"><div class="name">Aceite 500ml</div><div class="price">$3.50</div><div class="code">780555555</div></div>
      <div class="product-card"><div class="name">Azucar 1kg</div><div class="price">$1.60</div><div class="code">780666666</div></div>
      <div class="product-card"><div class="name">Cafe 250g</div><div class="price">$4.00</div><div class="code">780777777</div></div>
    </div>
  </div>
  <div class="cart-panel">
    <div class="cart-header">Ticket Actual (3 items)</div>
    <div class="cart-items">
      <div class="cart-item"><span class="qty">x2</span><span class="item-name">Coca-Cola 500ml</span><span class="item-price">$3.00</span></div>
      <div class="cart-item"><span class="qty">x1</span><span class="item-name">Pan Integral</span><span class="item-price">$2.00</span></div>
      <div class="cart-item"><span class="qty">x3</span><span class="item-name">Arroz 1kg</span><span class="item-price">$5.40</span></div>
    </div>
    <div class="cart-total">
      <div class="label">Total</div>
      <div class="amount">$10.40</div>
    </div>
  </div>
  <div class="pos-footer">
    <button class="action-btn secondary">Limpiar <span class="shortcut-hint">[Esc]</span></button>
    <button class="action-btn secondary">Suspender <span class="shortcut-hint">[F2]</span></button>
    <button class="action-btn secondary">Buscar <span class="shortcut-hint">[F3]</span></button>
    <button class="action-btn">Cobrar <span class="shortcut-hint">[Enter]</span></button>
    <button class="action-btn danger">Descuento <span class="shortcut-hint">[F5]</span></button>
  </div>
</div>
<div class="annotations">
  <div class="annotation"><div class="ann-title">Auto-Focus</div><div class="ann-desc">Cursor vuelve al buscador tras cada escaneo. Cero clics extra.</div></div>
  <div class="annotation"><div class="ann-title">Atajos de Teclado</div><div class="ann-desc">Enter = Cobrar, Esc = Limpiar, F2 = Suspender, F5 = Descuento.</div></div>
  <div class="annotation"><div class="ann-title">Modo Privacidad</div><div class="ann-desc">Oculta precios del display lateral cuando hay clientes cerca.</div></div>
  <div class="annotation"><div class="ann-title">Responsive</div><div class="ann-desc">Se reorganiza automaticamente en tablet y terminal de mano.</div></div>
</div>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════
# Render all diagrams
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating architecture diagrams...")
    render_diagram(diagram1_html, "system-architecture", 1200, 850)
    render_diagram(diagram2_html, "clean-architecture-folders", 1200, 900)
    render_diagram(diagram3_html, "ota-update-flow", 1200, 500)
    render_diagram(diagram4_html, "ux-pos-layout", 1200, 750)
    print("All diagrams generated.")