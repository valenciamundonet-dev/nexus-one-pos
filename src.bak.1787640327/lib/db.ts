import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// En produccion TAMBIEN cacheamos en globalThis para evitar
// multiples instancias de PrismaClient que causan "database is locked" en SQLite.
export const db = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = db;
