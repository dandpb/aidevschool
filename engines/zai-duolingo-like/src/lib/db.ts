import { PrismaClient, type Prisma } from '@prisma/client'

// A client that works both as the global PrismaClient and as an interactive
// transaction client, so deep modules can accept `tx` from $transaction.
export type DbClient = Prisma.TransactionClient

// The cache key is versioned so that schema changes (new models) force a fresh
// PrismaClient instance during development HMR — otherwise globalThis holds a
// stale client missing the new models.
const PRISMA_CACHE_KEY = 'prisma_v2'

const globalForPrisma = globalThis as unknown as {
  [key: string]: PrismaClient | undefined
}

export const db =
  globalForPrisma[PRISMA_CACHE_KEY] ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma[PRISMA_CACHE_KEY] = db
}
