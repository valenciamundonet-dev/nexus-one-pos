/**
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
