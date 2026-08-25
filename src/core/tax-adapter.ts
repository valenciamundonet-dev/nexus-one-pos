/**
 * Nexus One POS — Motor de Impuestos (Patrón Adapter) v1.0
 * 
 * Arquitectura:
 *   SaleEngine → TaxAdapter → TaxStrategy (Venezuela/US/EU/...)
 * 
 * El core de ventas procesa de forma GENÉRICA sin saber qué impuestos aplica.
 * Cada localización es un módulo independiente que se registra dinámicamente.
 * Se pueden agregar nuevos países sin tocar el código de ventas.
 * 
 * Actualización en caliente:
 *   Cuando detecta internet, descarga JSON ultraligeros de configuración fiscal
 *   y los aplica sin reiniciar el sistema.
 */

// ─── Interfaces del Patrón Adapter ───────────────────────────────

export interface TaxLine {
  label: string;
  rate: number;       // 0.16 = 16%
  amount: number;     // monto calculado
  baseAmount: number; // base sobre la que se calculó
  code: string;       // IVA16, EXENTO, REDUCIDO, etc.
}

export interface TaxCalculationResult {
  lines: TaxLine[];
  totalTax: number;
  totalExempt: number;
  subtotalBeforeTax: number;
  grandTotal: number;
  locale: string;
  currency: string;
  legalText?: string;    // Texto legal requerido en el ticket
  legalFooter?: string[];
}

export interface SaleItemForTax {
  name: string;
  quantity: number;
  unitPrice: number;
  taxType: string;       // exento, reducido, general, etc.
  isService: boolean;
}

export interface TaxStrategy {
  locale: string;
  currency: string;
  displayName: string;
  
  /** Calcular impuestos para una venta completa */
  calculateTax(items: SaleItemForTax[], exchangeRate?: number): TaxCalculationResult;
  
  /** Obtener tipos de impuesto disponibles */
  getTaxTypes(): Array<{ code: string; label: string; rate: number; description: string }>;
  
  /** Generar el bloque fiscal del ticket */
  generateTicketTaxBlock(result: TaxCalculationResult): string[];
  
  /** Generar texto legal para el pie del ticket */
  generateLegalFooter(result: TaxCalculationResult): string[];
}

export interface LocaleConfig {
  locale: string;
  displayName: string;
  currency: string;
  taxStrategy: TaxStrategy;
  updatedAt?: string;
  version?: string;
}

// ─── Registry de Estrategias Fiscales ─────────────────────────────

class TaxRegistry {
  private strategies: Map<string, TaxStrategy> = new Map();
  private currentLocale: string = 'VE';
  private hotReloadConfig: HotReloadConfig | null = null;

  register(strategy: TaxStrategy): void {
    this.strategies.set(strategy.locale, strategy);
  }

  get(locale?: string): TaxStrategy {
    const key = locale || this.currentLocale;
    const strategy = this.strategies.get(key);
    if (!strategy) {
      // Fallback a Venezuela
      const ve = this.strategies.get('VE');
      if (!ve) throw new Error(`TaxStrategy no encontrada para: ${key}`);
      return ve;
    }
    return strategy;
  }

  setLocale(locale: string): void {
    if (this.strategies.has(locale)) {
      this.currentLocale = locale;
    } else {
      console.warn(`[Nexus One] Locale fiscal '${locale}' no registrado. Usando '${this.currentLocale}'`);
    }
  }

  getLocale(): string {
    return this.currentLocale;
  }

  listLocales(): Array<{ locale: string; displayName: string; currency: string }> {
    return Array.from(this.strategies.values()).map(s => ({
      locale: s.locale,
      displayName: s.displayName,
      currency: s.currency,
    }));
  }

  // ─── Hot Reload ──────────────────────────────────────────────
  enableHotReload(config: HotReloadConfig): void {
    this.hotReloadConfig = config;
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.hotReloadConfig) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(this.hotReloadConfig.checkUrl, {
        signal: controller.signal,
        cache: 'no-cache',
      });
      clearTimeout(timeout);

      if (!resp.ok) return false;

      const data = await resp.json() as { version: string; locale: string; config: any };
      const current = this.strategies.get(data.locale);

      if (current && data.version !== (current as any)._configVersion) {
        await this.applyUpdate(data);
        return true;
      }
      return false;
    } catch {
      return false; // Sin internet = no hay actualización, el sistema sigue funcionando
    }
  }

  private async applyUpdate(data: { version: string; locale: string; config: any }): Promise<void> {
    try {
      // Aplicar nueva configuración sin reiniciar
      const strategy = this.strategies.get(data.locale);
      if (strategy && (strategy as any).updateConfig) {
        (strategy as any).updateConfig(data.config);
        (strategy as any)._configVersion = data.version;
        console.log(`[Nexus One] Configuración fiscal '${data.locale}' actualizada a v${data.version}`);
      }
    } catch (err) {
      console.error('[Nexus One] Error aplicando actualización fiscal:', err);
    }
  }
}

export interface HotReloadConfig {
  checkUrl: string;
  intervalMs: number;
}

// ─── Singleton ────────────────────────────────────────────────────
export const taxRegistry = new TaxRegistry();

// ─── Función de conveniencia para el core de ventas ──────────────
export function calculateTaxes(items: SaleItemForTax[], locale?: string, exchangeRate?: number): TaxCalculationResult {
  const strategy = taxRegistry.get(locale);
  return strategy.calculateTax(items, exchangeRate);
}

export function getTicketTaxLines(result: TaxCalculationResult): string[] {
  const strategy = taxRegistry.get();
  return strategy.generateTicketTaxBlock(result);
}

export function getTicketLegalFooter(result: TaxCalculationResult): string[] {
  const strategy = taxRegistry.get();
  return strategy.generateLegalFooter(result);
}