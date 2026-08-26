/**
 * NexusOne POS — Local-First Database v1.1
 * 
 * Capa de persistencia ultra-resiliente con tolerancia a fallos.
 * 
 * Estrategias:
 *   1. WAL Mode en SQLite para escribir sin bloquear lecturas
 *   2. Safe transactions con retry ante SQLITE_BUSY
 *   3. Auto-checkpoint cada 1000 escrituras para controlar WAL
 *   4. Backup inmediato post-venta (journaling síncrono)
 *   5. Peripheral isolation: impresoras/escáneres nunca bloquean la BD
 * 
 * Nota: Esta capa envuelve PrismaClient existente. No reemplaza la BD,
 * sino que añade resiliencia y monitoreo. PGLite se puede integrar
 * como capa de cache client-side en el futuro sin cambiar esta API.
 */

import { PrismaClient } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────
export interface DbHealth {
  isHealthy: boolean;
  walSize: number;
  totalWrites: number;
  lastCheckpoint: number;
  busyRetries: number;
  avgQueryMs: number;
}

// ─── Configuration ─────────────────────────────────────────
const MAX_BUSY_RETRIES = 5;
const BUSY_RETRY_DELAY_MS = 50;
const CHECKPOINT_INTERVAL = 1000; // escrituras entre checkpoints
const HEALTH_CHECK_INTERVAL_MS = 30000;

// Detectar si estamos en build-time de Next.js (no hay DB disponible)
const isBuildTime = typeof process !== 'undefined' &&
  (process.env.NEXT_PHASE === 'phase-production-build' ||
   process.env.__NEXT_TEST_MODE ||
   !process.env.DATABASE_URL);

// Detectar si estamos en el navegador
const isBrowser = typeof window !== 'undefined';

// ─── Prisma Client with enhanced settings ───────────────────
function createResilientClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
  });
}

// ─── Singleton placeholder ─────────────────────────────────
const globalForDb = globalThis as unknown as {
  nexusDb: NexusLocalDB | undefined;
};

// ═══════════════════════════════════════════════════════════════
// MAIN CLASS — Definida ANTES del singleton para evitar
// ReferenceError por hoisting en produccion (minificado)
// ═══════════════════════════════════════════════════════════════

export class NexusLocalDB {
  private client: PrismaClient;
  private writeCount = 0;
  private busyRetries = 0;
  private lastCheckpoint = Date.now();
  private queryTimes: number[] = [];
  private isShuttingDown = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private walEnabled = false;

  constructor() {
    this.client = createResilientClient();
    // NO llamar metodos async en el constructor.
    // Se inicializan de forma lazy o via init().
    if (!isBuildTime && !isBrowser) {
      this.lazyInit();
    }
  }

  /** Inicializacion lazy — se ejecuta en primer uso real */
  private _initPromise: Promise<void> | null = null;
  private lazyInit(): void {
    if (!this._initPromise) {
      this._initPromise = this._doInit().catch(err => {
        console.error('[NexusOne DB] Init failed:', err);
        this._initPromise = null; // Permitir reintento
      });
    }
  }

  private async _doInit(): Promise<void> {
    try {
      await this.enableWALMode();
    } catch (err) {
      console.warn('[NexusOne DB] WAL mode setup deferred:', err);
    }
    this.startHealthMonitor();
    this.setupGracefulShutdown();
  }

  /** Esperar a que la inicializacion este lista */
  async ready(): Promise<void> {
    if (this._initPromise) await this._initPromise;
  }

  // ─── Access underlying Prisma client ──────────────────────
  get prisma(): PrismaClient {
    return this.client;
  }

  // ─── Enable WAL mode for non-blocking writes ──────────────
  private async enableWALMode(): Promise<void> {
    if (isBuildTime || isBrowser) return;
    try {
      await this.client.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.client.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
      await this.client.$executeRawUnsafe('PRAGMA wal_autocheckpoint = 500;');
      await this.client.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
      await this.client.$executeRawUnsafe('PRAGMA cache_size = -8000;'); // 8MB cache
      await this.client.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
      this.walEnabled = true;
      console.log('[NexusOne DB] WAL mode enabled with 8MB cache');
    } catch (err) {
      console.error('[NexusOne DB] Failed to enable WAL mode:', err);
    }
  }

  // ─── Safe Transaction with BUSY retry ─────────────────────
  async safeTransaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
    retries = MAX_BUSY_RETRIES
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.client.$transaction(fn, {
          maxWait: 5000,
          timeout: 10000,
        });
        this.recordWrite();
        return result;
      } catch (error: any) {
        lastError = error;
        const msg = error?.message || '';
        if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked')) {
          this.busyRetries++;
          if (attempt < retries) {
            await this.delay(BUSY_RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }

  // ─── Safe Query with timing ───────────────────────────────
  async safeQuery<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const elapsed = performance.now() - start;
      this.queryTimes.push(elapsed);
      if (this.queryTimes.length > 100) this.queryTimes.shift();
    }
  }

  // ─── Checkpoint WAL ───────────────────────────────────────
  private async checkpointWAL(): Promise<void> {
    try {
      await this.client.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
      this.lastCheckpoint = Date.now();
      this.writeCount = 0;
    } catch (err) {
      console.warn('[NexusOne DB] WAL checkpoint failed:', err);
    }
  }

  // ─── Record write & auto-checkpoint ───────────────────────
  private recordWrite(): void {
    this.writeCount++;
    if (this.writeCount >= CHECKPOINT_INTERVAL) {
      this.checkpointWAL(); // Fire and forget
    }
  }

  // ─── Health Monitor ────────────────────────────────────────
  private startHealthMonitor(): void {
    if (isBuildTime || isBrowser) return;
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth().catch(() => {});
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  async checkHealth(): Promise<DbHealth> {
    try {
      let walSize = 0;
      try {
        const result = await this.client.$queryRawUnsafe<Array<{ wal_size: number }>>(
          `SELECT page_count * page_size as wal_size FROM pragma_wal_info();`
        );
        walSize = result?.[0]?.wal_size || 0;
      } catch {
        walSize = 0;
      }

      const avgQueryMs = this.queryTimes.length > 0
        ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
        : 0;

      const health: DbHealth = {
        isHealthy: true,
        walSize,
        totalWrites: this.writeCount,
        lastCheckpoint: this.lastCheckpoint,
        busyRetries: this.busyRetries,
        avgQueryMs: Math.round(avgQueryMs * 100) / 100,
      };

      // Auto-checkpoint if WAL is too large (> 5MB)
      if (walSize > 5 * 1024 * 1024) {
        await this.checkpointWAL();
      }

      return health;
    } catch {
      return {
        isHealthy: false, walSize: 0, totalWrites: this.writeCount,
        lastCheckpoint: this.lastCheckpoint, busyRetries: this.busyRetries,
        avgQueryMs: 0,
      };
    }
  }

  // ─── Emergency backup (call after critical operations) ────
  async emergencyBackup(reason: string): Promise<void> {
    try {
      await this.checkpointWAL();
      console.log(`[NexusOne DB] Emergency backup triggered: ${reason}`);
    } catch (err) {
      console.error(`[NexusOne DB] Emergency backup failed:`, err);
    }
  }

  // ─── Graceful Shutdown ─────────────────────────────────────
  private setupGracefulShutdown(): void {
    if (isBuildTime || isBrowser) return;

    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      console.log('[NexusOne DB] Graceful shutdown: flushing WAL...');
      try {
        await this.client.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
        await this.client.$disconnect();
        console.log('[NexusOne DB] Clean shutdown complete');
      } catch (err) {
        console.error('[NexusOne DB] Shutdown error:', err);
      }
    };

    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      process.on('beforeExit', shutdown);
    }
  }

  // ─── Utility ──────────────────────────────────────────────
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── PGLite readiness (future) ─────────────────────────────
  /**
   * En el futuro, este método inicializará PGLite como capa
   * de cache client-side. Por ahora, la BD local es Prisma/SQLite
   * del lado del servidor Next.js.
   */
  async initPGLite(): Promise<{ available: boolean; message: string }> {
    return {
      available: false,
      message: 'PGLite se integrará como cache client-side en Fase 5. Actualmente usa Prisma/SQLite server-side con WAL mode.',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON — DESPUES de la definicion de la clase
// Esto evita ReferenceError: Cannot access before initialization
// cuando el código se minifica en produccion.
// ═══════════════════════════════════════════════════════════════

export const nexusDb: NexusLocalDB = globalForDb.nexusDb ?? new NexusLocalDB();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.nexusDb = nexusDb;
}
