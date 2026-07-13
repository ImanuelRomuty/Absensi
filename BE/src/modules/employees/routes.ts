import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";
import { hashPassword } from "../../lib/crypto.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
});

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  employeeCode: z.string().min(1),
  department: z.string().optional(),
  managerId: z.string().cuid().nullable().optional(),
  locationIds: z.array(z.string().cuid()).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional(),
});

const patchEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
  locationIds: z.array(z.string().cuid()).optional(),
});

function employeeSelect() {
  return {
    id: true,
    name: true,
    employeeCode: true,
    department: true,
    managerId: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    locations: {
      include: {
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
            isActive: true,
          },
        },
      },
    },
    user: {
      select: { id: true, email: true, role: true, isActive: true },
    },
  } as const;
}

export const employeeRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/employees",
    {
      preHandler: [
        app.requireRoles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN),
      ],
    },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const where =
        request.user.role === Role.MANAGER
          ? {
              OR: [
                { managerId: request.user.employeeId ?? "__none__" },
                { id: request.user.employeeId ?? "__none__" },
              ],
              ...(query.q
                ? {
                    AND: [
                      {
                        OR: [
                          { name: { contains: query.q, mode: "insensitive" as const } },
                          {
                            employeeCode: {
                              contains: query.q,
                              mode: "insensitive" as const,
                            },
                          },
                        ],
                      },
                    ],
                  }
                : {}),
            }
          : {
              ...(query.q
                ? {
                    OR: [
                      { name: { contains: query.q, mode: "insensitive" as const } },
                      {
                        employeeCode: {
                          contains: query.q,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  }
                : {}),
            };

      const [total, rows] = await Promise.all([
        prisma.employee.count({ where }),
        prisma.employee.findMany({
          where,
          select: employeeSelect(),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { name: "asc" },
        }),
      ]);

      return sendData(
        reply,
        rows.map((row) => ({
          ...row,
          locations: row.locations.map((l) => l.location),
        })),
        200,
        {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit) || 1,
        },
      );
    },
  );

  app.post(
    "/employees",
    {
      preHandler: [app.requireRoles(Role.HR_ADMIN, Role.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const body = createEmployeeSchema.parse(request.body);

      if ((body.email && !body.password) || (!body.email && body.password)) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "email and password must be provided together to create a login",
        );
      }

      if (body.managerId) {
        const manager = await prisma.employee.findUnique({
          where: { id: body.managerId },
        });
        if (!manager) {
          throw new AppError(400, "INVALID_MANAGER", "managerId not found");
        }
      }

      if (body.locationIds?.length) {
        const count = await prisma.location.count({
          where: { id: { in: body.locationIds }, isActive: true },
        });
        if (count !== body.locationIds.length) {
          throw new AppError(400, "INVALID_LOCATION", "One or more locationIds are invalid");
        }
      }

      const employee = await prisma.$transaction(async (tx) => {
        const created = await tx.employee.create({
          data: {
            name: body.name,
            employeeCode: body.employeeCode,
            department: body.department,
            managerId: body.managerId ?? null,
            locations: body.locationIds?.length
              ? {
                  create: body.locationIds.map((locationId) => ({ locationId })),
                }
              : undefined,
          },
          select: employeeSelect(),
        });

        if (body.email && body.password) {
          await tx.user.create({
            data: {
              email: body.email.toLowerCase(),
              passwordHash: await hashPassword(body.password),
              role: body.role ?? Role.EMPLOYEE,
              employeeId: created.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: request.user.sub,
            action: "EMPLOYEE_CREATE",
            entityType: "Employee",
            entityId: created.id,
            meta: { employeeCode: body.employeeCode },
          },
        });

        return tx.employee.findUniqueOrThrow({
          where: { id: created.id },
          select: employeeSelect(),
        });
      });

      return sendData(
        reply,
        {
          ...employee,
          locations: employee.locations.map((l) => l.location),
        },
        201,
      );
    },
  );

  app.get(
    "/employees/:id",
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
      const employee = await prisma.employee.findUnique({
        where: { id },
        select: employeeSelect(),
      });

      if (!employee) {
        throw new AppError(404, "NOT_FOUND", "Employee not found");
      }

      const role = request.user.role;
      if (role === Role.EMPLOYEE && request.user.employeeId !== id) {
        throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
      }
      if (
        role === Role.MANAGER &&
        request.user.employeeId !== id &&
        employee.managerId !== request.user.employeeId
      ) {
        throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
      }

      return sendData(reply, {
        ...employee,
        locations: employee.locations.map((l) => l.location),
      });
    },
  );

  app.patch(
    "/employees/:id",
    {
      preHandler: [app.requireRoles(Role.HR_ADMIN, Role.SUPER_ADMIN)],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
      const body = patchEmployeeSchema.parse(request.body);

      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Employee not found");
      }

      if (body.managerId) {
        const manager = await prisma.employee.findUnique({
          where: { id: body.managerId },
        });
        if (!manager) {
          throw new AppError(400, "INVALID_MANAGER", "managerId not found");
        }
      }

      if (body.locationIds) {
        const count = await prisma.location.count({
          where: { id: { in: body.locationIds }, isActive: true },
        });
        if (count !== body.locationIds.length) {
          throw new AppError(400, "INVALID_LOCATION", "One or more locationIds are invalid");
        }
      }

      const employee = await prisma.$transaction(async (tx) => {
        if (body.locationIds) {
          await tx.employeeLocation.deleteMany({ where: { employeeId: id } });
          if (body.locationIds.length) {
            await tx.employeeLocation.createMany({
              data: body.locationIds.map((locationId) => ({
                employeeId: id,
                locationId,
              })),
            });
          }
        }

        const updated = await tx.employee.update({
          where: { id },
          data: {
            name: body.name,
            department: body.department === undefined ? undefined : body.department,
            managerId: body.managerId === undefined ? undefined : body.managerId,
            isActive: body.isActive,
          },
          select: employeeSelect(),
        });

        await tx.auditLog.create({
          data: {
            actorUserId: request.user.sub,
            action: "EMPLOYEE_UPDATE",
            entityType: "Employee",
            entityId: id,
            meta: body,
          },
        });

        return updated;
      });

      return sendData(reply, {
        ...employee,
        locations: employee.locations.map((l) => l.location),
      });
    },
  );
};
