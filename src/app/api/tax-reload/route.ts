/**
 * Nexus One POS — Tax Hot-Reload API v1.0
 * 
 * Permite recargar estrategias fiscales en caliente sin reiniciar.
 * Soporta:
 *   - GET: Listar estrategias disponibles y la activa
 *   - POST: Cambiar estrategia activa o recargar desde JSON
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Directorio donde se buscan las estrategias fiscales
const TAX_LOCALES_DIR = path.join(process.cwd(), 'src', 'lib', 'tax-locales');

// Archivo de configuracion fiscal que puede ser modificado en caliente
const TAX_CONFIG_PATH = path.join(process.cwd(), 'db', 'tax-config.json');

// Estado en memoria de la estrategia activa (survive HMR en dev)
const globalForTax = globalThis as unknown as {
  activeTaxStrategy: string;
  taxConfigCache: any;
  lastReloadAt: number;
};

if (!globalForTax.activeTaxStrategy) {
  globalForTax.activeTaxStrategy = 'venezuela';
  globalForTax.taxConfigCache = null;
  globalForTax.lastReloadAt = 0;
}

// Mapeo de estrategias conocidas
const KNOWN_STRATEGIES = [
  {
    key: 'venezuela',
    label: 'Venezuela (SENIAT)',
    description: 'IVA 16% general, 8% reducido, exento. Alicuota incluida o excluida.',
    currency: 'VES',
  },
  {
    key: 'us-sales-tax',
    label: 'Estados Unidos (Sales Tax)',
    description: 'Impuesto estatal/local por porcentaje. Sin IVA incluido.',
    currency: 'USD',
  },
  {
    key: 'none',
    label: 'Sin Impuestos',
    description: 'Desactiva todos los calculos fiscales. Solo subtotales.',
    currency: 'ANY',
  },
];

export async function GET() {
  try {
    // 1. Estrategias disponibles en el filesystem
    const availableStrategies: Array<typeof KNOWN_STRATEGIES[0] & { hasFile: boolean }> = [];

    for (const strat of KNOWN_STRATEGIES) {
      let hasFile = false;
      if (strat.key !== 'none') {
        const filePath = path.join(TAX_LOCALES_DIR, `${strat.key}.ts`);
        hasFile = fs.existsSync(filePath);
      } else {
        hasFile = true; // 'none' siempre disponible
      }
      availableStrategies.push({ ...strat, hasFile });
    }

    // 2. Configuracion fiscal actual desde JSON si existe
    let taxConfig: any = globalForTax.taxConfigCache;
    if (!taxConfig && fs.existsSync(TAX_CONFIG_PATH)) {
      try {
        const raw = fs.readFileSync(TAX_CONFIG_PATH, 'utf-8');
        taxConfig = JSON.parse(raw);
        globalForTax.taxConfigCache = taxConfig;
      } catch {
        taxConfig = null;
      }
    }

    // 3. Estrategia activa con detalles
    const active = KNOWN_STRATEGIES.find(s => s.key === globalForTax.activeTaxStrategy) || KNOWN_STRATEGIES[0];

    return NextResponse.json({
      activeStrategy: {
        key: active.key,
        label: active.label,
        description: active.description,
        currency: active.currency,
      },
      availableStrategies,
      taxConfig,
      lastReloadAt: globalForTax.lastReloadAt,
      canHotReload: fs.existsSync(TAX_CONFIG_PATH),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    // Cambiar estrategia activa
    if (action === 'switch-strategy') {
      const key = body.strategy;
      const valid = KNOWN_STRATEGIES.find(s => s.key === key);
      if (!valid) {
        return NextResponse.json(
          { error: `Estrategia "${key}" no valida. Opciones: ${KNOWN_STRATEGIES.map(s => s.key).join(', ')}` },
          { status: 400 }
        );
      }
      globalForTax.activeTaxStrategy = key;
      globalForTax.lastReloadAt = Date.now();
      return NextResponse.json({
        success: true,
        message: `Estrategia cambiada a: ${valid.label}`,
        activeStrategy: { key: valid.key, label: valid.label },
        lastReloadAt: globalForTax.lastReloadAt,
      });
    }

    // Guardar configuracion fiscal personalizada
    if (action === 'save-config') {
      const config = body.config;
      if (!config || typeof config !== 'object') {
        return NextResponse.json({ error: 'Config no valida' }, { status: 400 });
      }

      // Asegurar que el directorio db existe
      const dbDir = path.dirname(TAX_CONFIG_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      fs.writeFileSync(TAX_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      globalForTax.taxConfigCache = config;
      globalForTax.lastReloadAt = Date.now();

      return NextResponse.json({
        success: true,
        message: 'Configuracion fiscal guardada. Se recargara en la proxima venta.',
        lastReloadAt: globalForTax.lastReloadAt,
      });
    }

    // Recargar configuracion desde disco
    if (action === 'reload') {
      if (fs.existsSync(TAX_CONFIG_PATH)) {
        const raw = fs.readFileSync(TAX_CONFIG_PATH, 'utf-8');
        globalForTax.taxConfigCache = JSON.parse(raw);
        globalForTax.lastReloadAt = Date.now();
        return NextResponse.json({
          success: true,
          message: 'Configuracion recargada desde disco',
          taxConfig: globalForTax.taxConfigCache,
          lastReloadAt: globalForTax.lastReloadAt,
        });
      }
      return NextResponse.json({ success: false, error: 'No hay archivo de configuracion fiscal' });
    }

    // Reset a configuracion por defecto
    if (action === 'reset') {
      if (fs.existsSync(TAX_CONFIG_PATH)) {
        fs.unlinkSync(TAX_CONFIG_PATH);
      }
      globalForTax.activeTaxStrategy = 'venezuela';
      globalForTax.taxConfigCache = null;
      globalForTax.lastReloadAt = Date.now();
      return NextResponse.json({
        success: true,
        message: 'Configuracion fiscal reiniciada a valores por defecto',
        lastReloadAt: globalForTax.lastReloadAt,
      });
    }

    return NextResponse.json({ error: 'Accion no reconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
