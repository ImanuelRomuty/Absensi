import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const createLocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(50_000).default(100),
});

const patchLocationSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().int().positive().max(50_000).optional(),
  isActive: z.boolean().optional(),
});

export const locationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/locations",
    {
      preHandler: [
        app.requireRoles(
          Role.EMPLOYEE,
          Role.MANAGER,
          Role.HR_ADMIN,
          Role.SUPER_ADMIN,
        ),
      ],
    },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const where =
        request.user.role === Role.HR_ADMIN || request.user.role === Role.SUPER_ADMIN
          ? {
              ...(query.activeOnly === undefined
                ? {}
                : { isActive: query.activeOnly }),
            }
          : { isActive: true };

      const [total, rows] = await Promise.all([
        prisma.location.count({ where }),
        prisma.location.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { name: "asc" },
        }),
      ]);

      return sendData(reply, rows, 200, {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      });
    },
  );

  app.post(
    "/locations",
    {
      preHandler: [app.requireRoles(Role.HR_ADMIN, Role.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const body = createLocationSchema.parse(request.body);
      const location = await prisma.location.create({
        data: {
          name: body.name,
          latitude: body.latitude,
          longitude: body.longitude,
          radiusMeters: body.radiusMeters,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: request.user.sub,
          action: "LOCATION_CREATE",
          entityType: "Location",
          entityId: location.id,
          meta: { name: location.name },
        },
      });

      return sendData(reply, location, 201);
    },
  );

  app.get(
    "/locations/:id",
    {
      preHandler: [
        app.requireRoles(
          Role.EMPLOYEE,
          Role.MANAGER,
          Role.HR_ADMIN,
          Role.SUPER_ADMIN,
        ),
      ],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
      const location = await prisma.location.findUnique({ where: { id } });
      if (!location) {
        throw new AppError(404, "NOT_FOUND", "Location not found");
      }
      if (
        !location.isActive &&
        request.user.role !== Role.HR_ADMIN &&
        request.user.role !== Role.SUPER_ADMIN
      ) {
        throw new AppError(404, "NOT_FOUND", "Location not found");
      }
      return sendData(reply, location);
    },
  );

  app.patch(
    "/locations/:id",
    {
      preHandler: [app.requireRoles(Role.HR_ADMIN, Role.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
      const body = patchLocationSchema.parse(request.body);

      const existing = await prisma.location.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Location not found");
      }

      const location = await prisma.location.update({
        where: { id },
        data: body,
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: request.user.sub,
          action: "LOCATION_UPDATE",
          entityType: "Location",
          entityId: id,
          meta: body,
        },
      });

      return sendData(reply, location);
    },
  );
};
