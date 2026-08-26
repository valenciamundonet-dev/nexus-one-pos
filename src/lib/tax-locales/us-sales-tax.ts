/**
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
