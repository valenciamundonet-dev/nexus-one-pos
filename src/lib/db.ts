/**
 * Nexus One POS — Conexión a BD con Resiliencia v1.0
 * 
 * Usa PrismaClient estándar con PRAGMAs de resiliencia
 * aplicados en el primer query. Ver resilient-db.ts para
 * la configuración completa de ACID/WAL.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Crear cliente con logging mínimo en producción
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Aplicar PRAGMAs de resiliencia al primer acceso
// WAL mode, synchronous FULL, busy timeout, etc.
let _pragmasApplied = false;
export async function ensureResilientDB(): Promise<void> {
  if (_pragmasApplied) return;
  try {
    const pragmas = [
      'PRAGMA journal_mode = WAL;',
      'PRAGMA synchronous = FULL;',
      'PRAGMA busy_timeout = 5000;',
      'PRAGMA wal_autocheckpoint = 1000;',
      'PRAGMA cache_size = -8000;',
      'PRAGMA temp_store = MEMORY;',
      'PRAGMA foreign_keys = ON;',
      'PRAGMA secure_delete = ON;',
    ];
    for (const p of pragmas) {
      await (db as any).$executeRawUnsafe(p);
    }
    _pragmasApplied = true;
    console.log('[Nexus One] PRAGMAs de resiliencia SQLite aplicados (WAL+FULL)');
  } catch (err) {
    console.warn('[Nexus One] Warning: PRAGMAs de resiliencia no aplicados:', err);
  }
}
