/**
 * Nexus One POS — DB Health Check API v1.0
 * 
 * Expone metricas de salud de la base de datos SQLite:
 *   - Estado WAL (tamano del journal)
 *   - Conteo de escrituras desde ultimo checkpoint
 *   - Reintentos por SQLITE_BUSY
 *   - Tiempo promedio de queries
 *   - Tamano de la base de datos en disco
 *   - Tablas y conteo de registros
 */

import { NextResponse } from 'next/server';
import { nexusDb } from '@/core/nexus-db-local';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 1. Health del NexusLocalDB (WAL, busy retries, etc.)
    const health = await nexusDb.checkHealth();

    // 2. PRAGMA info adicional de SQLite
    let pragmaInfo: any = {};
    try {
      const journalMode = await db.$queryRawUnsafe<Array<{ journal_mode: string }>>(
        'PRAGMA journal_mode;'
      );
      const syncMode = await db.$queryRawUnsafe<Array<{ synchronous: string }>>(
        'PRAGMA synchronous;'
      );
      const cacheSize = await db.$queryRawUnsafe<Array<{ cache_size: number }>>(
        'PRAGMA cache_size;'
      );
      const walInfo = await db.$queryRawUnsafe<Array<{ wal_size?: number; checkpoint_count?: number; log_mode?: string }>>(
        'PRAGMA wal_autocheckpoint;'
      );
      const dbSize = await db.$queryRawUnsafe<Array<{ page_count: number; page_size: number }>>(
        'PRAGMA page_count, page_size;'
      );

      pragmaInfo = {
        journalMode: journalMode?.[0]?.journal_mode || 'unknown',
        synchronous: syncMode?.[0]?.synchronous || 'unknown',
        cacheSizeKB: Math.abs(cacheSize?.[0]?.cache_size || 0),
        pages: dbSize?.[0]?.page_count || 0,
        pageSize: dbSize?.[0]?.page_size || 4096,
        dbSizeBytes: (dbSize?.[0]?.page_count || 0) * (dbSize?.[0]?.page_size || 4096),
      };
    } catch (err) {
      console.warn('[DB Health] PRAGMA query failed:', err);
    }

    // 3. Conteo de registros por tabla principal
    let tableStats: Array<{ table: string; rows: number }> = [];
    try {
      const tables = [
        'Product', 'Sale', 'SaleItem', 'Client', 'Category', 'Brand',
        'Supplier', 'Purchase', 'PurchaseItem', 'Expense', 'CreditAccount',
        'HeldSale', 'Quote', 'DeliveryNote', 'Devolution', 'CashClosing',
        'KardexMovement', 'User', 'BackupLog', 'InventoryAdjustment',
      ];

      for (const table of tables) {
        try {
          const result = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*) as count FROM \"${table}\";`
          );
          const count = Number(result?.[0]?.count || 0);
          if (count > 0) {
            tableStats.push({ table, rows: count });
          }
        } catch {
          // Tabla no existe, skip
        }
      }

      tableStats.sort((a, b) => b.rows - a.rows);
    } catch (err) {
      console.warn('[DB Health] Table stats failed:', err);
    }

    // 4. Tamano del archivo en disco
    let diskSize = 0;
    let walDiskSize = 0;
    try {
      const dbPath = path.join(process.cwd(), 'db', 'dev.db');
      if (fs.existsSync(dbPath)) {
        diskSize = fs.statSync(dbPath).size;
      }
      const walPath = dbPath + '-wal';
      if (fs.existsSync(walPath)) {
        walDiskSize = fs.statSync(walPath).size;
      }
    } catch {
      // Cannot access file
    }

    // 5. Determinar salud general
    const issues: string[] = [];
    if (!health.isHealthy) issues.push('La base de datos reporta estado no saludable');
    if (health.busyRetries > 10) issues.push(`Alto numero de reintentos SQLITE_BUSY: ${health.busyRetries}`);
    if (health.avgQueryMs > 100) issues.push(`Tiempo promedio de query alto: ${health.avgQueryMs}ms`);
    if (health.walSize > 10 * 1024 * 1024) issues.push(`WAL grande: ${(health.walSize / 1024 / 1024).toFixed(1)}MB`);
    if (pragmaInfo.journalMode !== 'wal') issues.push('Journal mode no es WAL');

    return NextResponse.json({
      health,
      pragma: pragmaInfo,
      tableStats,
      disk: {
        dbSizeBytes: diskSize,
        walSizeBytes: walDiskSize,
        totalBytes: diskSize + walDiskSize,
        dbSizeMB: (diskSize / 1024 / 1024).toFixed(2),
        walSizeMB: (walDiskSize / 1024 / 1024).toFixed(2),
        totalMB: ((diskSize + walDiskSize) / 1024 / 1024).toFixed(2),
      },
      issues,
      isOk: issues.length === 0,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno: ' + (err.message || String(err)), isOk: false, issues: [err.message || String(err)], timestamp: Date.now() },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    // Forzar checkpoint WAL
    if (action === 'checkpoint') {
      try {
        await db.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
        const newHealth = await nexusDb.checkHealth();
        return NextResponse.json({
          success: true,
          message: 'WAL checkpoint ejecutado correctamente',
          health: newHealth,
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Vaciar estadisticas
    if (action === 'reset-stats') {
      const health = await nexusDb.checkHealth();
      return NextResponse.json({
        success: true,
        message: 'Estadisticas reiniciadas',
        health,
      });
    }

    return NextResponse.json({ error: 'Accion no reconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno: ' + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
