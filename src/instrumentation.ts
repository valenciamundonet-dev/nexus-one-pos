/**
 * Next.js Instrumentation — Startup Hook
 *
 * Se ejecuta automáticamente cuando Next.js inicia (tanto dev como prod).
 * Todas las operaciones son NO-BLOQUEANTES para no retrasar el inicio del servidor.
 *
 * 1. Sistema de migración de BD (db-migration.ts)
 * 2. Auto-backup periódico (auto-backup.ts) — con delay inicial
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Migraciones: NO bloquear el inicio del servidor
    import('./lib/db-migration')
      .then(({ runMigrations }) => runMigrations())
      .then((result) => {
        if (result.applied > 0) {
          console.log(`[Startup] ${result.applied} migracion(es) aplicada(s). Version: v${result.version}`);
        }
      })
      .catch((e) => {
        console.error('[Startup] Error en migraciones:', e);
      });

    // Auto-backup: iniciar con delay de 30s para no saturar el arranque
    setTimeout(() => {
      import('./lib/auto-backup')
        .then(({ startAutoBackup }) => startAutoBackup(60 * 60 * 1000))
        .catch((e) => {
          console.error('[Startup] Error iniciando auto-backup:', e);
        });
    }, 30000);
  }
}
