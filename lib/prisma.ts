import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInitializationError: Error | null = null;

function createUnavailablePrismaProxy(error: Error) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          `Prisma client is not ready: ${error.message}. Run "npx prisma generate" and ensure DATABASE_URL is set.`
        );
      }
    }
  ) as PrismaClient;
}

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: ["warn", "error"]
    });
  } catch (error) {
    prismaInitializationError =
      error instanceof Error
        ? error
        : new Error("Prisma client failed to initialize");
    return createUnavailablePrismaProxy(prismaInitializationError);
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getPrismaInitializationError() {
  return prismaInitializationError;
}
