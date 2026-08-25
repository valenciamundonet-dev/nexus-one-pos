/**
 * Nexus One POS — Inicializador del Sistema v1.0
 * 
 * Este archivo se ejecuta en el startup de la app y:
 * 1. Registra las estrategias fiscales disponibles
 * 2. Inicializa el motor de performance
 * 3. Registra los periféricos conocidos
 * 4. Verifica la integridad de la BD
 * 5. Aplica PRAGMAs de resiliencia
 */

import { taxRegistry } from './tax-adapter';

// ─── Registro de Estrategias Fiscales ─────────────────────────────
// Solo se registra Venezuela por defecto (instalación local venezolana)
// Más estrategias se pueden registrar dinámicamente

export async function bootstrapNexusOne(): Promise<void> {
  console.log('[Nexus One] Inicializando sistema...');
  console.log('[Nexus One] Conecta - Gestiona - Crece');

  // 1. Registrar estrategia fiscal por defecto
  try {
    const { VenezuelaTaxStrategy } = await import('../lib/tax-locales/venezuela');
    taxRegistry.register(new VenezuelaTaxStrategy());
    console.log('[Nexus One] Estrategia fiscal Venezuela (SENIAT) registrada');
  } catch (err) {
    console.warn('[Nexus One] No se pudo registrar estrategia fiscal Venezuela:', err);
  }

  // 2. Registrar periféricos conocidos
  try {
    const { registerPeripheral } = await import('./peripheral-isolator');
    registerPeripheral('printer', 'thermal-main');
    registerPeripheral('scanner', 'barcode-scanner');
    registerPeripheral('cash-drawer', 'cash-drawer-1');
    console.log('[Nexus One] Periféricos registrados en el aislador');
  } catch (err) {
    console.warn('[Nexus One] Error registrando periféricos:', err);
  }

  // 3. Verificar integridad de BD (no bloqueante)
  try {
    const { checkDBIntegrity } = await import('./resilient-db');
    const { db } = await import('../lib/db');
    // Ejecutar en background para no bloquear el startup
    setTimeout(async () => {
      const health = await checkDBIntegrity(db);
      if (health.isHealthy) {
        console.log(`[Nexus One] BD saludable — ${health.dbSizeMB}MB, WAL: ${health.walMode ? 'ON' : 'OFF'}`);
      } else {
        console.error(`[Nexus One] PROBLEMA DE BD — Integridad: ${health.integrityOk}, Recuperación: ${health.recoveryPerformed}`);
      }
    }, 2000);
  } catch (err) {
    console.warn('[Nexus One] No se pudo verificar integridad de BD en startup:', err);
  }

  // 4. Iniciar motor de performance (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    try {
      const { startPerformanceMonitor } = await import('./performance-engine');
      startPerformanceMonitor();
      console.log('[Nexus One] Monitor de rendimiento activado (desarrollo)');
    } catch {}
  }

  // 5. Hot-reload de configuración fiscal (background check cada 30 min)
  if (typeof window !== 'undefined') {
    setInterval(async () => {
      try {
        const updated = await taxRegistry.checkForUpdates();
        if (updated) {
          console.log('[Nexus One] Configuración fiscal actualizada en caliente');
        }
      } catch {}
    }, 30 * 60 * 1000); // 30 minutos
  }

  console.log('[Nexus One] Sistema inicializado correctamente');
}

// Auto-bootstrap en el cliente
if (typeof window !== 'undefined') {
  bootstrapNexusOne().catch(err => {
    console.error('[Nexus One] Error en bootstrap:', err);
  });
}
