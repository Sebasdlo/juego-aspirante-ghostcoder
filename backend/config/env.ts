export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),

  // DB
  DATABASE_URL: process.env.DATABASE_URL ?? "",

  // IA
  AI_PROVIDER: process.env.AI_PROVIDER ?? "mock",
  AI_API_KEY: process.env.AI_API_KEY ?? "",
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS ?? 15000),

  // Ops
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 60),
};
