import fp from "fastify-plugin";
import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { AppError } from "../lib/errors.js";
import { hasAnyRole } from "../types/auth.js";

declare module "fastify" {
  interface FastifyInstance {
    requireRoles: (...roles: Role[]) => preHandlerHookHandler;
  }
}

export const rbacPlugin = fp(async (app) => {
  app.decorate("requireRoles", (...roles: Role[]): preHandlerHookHandler => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      await app.authenticate(request, _reply);
      const user = request.user;
      if (!user || !hasAnyRole(user.role, roles)) {
        throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
      }
    };
  });
});
