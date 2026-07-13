import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";
import {
  generateRefreshToken,
  hashToken,
  parseDurationToMs,
  verifyPassword,
} from "../../lib/crypto.js";
import type { Env } from "../../config/env.js";
import type { JwtAccessPayload } from "../../types/auth.js";
import type { FastifyInstance } from "fastify";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

async function issueTokens(
  app: FastifyInstance,
  env: Env,
  payload: JwtAccessPayload,
) {
  const accessToken = await app.jwt.sign(payload);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: payload.sub,
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

export const authRoutes = (env: Env): FastifyPluginAsync => {
  return async (app) => {
    app.post("/auth/login", async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
        include: { employee: true },
      });

      if (!user || !user.isActive) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const ok = await verifyPassword(body.password, user.passwordHash);
      if (!ok) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const payload: JwtAccessPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      };

      const tokens = await issueTokens(app, env, payload);

      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "AUTH_LOGIN",
          entityType: "User",
          entityId: user.id,
        },
      });

      return sendData(reply, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: "Bearer",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          employee: user.employee
            ? {
                id: user.employee.id,
                name: user.employee.name,
                employeeCode: user.employee.employeeCode,
                department: user.employee.department,
              }
            : null,
        },
      });
    });

    app.post("/auth/refresh", async (request, reply) => {
      const body = refreshBodySchema.parse(request.body);
      const tokenHash = hashToken(body.refreshToken);
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
      }

      if (!stored.user.isActive) {
        throw new AppError(401, "UNAUTHORIZED", "User is inactive");
      }

      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const payload: JwtAccessPayload = {
        sub: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
        employeeId: stored.user.employeeId,
      };

      const tokens = await issueTokens(app, env, payload);
      return sendData(reply, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: "Bearer",
      });
    });

    app.post(
      "/auth/logout",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        const body = refreshBodySchema.partial().parse(request.body ?? {});
        if (body.refreshToken) {
          const tokenHash = hashToken(body.refreshToken);
          await prisma.refreshToken.updateMany({
            where: { tokenHash, userId: request.user.sub, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        } else {
          await prisma.refreshToken.updateMany({
            where: { userId: request.user.sub, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        await prisma.auditLog.create({
          data: {
            actorUserId: request.user.sub,
            action: "AUTH_LOGOUT",
            entityType: "User",
            entityId: request.user.sub,
          },
        });

        return sendData(reply, { success: true });
      },
    );

    app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        include: {
          employee: {
            include: {
              locations: { include: { location: true } },
            },
          },
        },
      });

      if (!user) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      return sendData(reply, {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee
          ? {
              id: user.employee.id,
              name: user.employee.name,
              employeeCode: user.employee.employeeCode,
              department: user.employee.department,
              managerId: user.employee.managerId,
              locations: user.employee.locations.map((el) => ({
                id: el.location.id,
                name: el.location.name,
                latitude: el.location.latitude,
                longitude: el.location.longitude,
                radiusMeters: el.location.radiusMeters,
              })),
            }
          : null,
      });
    });
  };
};
