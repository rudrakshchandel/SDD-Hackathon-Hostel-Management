import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInitializationError: Error | null = null;

type PrismaPoolOptions = {
  connectionLimit?: number;
  poolTimeout?: number;
};

function getPoolOptions() {
  const connectionLimit = Number(process.env.PRISMA_CONNECTION_LIMIT || 5);
  const poolTimeout = Number(process.env.PRISMA_POOL_TIMEOUT || 10);
  return {
    connectionLimit: Number.isFinite(connectionLimit) && connectionLimit > 0 ? connectionLimit : 5,
    poolTimeout: Number.isFinite(poolTimeout) && poolTimeout > 0 ? poolTimeout : 10
  } satisfies Required<PrismaPoolOptions>;
}

export function buildPrismaDatasourceUrl(url: string, options?: PrismaPoolOptions) {
  try {
    const parsed = new URL(url);
    const pool = {
      ...getPoolOptions(),
      ...options
    };

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(pool.connectionLimit));
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", String(pool.poolTimeout));
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

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
    const configuredUrl = process.env.DATABASE_URL
      ? buildPrismaDatasourceUrl(process.env.DATABASE_URL)
      : undefined;

    return new PrismaClient({
      datasources: configuredUrl
        ? {
            db: {
              url: configuredUrl
            }
          }
        : undefined,
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
