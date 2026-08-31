/**
 * Nexus One POS — Atomic Feature Flags Store v1.0
 * 
 * Estado atómico para Feature Flags de licenciamiento.
 * Los componentes se suscriben solo a la flag que necesitan.
 * Cambiar una flag NO dispara re-render en componentes que usan otra flag.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────
export type PlanType = 'gratis' | 'basico' | 'profesional';

export interface FeatureSet {
  [key: string]: boolean;
}

export interface PlanLimits {
  maxProducts: number;
  maxDailySales: number;
  maxUsers: number;
  maxActivations: number;
}

export interface FeaturesState {
  plan: PlanType;
  flags: FeatureSet;
  limits: PlanLimits;
  featureToken: string | null;
  isLoaded: boolean;
  isExpired: boolean;
  daysRemaining: number;
}

export interface FeaturesActions {
  loadFromLicense: (licenseData: any) => void;
  loadFromToken: (token: string) => void;
  hasFeature: (key: string) => boolean;
  reset: () => void;
}

export type FeaturesStore = FeaturesState & FeaturesActions;

// ─── Default flags (gratis/conecta) ─────────────────────────
const DEFAULT_FLAGS: FeatureSet = {
  'pos.basic': true,
  'pos.scan-barcode': true,
  'pos.quick-sale': true,
  'pos.mixed-payment': false,
  'pos.hold-sale': false,
  'inventory.categories': true,
  'inventory.brands': false,
  'inventory.alerts': false,
  'inventory.kardex': false,
  'inventory.expiration': false,
  'inventory.combos': false,
  'reports.basic': true,
  'reports.advanced': false,
  'reports.charts': false,
  'reports.profit-loss': false,
  'multiuser.basic': true,
  'multiuser.multiple': false,
  'multiuser.roles': false,
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
  'backup.manual': true,
  'backup.auto': false,
  'backup.cloud-sync': false,
};

const DEFAULT_LIMITS: PlanLimits = {
  maxProducts: 50,
  maxDailySales: 20,
  maxUsers: 1,
  maxActivations: 1,
};

// ─── Tab → Feature mapping ─────────────────────────────────
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

// ─── Plan info ─────────────────────────────────────────────
export const PLAN_INFO: Record<PlanType, { name: string; slogan: string; color: string }> = {
  gratis: { name: 'Conecta', slogan: 'Empieza a vender hoy', color: '#3b82f6' },
  basico: { name: 'Gestiona', slogan: 'Control total de tu negocio', color: '#10b981' },
  profesional: { name: 'Crece', slogan: 'Escala sin limites', color: '#8b5cf6' },
};

// ─── Base64url decoder (browser-safe, no Buffer) ──────────
function base64urlDecode(str: string): string {
  // Replace base64url chars with standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' if needed
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  try {
    return atob(base64);
  } catch {
    return '';
  }
}

// ─── Store ──────────────────────────────────────────────────
export const useFeaturesStore = create<FeaturesStore>()(
  subscribeWithSelector((set, get) => ({
    plan: 'gratis' as PlanType,
    flags: { ...DEFAULT_FLAGS },
    limits: { ...DEFAULT_LIMITS },
    featureToken: null,
    isLoaded: false,
    isExpired: false,
    daysRemaining: 0,

    loadFromLicense: (licenseData) => {
      if (!licenseData || licenseData.error) return;

      // Map legacy license type to plan
      let plan: PlanType = 'gratis';
      switch (licenseData.licenseType) {
        case 'profesional': plan = 'profesional'; break;
        case 'basica': plan = 'basico'; break;
        default: plan = 'gratis';
      }

      // Map legacy features to flag set
      const f = licenseData.features || {};
      const flags: FeatureSet = {
        ...DEFAULT_FLAGS,
        'pos.mixed-payment': !!f.productDiscount || plan !== 'gratis',
        'pos.hold-sale': true, // Always enabled now
        'inventory.brands': true,
        'inventory.alerts': !!f.inventoryAlerts,
        'inventory.kardex': true,
        'inventory.expiration': !!f.inventoryAlerts,
        'reports.advanced': !!f.advancedReports,
        'reports.charts': !!f.salesCharts,
        'reports.profit-loss': !!f.advancedReports,
        'multiuser.multiple': !!f.multipleUsers,
        'multiuser.roles': !!f.multipleUsers,
        'advanced.credit': true,
        'advanced.devolutions': !!f.devolutions,
        'advanced.quotes': true,
        'advanced.delivery-notes': !!f.saleNotes,
        'advanced.purchases': true,
        'advanced.expenses': true,
        'advanced.suppliers': true,
        'advanced.discount': !!f.productDiscount,
        'advanced.price-history': !!f.priceHistory,
        'advanced.export-import': !!f.exportImport,
        'advanced.barcode-print': true,
        'backup.auto': !!f.autoBackup,
      };

      const limits: PlanLimits = {
        maxProducts: f.unlimitedProducts ? 99999 : (licenseData.maxProducts || 50),
        maxDailySales: f.unlimitedSales ? 99999 : (licenseData.maxDailySales || 20),
        maxUsers: f.multipleUsers ? 5 : 1,
        maxActivations: licenseData.maxActivations || 1,
      };

      set({
        plan,
        flags,
        limits,
        featureToken: licenseData.featureToken || null,
        isLoaded: true,
        isExpired: !!licenseData.isExpired,
        daysRemaining: licenseData.daysRemaining || 0,
      });
    },

    loadFromToken: (token) => {
      try {
        const json = base64urlDecode(token);
        if (!json) return;
        const parsed = JSON.parse(json);
        if (parsed.expiresAt < Date.now()) {
          set({ isExpired: true });
          return;
        }
        set({
          plan: parsed.plan || 'gratis',
          flags: parsed.flags || DEFAULT_FLAGS,
          featureToken: token,
          isLoaded: true,
          isExpired: false,
        });
      } catch {
        // Token invalid — keep defaults
      }
    },

    hasFeature: (key) => {
      return get().flags[key] === true;
    },

    reset: () => {
      set({
        plan: 'gratis',
        flags: { ...DEFAULT_FLAGS },
        limits: { ...DEFAULT_LIMITS },
        featureToken: null,
        isLoaded: false,
        isExpired: false,
        daysRemaining: 0,
      });
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════
// ATOMIC SELECTORS — Cada componente se suscribe a SU flag
// ═══════════════════════════════════════════════════════════════════

/** Plan actual */
export const selectPlan = (s: FeaturesState) => s.plan;

/** Si los flags ya fueron cargados */
export const selectIsLoaded = (s: FeaturesState) => s.isLoaded;

/** Si la licencia está expirada */
export const selectIsExpired = (s: FeaturesState) => s.isExpired;

/** Días restantes */
export const selectDaysRemaining = (s: FeaturesState) => s.daysRemaining;

/** Límites del plan */
export const selectLimits = (s: FeaturesState) => s.limits;

/** Feature token para requests */
export const selectFeatureToken = (s: FeaturesState) => s.featureToken;

/** Crea un selector atómico para una flag específica */
export const createFeatureSelector = (key: string) => (s: FeaturesState) =>
  s.flags[key] === true;

/** Selectores pre-construidos para flags comunes */
export const selectCanMixedPayment = createFeatureSelector('pos.mixed-payment');
export const selectCanHoldSale = createFeatureSelector('pos.hold-sale');
export const selectCanKardex = createFeatureSelector('inventory.kardex');
export const selectCanCharts = createFeatureSelector('reports.charts');
export const selectCanAdvancedReports = createFeatureSelector('reports.advanced');
export const selectCanMultipleUsers = createFeatureSelector('multiuser.multiple');
export const selectCanRoles = createFeatureSelector('multiuser.roles');
export const selectCanCredit = createFeatureSelector('advanced.credit');
export const selectCanDevolutions = createFeatureSelector('advanced.devolutions');
export const selectCanQuotes = createFeatureSelector('advanced.quotes');
export const selectCanDeliveryNotes = createFeatureSelector('advanced.delivery-notes');
export const selectCanPurchases = createFeatureSelector('advanced.purchases');
export const selectCanExpenses = createFeatureSelector('advanced.expenses');
export const selectCanSuppliers = createFeatureSelector('advanced.suppliers');
export const selectCanDiscount = createFeatureSelector('advanced.discount');
export const selectCanExportImport = createFeatureSelector('advanced.export-import');
export const selectCanBarcodePrint = createFeatureSelector('advanced.barcode-print');
export const selectCanAutoBackup = createFeatureSelector('backup.auto');
export const selectCanInventoryAlerts = createFeatureSelector('inventory.alerts');

// ─── Tab accessibility ───────────────────────────────────────
/** Verifica si un tab es accesible según el plan actual */
export function isTabAccessible(tabKey: string, flags: FeatureSet): boolean {
  const requiredFeature = TAB_FEATURE_MAP[tabKey];
  if (!requiredFeature) return true;
  return flags[requiredFeature] === true;
}

/** Selector atómico: ¿es accesible este tab? */
export const createTabAccessibleSelector = (tabKey: string) => (s: FeaturesState) =>
  isTabAccessible(tabKey, s.flags);

// ─── Usage example: ────────────────────────────────────────
//
// // Un componente de Crédito solo se re-renderiza si 'advanced.credit' cambia
// const canCredit = useFeaturesStore(selectCanCredit);
//
// // Un tab solo se re-renderiza si su feature cambia
// const isAccessible = useFeaturesStore(createTabAccessibleSelector('kardex'));
//
// // Filtrar tabs visibles sin re-renderizar todo el layout
// const plan = useFeaturesStore(selectPlan);
// const flags = useFeaturesStore(s => s.flags);
// const visibleTabs = allTabs.filter(t => isTabAccessible(t.value, flags));
