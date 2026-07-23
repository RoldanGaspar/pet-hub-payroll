import { PrismaClient, Prisma } from '@prisma/client';

export type TxClient = PrismaClient | Prisma.TransactionClient;
