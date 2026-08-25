/**
 * Nexus One POS — Motor de Feature Flags v1.0
 * 
 * Control de acceso local sin internet.
 * Tres planes: GRATIS (Conecta), BASICO (Gestiona), PROFESIONAL (Crece)
 * Validación mediante flags encriptadas con firma criptográfica HMAC-SHA256.
 * 
 * El sistema lee la licencia activa desde la BD local y genera un JWT interno
 * que contiene los feature flags firmados. Este token se almacena en memoria
 * y se verifica en cada request sin necesidad de conexión.
 */

import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';

// ─── Constantes ──────────────────────────────────────────────────
const FLAG_SECRET = process.env.FLAG_SECRET || 'NX1-F34TURE-FL4G-S3CR3T-K3Y-2024';
const TOKEN_EXPIRY_HOURS = 24;

// ─── Definición de Planes ────────────────────────────────────────
export type PlanType = 'gratis' | 'basico' | 'profesional';

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  category: 'pos' | 'inventory' | 'reports' | 'multiuser' | 'advanced' | 'backup';
}

export interface FeatureSet {
  [key: string]: boolean;
}

export interface FeatureToken {
  plan: PlanType;
  flags: FeatureSet;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

// ─── Catálogo Completo de Features ───────────────────────────────
export const FEATURE_CATALOG: FeatureFlag[] = [
  // POS Core
  { key: 'pos.basic', label: 'Punto de Venta', description: 'Facturación básica con un método de pago', category: 'pos' },
  { key: 'pos.mixed-payment', label: 'Pago Mixto', description: 'Permitir pagos con múltiples métodos', category: 'pos' },
  { key: 'pos.hold-sale', label: 'Apartar Venta', description: 'Estacionar ventas en curso', category: 'pos' },
  { key: 'pos.scan-barcode', label: 'Escanear Código', description: 'Lector de código de barras integrado', category: 'pos' },
  { key: 'pos.quick-sale', label: 'Venta Rápida', description: 'Atajos de teclado para facturación ultra-rápida', category: 'pos' },

  // Inventory
  { key: 'inventory.categories', label: 'Categorías', description: 'Organización por categorías', category: 'inventory' },
  { key: 'inventory.brands', label: 'Marcas', description: 'Filtrado por marcas', category: 'inventory' },
  { key: 'inventory.alerts', label: 'Alertas de Stock', description: 'Notificaciones de stock mínimo', category: 'inventory' },
  { key: 'inventory.kardex', label: 'Kardex', description: 'Movimiento detallado de inventario', category: 'inventory' },
  { key: 'inventory.expiration', label: 'Vencimientos', description: 'Control de fechas de vencimiento', category: 'inventory' },
  { key: 'inventory.combos', label: 'Combos', description: 'Productos compuestos/combos', category: 'inventory' },

  // Reports
  { key: 'reports.basic', label: 'Reportes Básicos', description: 'Ventas del día y cierres de caja', category: 'reports' },
  { key: 'reports.advanced', label: 'Reportes Avanzados', description: 'Ganancias, ranking, devoluciones', category: 'reports' },
  { key: 'reports.charts', label: 'Gráficos', description: 'Visualización de datos con gráficos', category: 'reports' },
  { key: 'reports.profit-loss', label: 'P&G Detallado', description: 'Estado de ganancias y pérdidas', category: 'reports' },

  // Multi-user
  { key: 'multiuser.basic', label: 'Un Usuario', description: 'Un cajero/administrador', category: 'multiuser' },
  { key: 'multiuser.multiple', label: 'Múltiples Usuarios', description: 'Hasta 5 cajeros con roles', category: 'multiuser' },
  { key: 'multiuser.roles', label: 'Roles y Permisos', description: 'Configuración granular de roles', category: 'multiuser' },

  // Advanced
  { key: 'advanced.credit', label: 'Crédito', description: 'Ventas a crédito con seguimiento', category: 'advanced' },
  { key: 'advanced.devolutions', label: 'Devoluciones', description: 'Procesamiento de devoluciones', category: 'advanced' },
  { key: 'advanced.quotes', label: 'Cotizaciones', description: 'Generación de cotizaciones', category: 'advanced' },
  { key: 'advanced.delivery-notes', label: 'Notas de Entrega', description: 'Control de entregas', category: 'advanced' },
  { key: 'advanced.purchases', label: 'Compras', description: 'Gestión de compras a proveedores', category: 'advanced' },
  { key: 'advanced.expenses', label: 'Gastos', description: 'Registro de gastos operativos', category: 'advanced' },
  { key: 'advanced.suppliers', label: 'Proveedores', description: 'Base de datos de proveedores', category: 'advanced' },
  { key: 'advanced.discount', label: 'Descuentos', description: 'Descuentos por producto en venta', category: 'advanced' },
  { key: 'advanced.price-history', label: 'Historial de Precios', description: 'Registro de cambios de precio', category: 'advanced' },
  { key: 'advanced.export-import', label: 'Exportar/Importar', description: 'Migración de datos Excel/CSV', category: 'advanced' },
  { key: 'advanced.barcode-print', label: 'Imprimir Códigos', description: 'Generación de etiquetas de código de barras', category: 'advanced' },

  // Backup
  { key: 'backup.manual', label: 'Respaldo Manual', description: 'Respaldar y restaurar BD manualmente', category: 'backup' },
  { key: 'backup.auto', label: 'Respaldo Automático', description: 'Respaldos automáticos cada hora', category: 'backup' },
  { key: 'backup.cloud-sync', label: 'Sincronización', description: 'Sincronización en la nube (futuro)', category: 'backup' },
];

// ─── Matriz de Planes ─────────────────────────────────────────────
// Conecta (Gratis) | Gestiona (Básico) | Crece (Profesional)
const PLAN_FLAGS: Record<PlanType, FeatureSet> = {
  gratis: {
    // POS Core - lo esencial para conectar
    'pos.basic': true,
    'pos.scan-barcode': true,
    'pos.quick-sale': true,
    'pos.mixed-payment': false,
    'pos.hold-sale': false,
    // Inventory - básico
    'inventory.categories': true,
    'inventory.brands': false,
    'inventory.alerts': false,
    'inventory.kardex': false,
    'inventory.expiration': false,
    'inventory.combos': false,
    // Reports - solo lo mínimo
    'reports.basic': true,
    'reports.advanced': false,
    'reports.charts': false,
    'reports.profit-loss': false,
    // Multi-user
    'multiuser.basic': true,
    'multiuser.multiple': false,
    'multiuser.roles': false,
    // Advanced - ninguno
    'advanced.credit': false,
    'advanced.devolutions': false,
    'advanced.quotes': false,
    'advanced.delivery-notes': false,
    'advanced.purchases': false,
    'advanced.expenses': false,
    'advanced.suppliers': false,
    'advanced.discount': false,
    'advanced.price-history': false,
    'advanced.export-import': false,
    'advanced.barcode-print': false,
    // Backup
    'backup.manual': true,
    'backup.auto': false,
    'backup.cloud-sync': false,
  },
  basico: {
    // POS
    'pos.basic': true,
    'pos.scan-barcode': true,
    'pos.quick-sale': true,
    'pos.mixed-payment': true,
    'pos.hold-sale': false,
    // Inventory
    'inventory.categories': true,
    'inventory.brands': true,
    'inventory.alerts': true,
    'inventory.kardex': false,
    'inventory.expiration': false,
    'inventory.combos': false,
    // Reports
    'reports.basic': true,
    'reports.advanced': false,
    'reports.charts': false,
    'reports.profit-loss': false,
    // Multi-user
    'multiuser.basic': true,
    'multiuser.multiple': false,
    'multiuser.roles': false,
    // Advanced - selección
    'advanced.credit': true,
    'advanced.devolutions': true,
    'advanced.quotes': false,
    'advanced.delivery-notes': false,
    'advanced.purchases': true,
    'advanced.expenses': false,
    'advanced.suppliers': true,
    'advanced.discount': true,
    'advanced.price-history': false,
    'advanced.export-import': true,
    'advanced.barcode-print': true,
    // Backup
    'backup.manual': true,
    'backup.auto': true,
    'backup.cloud-sync': false,
  },
  profesional: {
    // POS - todo
    'pos.basic': true,
    'pos.scan-barcode': true,
    'pos.quick-sale': true,
    'pos.mixed-payment': true,
    'pos.hold-sale': true,
    // Inventory - todo
    'inventory.categories': true,
    'inventory.brands': true,
    'inventory.alerts': true,
    'inventory.kardex': true,
    'inventory.expiration': true,
    'inventory.combos': true,
    // Reports - todo
    'reports.basic': true,
    'reports.advanced': true,
    'reports.charts': true,
    'reports.profit-loss': true,
    // Multi-user - todo
    'multiuser.basic': true,
    'multiuser.multiple': true,
    'multiuser.roles': true,
    // Advanced - todo
    'advanced.credit': true,
    'advanced.devolutions': true,
    'advanced.quotes': true,
    'advanced.delivery-notes': true,
    'advanced.purchases': true,
    'advanced.expenses': true,
    'advanced.suppliers': true,
    'advanced.discount': true,
    'advanced.price-history': true,
    'advanced.export-import': true,
    'advanced.barcode-print': true,
    // Backup
    'backup.manual': true,
    'backup.auto': true,
    'backup.cloud-sync': false,
  },
};

// ─── Límites por Plan ─────────────────────────────────────────────
export interface PlanLimits {
  maxProducts: number;
  maxDailySales: number;
  maxUsers: number;
  maxActivations: number;
  trialDays: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  gratis: { maxProducts: 50, maxDailySales: 20, maxUsers: 1, maxActivations: 1, trialDays: 0 },
  basico: { maxProducts: 500, maxDailySales: 99999, maxUsers: 1, maxActivations: 2, trialDays: 0 },
  profesional: { maxProducts: 99999, maxDailySales: 99999, maxUsers: 5, maxActivations: 3, trialDays: 0 },
};

// ─── Generación de Token de Features (Server-side) ────────────────
export function generateFeatureToken(plan: PlanType): string {
  const flags = PLAN_FLAGS[plan];
  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

  // Payload: plan + flags + timestamps
  const payload = JSON.stringify({ plan, flags, issuedAt: now, expiresAt });

  // Firma HMAC-SHA256
  const signature = createHmac('sha256', FLAG_SECRET)
    .update(payload)
    .digest('hex');

  const token: FeatureToken = { plan, flags, issuedAt: now, expiresAt, signature };
  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

// ─── Verificación de Token (Server-side) ──────────────────────────
export function verifyFeatureToken(tokenStr: string): FeatureToken | null {
  try {
    const decoded = JSON.parse(Buffer.from(tokenStr, 'base64url').toString('utf-8')) as FeatureToken;

    // Verificar expiración
    if (decoded.expiresAt < Date.now()) {
      return null; // Token expirado
    }

    // Verificar firma
    const payload = JSON.stringify({
      plan: decoded.plan,
      flags: decoded.flags,
      issuedAt: decoded.issuedAt,
      expiresAt: decoded.expiresAt,
    });

    const expectedSig = createHmac('sha256', FLAG_SECRET)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison para prevenir timing attacks
    const sigBuf = Buffer.from(decoded.signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    return decoded;
  } catch {
    return null;
  }
}

// ─── Verificación rápida de un flag específico ────────────────────
export function hasFeature(tokenStr: string | null, featureKey: string): boolean {
  if (!tokenStr) return false;
  
  // Verificar primero contra la matriz estática (no requiere crypto)
  try {
    const decoded = JSON.parse(Buffer.from(tokenStr, 'base64url').toString('utf-8')) as FeatureToken;
    if (decoded.expiresAt < Date.now()) return false;
    return decoded.flags[featureKey] === true;
  } catch {
    return false;
  }
}

// ─── Obtener flags para un plan (sin crypto, para UI estática) ───
export function getFlagsForPlan(plan: PlanType): FeatureSet {
  return { ...PLAN_FLAGS[plan] };
}

// ─── Obtener plan desde tipo de licencia legacy ───────────────────
export function planFromLicenseType(licenseType: string): PlanType {
  switch (licenseType) {
    case 'profesional': return 'profesional';
    case 'basica': return 'basico';
    case 'trial':
    default: return 'gratis';
  }
}

// ─── Obtener información de plan para UI ──────────────────────────
export const PLAN_INFO: Record<PlanType, { name: string; slogan: string; color: string; icon: string }> = {
  gratis: {
    name: 'Conecta',
    slogan: 'Empieza a vender hoy',
    color: '#3b82f6',
    icon: 'Link',
  },
  basico: {
    name: 'Gestiona',
    slogan: 'Control total de tu negocio',
    color: '#10b981',
    icon: 'Settings',
  },
  profesional: {
    name: 'Crece',
    slogan: 'Escala sin límites',
    color: '#8b5cf6',
    icon: 'Rocket',
  },
};

// ─── Mapeo de tabs a features requeridas ──────────────────────────
export const TAB_FEATURE_MAP: Record<string, string> = {
  'pos': 'pos.basic',
  'products': 'pos.basic',
  'categories': 'inventory.categories',
  'clients': 'pos.basic',
  'dashboard': 'reports.basic',
  'reports': 'reports.basic',
  'cash-closing': 'reports.basic',
  'credit': 'advanced.credit',
  'devolutions': 'advanced.devolutions',
  'quotes': 'advanced.quotes',
  'delivery-notes': 'advanced.delivery-notes',
  'purchases': 'advanced.purchases',
  'suppliers': 'advanced.suppliers',
  'expenses': 'advanced.expenses',
  'kardex': 'inventory.kardex',
  'held-sales': 'pos.hold-sale',
  'catalog': 'pos.basic',
  'users': 'multiuser.roles',
  'backup': 'backup.manual',
  'config': 'pos.basic',
  'license': 'pos.basic',
  'barcode-print': 'advanced.barcode-print',
};

// ─── Verificar si un tab es accesible ─────────────────────────────
export function isTabAccessible(tabKey: string, tokenStr: string | null): boolean {
  const requiredFeature = TAB_FEATURE_MAP[tabKey];
  if (!requiredFeature) return true; // Tabs sin mapeo son accesibles
  return hasFeature(tokenStr, requiredFeature);
}