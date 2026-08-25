/**
 * Nexus One POS — Estrategia Fiscal: Venezuela (SENIAT)
 * 
 * IVA general 16%, reducido 8%, exento 0%
 * Texto legal requerido en tickets según normativa SENIAT
 * Soporta doble moneda (USD/Bs) con tasa BCV
 */

import { TaxStrategy, TaxCalculationResult, TaxLine, SaleItemForTax } from '../core/tax-adapter';

// ─── Configuración SENIAT ─────────────────────────────────────────
const SENIAT_CONFIG = {
  ivaGeneral: 0.16,
  ivaReducido: 0.08,
  ivaExento: 0,
  
  // Tipos de impuesto disponibles
  taxTypes: [
    { code: 'GENERAL', label: 'IVA General (16%)', rate: 0.16, description: 'Tasa estándar para la mayoría de bienes y servicios' },
    { code: 'REDUCIDO', label: 'IVA Reducido (8%)', rate: 0.08, description: 'Tasa reducida para alimentos, medicinas, etc.' },
    { code: 'EXENTO', label: 'Exento', rate: 0, description: 'Productos exentos de IVA' },
  ] as const,
  
  // Texto legal para tickets
  legalFooter: [
    'RIF: {rif}',
    'Factura de venta por computador',
    'Fecha: {fecha}',
    'Conecta - Gestiona - Crece | Nexus One',
  ],
  
  // Número de RIF de ejemplo para formato
  rifPattern: /^[JVGPE]-\d{8}-\d{1}$/,
};

let _configVersion = '1.0.0';

// ─── Implementación de la Estrategia ─────────────────────────────
export class VenezuelaTaxStrategy implements TaxStrategy {
  locale = 'VE';
  currency = 'VES';
  displayName = 'Venezuela (SENIAT)';
  
  get _configVersion() { return _configVersion; }
  set _configVersion(v: string) { _configVersion = v; }

  calculateTax(items: SaleItemForTax[], exchangeRate?: number): TaxCalculationResult {
    const lines: TaxLine[] = [];
    let totalTax = 0;
    let totalExempt = 0;
    let subtotalBeforeTax = 0;

    // Agrupar por tipo de impuesto
    const groups: Record<string, { base: number; items: SaleItemForTax[] }> = {
      GENERAL: { base: 0, items: [] },
      REDUCIDO: { base: 0, items: [] },
      EXENTO: { base: 0, items: [] },
    };

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      const taxGroup = this.resolveTaxGroup(item.taxType);
      groups[taxGroup].base += lineTotal;
      groups[taxGroup].items.push(item);
    }

    // Calcular IVA por grupo
    const rateMap: Record<string, number> = { GENERAL: SENIAT_CONFIG.ivaGeneral, REDUCIDO: SENIAT_CONFIG.ivaReducido, EXENTO: 0 };

    for (const [group, data] of Object.entries(groups)) {
      const rate = rateMap[group];
      const taxAmount = data.base * rate;
      const labelMap: Record<string, string> = { 
        GENERAL: 'IVA 16%', 
        REDUCIDO: 'IVA 8%', 
        EXENTO: 'Exento' 
      };

      lines.push({
        label: labelMap[group],
        rate,
        amount: Math.round(taxAmount * 100) / 100,
        baseAmount: Math.round(data.base * 100) / 100,
        code: group,
      });

      totalTax += taxAmount;
      if (group === 'EXENTO') totalExempt += data.base;
    }

    subtotalBeforeTax = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // En Venezuela los precios suelen ser INCLUSIVOS de IVA
    // Aquí calculamos de forma exclusiva (se puede configurar)
    const grandTotal = subtotalBeforeTax;

    return {
      lines,
      totalTax: Math.round(totalTax * 100) / 100,
      totalExempt: Math.round(totalExempt * 100) / 100,
      subtotalBeforeTax: Math.round(subtotalBeforeTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      locale: this.locale,
      currency: this.currency,
      legalText: 'Factura afectada por IVA conforme a la Ley de IVA de Venezuela',
    };
  }

  getTaxTypes() {
    return [...SENIAT_CONFIG.taxTypes];
  }

  generateTicketTaxBlock(result: TaxCalculationResult): string[] {
    const block: string[] = [];
    for (const line of result.lines) {
      block.push(`  ${line.label}:    Bs ${line.amount.toFixed(2)}`);
    }
    block.push(`  TOTAL IVA:    Bs ${result.totalTax.toFixed(2)}`);
    return block;
  }

  generateLegalFooter(result: TaxCalculationResult): string[] {
    return [...SENIAT_CONFIG.legalFooter];
  }

  // ─── Método para hot-reload ───────────────────────────────────
  updateConfig(config: Partial<typeof SENIAT_CONFIG>): void {
    if (config.ivaGeneral !== undefined) (SENIAT_CONFIG as any).ivaGeneral = config.ivaGeneral;
    if (config.ivaReducido !== undefined) (SENIAT_CONFIG as any).ivaReducido = config.ivaReducido;
    if (config.taxTypes) (SENIAT_CONFIG as any).taxTypes = config.taxTypes;
    if (config.legalFooter) (SENIAT_CONFIG as any).legalFooter = config.legalFooter;
  }

  // ─── Resolver tipo de impuesto desde el campo del producto ────
  private resolveTaxGroup(taxType: string): string {
    switch (taxType.toLowerCase()) {
      case 'reducido':
      case '8':
      case '0.08':
        return 'REDUCIDO';
      case 'exento':
      case '0':
      case 'exempt':
        return 'EXENTO';
      case 'general':
      case '16':
      case '0.16':
      default:
        return 'GENERAL';
    }
  }
}
