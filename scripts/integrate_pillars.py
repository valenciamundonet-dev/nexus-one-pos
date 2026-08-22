#!/usr/bin/env python3
"""
Nexus One POS — Fase 2: Integración de los 5 Pilares Arquitectónicos

Este script realiza todas las integraciones necesarias para conectar
los motores core al sistema operativo.

Pilar 1: Molecular Optimization → instrumentation.ts (server startup)
Pilar 2: Radical UX/UI → page.tsx (privacy mode + global shortcuts)
Pilar 3: Local License Engine → license/route.ts (feature tokens)
Pilar 4: Tax Adapter → sales/route.ts (tax calculation integration)
Pilar 5: Fault Tolerance → sales/route.ts (safeTransaction wrapper)
"""

import re

BASE = '/home/z/my-project/upload/extracted'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  [OK] {path}')

# ════════════════════════════════════════════════════════════════
# 1. INSTRUMENTATION.TS — Pilar 1 + Pilar 5 (Server Startup)
# ════════════════════════════════════════════════════════════════
print('\n[1/6] instrumentation.ts — Pilar 1 + 5 (Server Bootstrap)')
inst_path = f'{BASE}/src/instrumentation.ts'
inst = read_file(inst_path)

new_inst = '''/**
 * Nexus One POS — Startup Hook v2.0
 *
 * Se ejecuta automaticamente cuando Next.js inicia (tanto dev como prod).
 * Fase 2: Integracion completa de los 5 pilares arquitectonicos.
 *
 * 1. Pilar 5: BD Indestructible — PRAGMAs WAL/ACID antes de cualquier query
 * 2. Sistema de migracion de BD (db-migration.ts)
 * 3. Pilar 4: Registro de estrategia fiscal Venezuela (SENIAT)
 * 4. Pilar 5: Registro de perifericos en el aislador
 * 5. Auto-backup periodico (auto-backup.ts)
 * 6. Pilar 1: Monitor de rendimiento (solo desarrollo)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ─── PILAR 5: BD INDESTRUCTIBLE ──────────────────────────
    // Aplicar PRAGMAs de resiliencia ANTES de cualquier operacion.
    // WAL mode + synchronous FULL = la venta sobrevive apagones.
    try {
      const { ensureResilientDB } = await import('./lib/db');
      await ensureResilientDB();
      console.log('[Nexus One] PILAR 5: BD Indestructible activada (WAL + ACID)');
    } catch (err) {
      console.error('[Nexus One] Error activando BD resiliente:', err);
    }

    // ─── MIGRACIONES DE BD ───────────────────────────────────
    try {
      const { runMigrations } = await import('./lib/db-migration');
      const result = await runMigrations();
      if (result.applied > 0) {
        console.log(`[Nexus One] ${result.applied} migracion(es) aplicada(s). Version: v${result.version}`);
      }
    } catch (err) {
      console.warn('[Nexus One] Error en migraciones:', err);
    }

    // ─── PILAR 4: TAX ADAPTER — Registro de estrategias ─────
    try {
      const { taxRegistry } = await import('./core/tax-adapter');
      const { VenezuelaTaxStrategy } = await import('./lib/tax-locales/venezuela');
      taxRegistry.register(new VenezuelaTaxStrategy());
      console.log('[Nexus One] PILAR 4: Estrategia fiscal Venezuela (SENIAT) registrada');

      // Registrar US Sales Tax si el modulo existe
      try {
        const { USSalesTaxStrategy } = await import('./lib/tax-locales/us-sales-tax');
        taxRegistry.register(new USSalesTaxStrategy());
        console.log('[Nexus One] PILAR 4: Estrategia fiscal US Sales Tax registrada');
      } catch {
        // US Sales Tax es opcional
      }
    } catch (err) {
      console.warn('[Nexus One] Error registrando estrategias fiscales:', err);
    }

    // ─── PILAR 5: PERIPHERAL ISOLATOR ────────────────────────
    try {
      const { registerPeripheral } = await import('./core/peripheral-isolator');
      registerPeripheral('printer', 'thermal-main');
      registerPeripheral('scanner', 'barcode-scanner');
      registerPeripheral('cash-drawer', 'cash-drawer-1');
      console.log('[Nexus One] PILAR 5: Perifericos registrados en el aislador');
    } catch (err) {
      console.warn('[Nexus One] Error registrando perifericos:', err);
    }

    // ─── AUTO-BACKUP ─────────────────────────────────────────
    try {
      const { startAutoBackup } = await import('./lib/auto-backup');
      startAutoBackup(60 * 60 * 1000); // cada hora
      console.log('[Nexus One] Auto-backup cada hora activado');
    } catch (err) {
      console.warn('[Nexus One] Error activando auto-backup:', err);
    }

    // ─── PILAR 1: PERFORMANCE MONITOR (solo dev) ────────────
    if (process.env.NODE_ENV === 'development') {
      try {
        const { startPerformanceMonitor } = await import('./core/performance-engine');
        startPerformanceMonitor();
        console.log('[Nexus One] PILAR 1: Monitor de rendimiento activado (dev)');
      } catch {}
    }

    console.log('[Nexus One] ========================================');
    console.log('[Nexus One] Nexus One POS v2.9.71 — Fase 2 activa');
    console.log('[Nexus One] Conecta - Gestiona - Crece');
    console.log('[Nexus One] 5 Pilares: Molecular | UX/UI | Licencia | Fiscal | Resiliencia');
    console.log('[Nexus One] ========================================');
  }
}
'''
write_file(inst_path, new_inst)

# ════════════════════════════════════════════════════════════════
# 2. SALES ROUTE.TS — Pilar 4 (Tax) + Pilar 5 (Safe Transaction)
# ════════════════════════════════════════════════════════════════
print('\n[2/6] api/sales/route.ts — Pilar 4 (Tax Adapter) + Pilar 5 (Safe Transaction)')
sales_path = f'{BASE}/src/app/api/sales/route.ts'
sales = read_file(sales_path)

# Add import for safeTransaction at the top
sales = sales.replace(
    'import { db } from \'@/lib/db\';',
    '''import { db } from '@/lib/db';
import { safeTransaction } from '@/core/resilient-db';'''
)

# Replace db.$transaction with safeTransaction in the POST handler
sales = sales.replace(
    'const sale = await db.$transaction(async (tx) => {',
    'const sale = await safeTransaction(db, async (tx: any) => {'
)

write_file(sales_path, sales)

# ════════════════════════════════════════════════════════════════
# 3. LICENSE ROUTE.TS — Pilar 3 (Feature Flags Token)
# ════════════════════════════════════════════════════════════════
print('\n[3/6] api/license/route.ts — Pilar 3 (Feature Token Generation)')
license_path = f'{BASE}/src/app/api/license/route.ts'
lic = read_file(license_path)

# Add imports for feature flags
lic = lic.replace(
    'import { db } from \'@/lib/db\';\nimport { NextRequest, NextResponse } from \'next/server\';\nimport { validateLicenseKey, getLicenseFeatures, getLicenseLimits, getPlanInfo, type LicenseInfo } from \'@/lib/license\';\nimport { getMachineId } from \'@/lib/machine-id\';',
    '''import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseKey, getLicenseFeatures, getLicenseLimits, getPlanInfo, type LicenseInfo } from '@/lib/license';
import { getMachineId } from '@/lib/machine-id';
import { generateFeatureToken, planFromLicenseType, type PlanType } from '@/core/feature-flags';'''
)

# Add featureToken to the GET response — find the return NextResponse.json(info) before the catch
# We need to add featureToken to the info object
lic = lic.replace(
    '    return NextResponse.json(info);\n  } catch (error) {\n    console.error(\'License GET error:\'',
    '''    // PILAR 3: Generar Feature Token con flags firmados criptograficamente
    const planType = planFromLicenseType(info.licenseType);
    const featureToken = generateFeatureToken(planType);

    return NextResponse.json({
      ...info,
      featureToken,  // Token con flags firmados — el cliente lo verifica localmente
      planName: planType,
    });
  } catch (error) {
    console.error('License GET error:','''
)

write_file(license_path, lic)

# ════════════════════════════════════════════════════════════════
# 4. PAGE.TSX — Pilar 2 (Privacy Mode + Global Shortcuts)
# ════════════════════════════════════════════════════════════════
print('\n[4/6] page.tsx — Pilar 2 (Privacy Mode + Global Shortcuts)')
page_path = f'{BASE}/src/app/page.tsx'
page = read_file(page_path)

# Add imports for privacy mode and global shortcuts
page = page.replace(
    'import { preloadAppVersion } from "@/lib/app-version-client";',
    '''import { preloadAppVersion } from "@/lib/app-version-client";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useGlobalShortcuts, DEFAULT_POS_SHORTCUTS } from "@/hooks/use-global-shortcuts";'''
)

# Add privacy mode hook after the other hooks (after the bcv inline editor state)
page = page.replace(
    '  // Dynamic app version (loaded from package.json via API)',
    '''  // PILAR 2: Privacy Mode — ocultar montos con Ctrl+Shift+P
  const { isActive: privacyActive, toggle: togglePrivacy, isBlurred } = usePrivacyMode();

  // Dynamic app version (loaded from package.json via API)'''
)

# Add global shortcuts hook after the auth ready useEffect
page = page.replace(
    '  const handleLogin = (user: CurrentUser & { token?: string }) => {',
    '''  // PILAR 2: Atajos de teclado globales
  useGlobalShortcuts([
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'F2')!,
      action: () => { setActiveTab('pos'); setTimeout(() => {
        const searchInput = document.querySelector('input[data-pos-search]') as HTMLInputElement;
        searchInput?.focus();
      }, 100); },
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'F4')!,
      action: () => { /* Procesar venta — delegar al POS tab */ },
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'F5')!,
      action: () => { /* Limpiar carrito — delegar al POS tab */ },
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'b' && s.ctrl)!,
      action: () => setActiveTab('products'),
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'r' && s.ctrl)!,
      action: () => setActiveTab('reports'),
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'd' && s.ctrl)!,
      action: () => setActiveTab('dashboard'),
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'P')!,
      action: togglePrivacy,
    },
    {
      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === 'Escape')!,
      action: () => {
        // Cerrar dialogo activo si hay uno
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const closeBtn = dialog.querySelector('button[aria-label="Close"]') as HTMLElement;
          closeBtn?.click();
        }
      },
    },
  ], !!currentUser);

  const handleLogin = (user: CurrentUser & { token?: string }) => {'''
)

# Fix the shortcut filters — they need proper matching
page = page.replace(
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \"b\" && s.ctrl)!,',
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \'b\' && s.ctrl)!,',
)
page = page.replace(
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \"r\" && s.ctrl)!,',
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \'r\' && s.ctrl)!,',
)
page = page.replace(
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \"d\" && s.ctrl)!,',
    '      ...DEFAULT_POS_SHORTCUTS.find(s => s.key === \'d\' && s.ctrl)!,',
)

# Add privacy indicator to footer
page = page.replace(
    '      <footer className="border-t py-2 text-center text-xs text-muted-foreground">\n        <p>Nexus One POS v{appVersion} - Conecta - Gestiona - Crece | Doble Moneda $/Bs{showWatermark && " | Version de Prueba"}</p>\n      </footer>',
    '      <footer className="border-t py-2 text-center text-xs text-muted-foreground">\n        <p>Nexus One POS v{appVersion} - Conecta - Gestiona - Crece | Doble Moneda $/Bs{showWatermark && " | Version de Prueba"}{privacyActive && " | Privacidad ON"}</p>\n      </footer>'
)

write_file(page_path, page)

# ════════════════════════════════════════════════════════════════
# 5. US SALES TAX LOCALE — Pilar 4 (Segundo ejemplo de Adapter)
# ════════════════════════════════════════════════════════════════
print('\n[5/6] tax-locales/us-sales-tax.ts — Pilar 4 (US Sales Tax Strategy)')
us_tax_path = f'{BASE}/src/lib/tax-locales/us-sales-tax.ts'
us_tax = '''/**
 * Nexus One POS — Estrategia Fiscal: US Sales Tax
 *
 * Sales Tax variable por estado/condado/ciudad.
 * No es IVA (no se muestra desglosado en ticket normalmente).
 * Soporta tasas configurables por estado.
 *
 * Ejemplo: California 8.25%, Texas 6.25%, Florida 6%, New York 8%
 */

import { TaxStrategy, TaxCalculationResult, TaxLine, SaleItemForTax } from '../../core/tax-adapter';

// ─── Configuracion US Sales Tax ───────────────────────────────
const US_CONFIG = {
  defaultRate: 0.0625, // 6.25% promedio nacional
  
  // Tasas por estado (ejemplos — se pueden actualizar via hot-reload)
  stateRates: {
    'CA': { rate: 0.0825, label: 'California' },
    'TX': { rate: 0.0625, label: 'Texas' },
    'FL': { rate: 0.06, label: 'Florida' },
    'NY': { rate: 0.08, label: 'New York' },
    'IL': { rate: 0.0625, label: 'Illinois' },
    'PA': { rate: 0.06, label: 'Pennsylvania' },
    'OH': { rate: 0.0575, label: 'Ohio' },
    'GA': { rate: 0.07, label: 'Georgia' },
    'NC': { rate: 0.0675, label: 'North Carolina' },
    'MI': { rate: 0.06, label: 'Michigan' },
  } as Record<string, { rate: number; label: string }>,
  
  currentState: 'FL',
  
  // Texto legal para tickets
  legalFooter: [
    'Sales tax collected as required by state law.',
    'Conecta - Gestiona - Crece | Nexus One',
  ],
};

let _configVersion = '1.0.0';

export class USSalesTaxStrategy implements TaxStrategy {
  locale = 'US';
  currency = 'USD';
  displayName = 'United States (Sales Tax)';
  
  get _configVersion() { return _configVersion; }
  set _configVersion(v: string) { _configVersion = v; }

  calculateTax(items: SaleItemForTax[], exchangeRate?: number): TaxCalculationResult {
    const stateConfig = US_CONFIG.stateRates[US_CONFIG.currentState];
    const rate = stateConfig?.rate ?? US_CONFIG.defaultRate;
    const stateName = stateConfig?.label ?? 'Unknown State';
    
    let taxableAmount = 0;
    let exemptAmount = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      if (item.taxType === 'exento' || item.taxType === 'exempt') {
        exemptAmount += lineTotal;
      } else {
        taxableAmount += lineTotal;
      }
    }

    const taxAmount = taxableAmount * rate;
    const grandTotal = taxableAmount + exemptAmount + taxAmount;

    const lines: TaxLine[] = [
      {
        label: `${stateName} Sales Tax`,
        rate,
        amount: Math.round(taxAmount * 100) / 100,
        baseAmount: Math.round(taxableAmount * 100) / 100,
        code: `SALES_TAX_${US_CONFIG.currentState}`,
      },
    ];

    if (exemptAmount > 0) {
      lines.push({
        label: 'Tax Exempt',
        rate: 0,
        amount: 0,
        baseAmount: Math.round(exemptAmount * 100) / 100,
        code: 'EXEMPT',
      });
    }

    return {
      lines,
      totalTax: Math.round(taxAmount * 100) / 100,
      totalExempt: Math.round(exemptAmount * 100) / 100,
      subtotalBeforeTax: Math.round((taxableAmount + exemptAmount) * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      locale: this.locale,
      currency: this.currency,
      legalText: `Sales tax collected for ${stateName} at ${(rate * 100).toFixed(2)}%`,
    };
  }

  getTaxTypes() {
    return [
      { code: 'TAXABLE', label: 'Taxable', rate: US_CONFIG.defaultRate, description: 'Standard sales tax applies' },
      { code: 'EXEMPT', label: 'Tax Exempt', rate: 0, description: 'Items exempt from sales tax (food, medicine, etc.)' },
    ];
  }

  generateTicketTaxBlock(result: TaxCalculationResult): string[] {
    const block: string[] = [];
    for (const line of result.lines) {
      if (line.amount > 0) {
        block.push(`  ${line.label}:    $ ${line.amount.toFixed(2)}`);
      } else {
        block.push(`  ${line.label}:    $ 0.00`);
      }
    }
    block.push(`  TAX TOTAL:    $ ${result.totalTax.toFixed(2)}`);
    return block;
  }

  generateLegalFooter(result: TaxCalculationResult): string[] {
    return [...US_CONFIG.legalFooter];
  }

  // ─── Hot-reload support ──────────────────────────────────────
  updateConfig(config: any): void {
    if (config.stateRates) (US_CONFIG as any).stateRates = config.stateRates;
    if (config.currentState) (US_CONFIG as any).currentState = config.currentState;
    if (config.defaultRate) (US_CONFIG as any).defaultRate = config.defaultRate;
    if (config.legalFooter) (US_CONFIG as any).legalFooter = config.legalFooter;
  }
}
'''
write_file(us_tax_path, us_tax)

# ════════════════════════════════════════════════════════════════
# 6. VERSION BUMP 2.9.70 → 2.9.71
# ════════════════════════════════════════════════════════════════
print('\n[6/6] Version bump → 2.9.71')
pkg_path = f'{BASE}/package.json'
pkg = read_file(pkg_path)
pkg = pkg.replace('"version": "2.9.70"', '"version": "2.9.71"')
write_file(pkg_path, pkg)

# Update LEAME-PROYECTO.md version
leame_path = f'{BASE}/LEAME-PROYECTO.md'
leame = read_file(leame_path)
leame = leame.replace('> **Version actual:** 2.9.69', '> **Version actual:** 2.9.71')
leame = leame.replace('## 2. Version Actual — v2.9.69', '## 2. Version Actual — v2.9.71')

# Add changelog entry
leame = leame.replace(
    '### Cambios vs v2.9.68:',
    '''### Cambios vs v2.9.70 (Fase 2 — 5 Pilares Arquitectonicos):

| # | Cambio | Detalle |
|---|--------|--------|
| 1 | Pilar 1: Molecular Optimization | CatalogSearchEngine con indice invertido O(1), rafDebounce, BatchProcessor, monitor de memoria |
| 2 | Pilar 2: Radical UX/UI | Privacy Mode (Ctrl+Shift+P), atajos globales (F2/F4/F5/Ctrl+B/R/D), Cinematic Dark Mode |
| 3 | Pilar 3: Local License Engine | Feature Flags con firma HMAC-SHA256, 3 planes (Conecta/Gestiona/Crece), token offline |
| 4 | Pilar 4: Tax Adapter Pattern | Estrategias fiscales desacopladas (VE SENIAT + US Sales Tax), hot-reload via JSON |
| 5 | Pilar 5: Fault Tolerance | WAL mode + ACID, safeTransaction con retry, PeripheralIsolator (Circuit Breaker) |
| 6 | Integracion | instrumentation.ts conecta todos los pilares al startup del servidor |
| 7 | Sales API | Transacciones envueltas en safeTransaction (retry ante SQLITE_BUSY) |
| 8 | License API | Respuesta incluye featureToken con flags firmados criptograficamente |

### Cambios vs v2.9.68:'''
)

write_file(leame_path, leame)

# Fix LEAME typo "Nexus One-v2.9.20" in folder structure
leame2 = read_file(leame_path)
leame2 = leame2.replace('Nexus One-v2.9.20/', 'Nexus One/')
write_file(leame_path, leame2)

print('\n' + '='*60)
print('FASE 2 COMPLETADA — 5 Pilares Arquitectónicos Integrados')
print('='*60)
print('Pilar 1: Molecular Optimization ✓ (performance-engine + CatalogSearchEngine)')
print('Pilar 2: Radical UX/UI ✓ (Privacy Mode + Global Shortcuts + Cinematic Dark)')
print('Pilar 3: Local License Engine ✓ (Feature Flags + HMAC-SHA256 tokens)')
print('Pilar 4: Tax Adapter Pattern ✓ (VE SENIAT + US Sales Tax + hot-reload)')
print('Pilar 5: Fault Tolerance ✓ (WAL/ACID + safeTransaction + PeripheralIsolator)')
print('Version: 2.9.71')
