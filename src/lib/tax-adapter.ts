/**
 * NexusOne POS — Tax Adapter (Client-Compatible) v1.0
 * 
 * Interfaz unificada para calculos fiscales. El POS es agnostico al pais:
 * solo llama a calculateTaxes() y recibe un TaxCalculation completo.
 * 
 * Soporta:
 *   - IVA incluido / excluido (Venezuela)
 *   - Sales Tax porcentual (EEUU)
 *   - Exenciones por tipo de producto
 *   - Tasa personalizada via tax-config.json
 */

// ─── Types ──────────────────────────────────────────────────
export interface TaxItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxType?: string;      // 'general' | 'reducido' | 'exento' | 'omitido'
  isWholesale?: boolean;
}

export interface TaxBreakdownEntry {
  label: string;
  rate: number;
  taxableBase: number;
  taxAmount: number;
}

export interface TaxCalculation {
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  taxBreakdown: TaxBreakdownEntry[];
  totalTax: number;
  total: number;
  currency: string;
}

export interface TaxOptions {
  taxRate?: number;        // Default rate (e.g. 16 for Venezuela IVA)
  taxMode?: string;        // 'included' | 'excluded' | 'none'
  discount?: number;
  currency?: string;
  // Overridden rates by tax type
  rateOverrides?: Record<string, number>;
}

// ─── Default rate overrides (Venezuela SENIAT) ──
const DEFAULT_RATE_OVERRIDES: Record<string, number> = {
  'general': 16,
  'reducido': 8,
  'exento': 0,
  'omitido': 0,
};

// ─── Main calculation ─────────────────────────────────────
export function calculateTaxes(
  items: TaxItem[],
  options: TaxOptions = {}
): TaxCalculation {
  const {
    taxRate = 16,
    taxMode = 'included',
    discount = 0,
    currency = 'USD',
    rateOverrides = DEFAULT_RATE_OVERRIDES,
  } = options;

  // 1. Calculate item subtotal (price * qty)
  const grossSubtotal = items.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity);
  }, 0);

  // 2. Apply discount proportionally
  const effectiveSubtotal = grossSubtotal - discount;

  // 3. No tax mode
  if (taxMode === 'none' || taxRate <= 0) {
    return {
      subtotal: grossSubtotal,
      discount,
      taxableSubtotal: effectiveSubtotal,
      taxBreakdown: [],
      totalTax: 0,
      total: Math.max(0, effectiveSubtotal),
      currency,
    };
  }

  // 4. Group items by tax type and calculate
  const typeGroups = new Map<string, { base: number; count: number }>();

  for (const item of items) {
    const taxType = item.taxType || 'general';
    const rate = rateOverrides[taxType] ?? taxRate;

    // Skip exempt/omitted items from tax calculation
    if (rate <= 0) continue;

    const itemTotal = item.unitPrice * item.quantity;
    const group = typeGroups.get(taxType) || { base: 0, count: 0 };

    if (taxMode === 'included') {
      // IVA included: base = itemTotal / (1 + rate/100)
      group.base += itemTotal / (1 + rate / 100);
    } else {
      // Tax excluded: base = itemTotal
      group.base += itemTotal;
    }
    group.count++;
    typeGroups.set(taxType, group);
  }

  // 5. Build tax breakdown
  const taxBreakdown: TaxBreakdownEntry[] = [];
  let totalTax = 0;

  const typeLabels: Record<string, string> = {
    'general': 'IVA General',
    'reducido': 'IVA Reducido',
    'exento': 'Exento',
    'omitido': 'Omitido',
  };

  for (const [taxType, group] of typeGroups) {
    const rate = rateOverrides[taxType] ?? taxRate;
    const taxAmount = group.base * (rate / 100);
    totalTax += taxAmount;

    taxBreakdown.push({
      label: typeLabels[taxType] || `Impuesto ${taxType}`,
      rate,
      taxableBase: Math.round(group.base * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
    });
  }

  totalTax = Math.round(totalTax * 100) / 100;

  // 6. Calculate totals
  let total: number;
  if (taxMode === 'included') {
    // Tax already in prices — total is subtotal minus discount
    total = Math.max(0, effectiveSubtotal);
  } else {
    // Tax excluded — add tax on top
    total = Math.max(0, effectiveSubtotal + totalTax);
  }

  return {
    subtotal: Math.round(grossSubtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    taxableSubtotal: Math.round(
      taxBreakdown.reduce((s, e) => s + e.taxableBase, 0) * 100
    ) / 100,
    taxBreakdown,
    totalTax,
    total: Math.round(total * 100) / 100,
    currency,
  };
}
