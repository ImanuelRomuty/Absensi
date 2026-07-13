import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  LOG_LEVEL: z.string().default("info"),
  /** Comma-separated browser origins allowed for CORS (e.g. https://app.vercel.app). Empty = reflect request origin (dev). */
  WEB_ORIGIN: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(details)}`);
  }
  return parsed.data;
}
