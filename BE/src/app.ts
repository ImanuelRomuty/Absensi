import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import type { Env } from "./config/env.js";
import { isAppError } from "./lib/errors.js";
import { sendError } from "./lib/response.js";
import { authPlugin } from "./plugins/auth.js";
import { rbacPlugin } from "./plugins/rbac.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { employeeRoutes } from "./modules/employees/routes.js";
import { locationRoutes } from "./modules/locations/routes.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  const allowedOrigins = env.WEB_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    credentials: true,
  });
  await app.register(authPlugin, { env });
  await app.register(rbacPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return sendError(reply, 400, "VALIDATION_ERROR", "Invalid request", error.flatten());
    }
    if (isAppError(error)) {
      return sendError(reply, error.statusCode, error.code, error.message, error.details);
    }
    app.log.error(error);
    return sendError(reply, 500, "INTERNAL_ERROR", "Internal server error");
  });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes(env));
      await api.register(employeeRoutes);
      await api.register(locationRoutes);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
