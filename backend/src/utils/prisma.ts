// Re-exports the canonical Prisma instance from the shared location.
// All modules (old + new) share ONE PrismaClient with ONE connection pool.
export { default } from '../shared/database/prisma';
