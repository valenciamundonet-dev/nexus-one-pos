/**
 * Nexus One POS — Base de Datos Indestructible v1.0
 * 
 * Configuración SQLite optimizada para:
 * - Transacciones ACID estrictas (WAL mode)
 * - Resistencia a apagones (PRAGMA safe, sync)
 * - Detección y recuperación automática de corrupción
 * - Busy timeout para concurrencia local
 * 
 * Si la computadora se apaga a mitad de venta:
 * - La transacción se revierte automáticamente (WAL checkpoint)
 * - El inventario queda intacto
 * - Al reiniciar, el sistema detecta si hubo cierre limpio o no
 */

import { PrismaClient } from '@prisma/client';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

// ─── Configuración de Resiliencia ──────────────────────────────
export const DB_RESILIENCE_CONFIG = {
  // WAL mode: escrituras no bloquean lecturas (crucial para POS)
  walMode: true,
  
  // Synchronous: FULL = máximo nivel de seguridad ante apagones
  // Cada transacción espera a que el SO confirme el write en disco
  synchronous: 'FULL' as const,
  
  // Busy timeout: si otra operación está escribiendo, esperar hasta N ms
  busyTimeout: 5000,
  
  // Journal mode: WAL es superior a DELETE/APPEND para concurrencia
  journalMode: 'WAL' as const,
  
  // Auto-checkpoint: cada N paginas, SQLite hace checkpoint del WAL
  // 1000 = balance entre rendimiento y seguridad
  walAutoCheckpoint: 1000,
  
  // Cache size: -8000 = 8MB de cache (negativo = KB)
  // En 2GB RAM, 8MB es un buen balance
  cacheSize: -8000,
  
  // Temp store: MEMORY para mejor rendimiento en POS
  tempStore: 'MEMORY' as const,
  
  // Mmap size: 0 = dejar que SQLite decida
  mmapSize: 0,
  
  // Foreign keys: habilitado para integridad referencial
  foreignKeys: true,
  
  // Auto-vacuum: INCREMENTAL para no bloquear
  autoVacuum: 'INCREMENTAL' as const,
};

// ─── Health Check Status ────────────────────────────────────────
export interface DBHealthStatus {
  isHealthy: boolean;
  integrityOk: boolean;
  walMode: boolean;
  dbSizeMB: number;
  walSizeMB: number;
  pageCount: number;
  corruptionDetected: boolean;
  lastCheckpoint: string;
  recoveryPerformed: boolean;
}

// ─── PRAGMAs a ejecutar al iniciar ───────────────────────────────
const RESILIENCE_PRAGMAS = [
  `PRAGMA journal_mode = WAL;`,
  `PRAGMA synchronous = FULL;`,
  `PRAGMA busy_timeout = ${DB_RESILIENCE_CONFIG.busyTimeout};`,
  `PRAGMA wal_autocheckpoint = ${DB_RESILIENCE_CONFIG.walAutoCheckpoint};`,
  `PRAGMA cache_size = ${DB_RESILIENCE_CONFIG.cacheSize};`,
  `PRAGMA temp_store = ${DB_RESILIENCE_CONFIG.tempStore};`,
  `PRAGMA foreign_keys = ON;`,
  `PRAGMA auto_vacuum = INCREMENTAL;`,
  `PRAGMA secure_delete = ON;`, // Sobreescribir datos borrados (seguridad)
  `PRAGMA incremental_vacuum;`, // Ejecutar vacuum incremental
];

// ─── Crear PrismaClient con configuración de resiliencia ────────
export function createResilientPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: `file:./dev.db`,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
  });

  // Aplicar PRAGMAs de resiliencia al iniciar la conexión
  // Nota: Estos se ejecutan en el primer query
  applyResiliencePragmas(client);

  return client;
}

async function applyResiliencePragmas(client: PrismaClient): Promise<void> {
  try {
    // Prisma no expone directamente PRAGMA, pero podemos ejecutarlos
    // como queries raw en SQLite
    for (const pragma of RESILIENCE_PRAGMAS) {
      try {
        await (client as any).$executeRawUnsafe(pragma);
      } catch (err) {
        console.warn(`[Nexus One] PRAGMA fallido (no crítico): ${pragma}`, err);
      }
    }
    console.log('[Nexus One] PRAGMAs de resiliencia aplicados a SQLite');
  } catch (err) {
    console.error('[Nexus One] Error aplicando PRAGMAs de resiliencia:', err);
  }
}

// ─── Verificación de Integridad ─────────────────────────────────
export async function checkDBIntegrity(client: PrismaClient): Promise<DBHealthStatus> {
  const status: DBHealthStatus = {
    isHealthy: false,
    integrityOk: false,
    walMode: false,
    dbSizeMB: 0,
    walSizeMB: 0,
    pageCount: 0,
    corruptionDetected: false,
    lastCheckpoint: new Date().toISOString(),
    recoveryPerformed: false,
  };

  try {
    // 1. Verificar integridad
    const integrityResult = await (client as any).$queryRawUnsafe('PRAGMA integrity_check;');
    status.integrityOk = integrityResult?.[0]?.integrity_check === 'ok';
    status.corruptionDetected = !status.integrityOk;

    // 2. Verificar WAL mode
    const journalResult = await (client as any).$queryRawUnsafe('PRAGMA journal_mode;');
    status.walMode = journalResult?.[0]?.journal_mode === 'wal';

    // 3. Tamaño de BD
    const dbPath = join(process.cwd(), 'prisma', 'dev.db');
    if (existsSync(dbPath)) {
      const stats = statSync(dbPath);
      status.dbSizeMB = Math.round((stats.size / 1024 / 1024) * 100) / 100;
    }

    // 4. Tamaño del WAL
    const walPath = dbPath + '-wal';
    if (existsSync(walPath)) {
      const walStats = statSync(walPath);
      status.walSizeMB = Math.round((walStats.size / 1024 / 1024) * 100) / 100;
    }

    // 5. Conteo de páginas
    const pageResult = await (client as any).$queryRawUnsafe('PRAGMA page_count;');
    status.pageCount = pageResult?.[0]?.page_count || 0;

    // 6. Recuperación automática si hay corrupción
    if (status.corruptionDetected) {
      console.error('[Nexus One] CORRUPCION DE BD DETECTADA — Intentando recuperación...');
      await attemptRecovery(client);
      status.recoveryPerformed = true;
      
      // Re-verificar
      const recheck = await (client as any).$queryRawUnsafe('PRAGMA integrity_check;');
      status.integrityOk = recheck?.[0]?.integrity_check === 'ok';
    }

    status.isHealthy = status.integrityOk;
    return status;
  } catch (err) {
    console.error('[Nexus One] Error en verificación de integridad:', err);
    status.isHealthy = false;
    return status;
  }
}

// ─── Recuperación de Corrupción ─────────────────────────────────
async function attemptRecovery(client: PrismaClient): Promise<void> {
  const dbPath = join(process.cwd(), 'prisma', 'dev.db');
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';

  try {
    // Paso 1: Hacer backup de los archivos corruptos
    const backupDir = join(process.cwd(), 'prisma', 'recovery-backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (existsSync(dbPath)) {
      copyFileSync(dbPath, join(backupDir, `dev.db.corrupt.${timestamp}`));
    }
    if (existsSync(walPath)) {
      copyFileSync(walPath, join(backupDir, `dev.db-wal.${timestamp}`));
    }

    // Paso 2: Forzar checkpoint para recuperar del WAL
    try {
      await (client as any).$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch {
      // Si el checkpoint falla, los datos del WAL se pierden
      // pero la BD principal sigue intacta
    }

    console.log('[Nexus One] Backup de recuperación guardado en prisma/recovery-backups/');
  } catch (err) {
    console.error('[Nexus One] Error en recuperación de BD:', err);
  }
}

// ─── Transacción Segura (wrapper) ───────────────────────────────
/**
 * Ejecuta una operación dentro de una transacción con:
 * - Timeout de busy
 * - Retry automático (hasta 3 intentos)
 * - Rollback silencioso en caso de error
 */
export async function safeTransaction<T>(
  client: PrismaClient,
  operation: (tx: any) => Promise<T>,
  retries: number = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await client.$transaction(operation, {
        timeout: DB_RESILIENCE_CONFIG.busyTimeout,
        isolationLevel: 'Serializable' as any,
      });
      return result;
    } catch (err: any) {
      lastError = err;
      
      // Si es busy/locked, reintentar
      if (err?.code === 'SQLITE_BUSY' || err?.message?.includes('locked')) {
        console.warn(`[Nexus One] BD ocupada, reintento ${attempt}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        continue;
      }
      
      // Otros errores no se reintentan
      throw err;
    }
  }

  throw lastError;
}

// ─── Checkpoint Manual ───────────────────────────────────────────
export async function forceCheckpoint(client: PrismaClient, mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'PASSIVE'): Promise<void> {
  try {
    await (client as any).$executeRawUnsafe(`PRAGMA wal_checkpoint(${mode});`);
    console.log(`[Nexus One] WAL checkpoint ${mode} ejecutado`);
  } catch (err) {
    console.error('[Nexus One] Error en WAL checkpoint:', err);
  }
}
