import { PrismaClient } from "@prisma/client";

/**
 * Instance Prisma unique. En développement, Next.js recharge les modules à chaud :
 * on conserve le client sur globalThis pour ne pas épuiser le pool de connexions.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
