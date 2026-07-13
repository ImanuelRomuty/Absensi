import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { AttendanceType, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";
import { attendanceFlags, isInsideGeofence } from "../../lib/geofence.js";

const punchBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().optional(),
  idempotencyKey: z.string().min(8).max(128),
  recordedAt: z.string().datetime().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  employeeId: z.string().cuid().optional(),
});

const correctionBodySchema = z.object({
  attendanceId: z.string().cuid().optional(),
  proposedType: z.nativeEnum(AttendanceType),
  proposedRecordedAt: z.string().datetime(),
  note: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

async function requireEmployeeId(userId: string, employeeId: string | null) {
  if (!employeeId) {
    throw new AppError(400, "NO_EMPLOYEE_PROFILE", "User is not linked to an employee");
  }
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      locations: { include: { location: true } },
    },
  });
  if (!employee || !employee.isActive) {
    throw new AppError(400, "EMPLOYEE_INACTIVE", "Employee profile is inactive");
  }
  return employee;
}

async function punch(
  type: AttendanceType,
  user: { sub: string; employeeId: string | null },
  body: z.infer<typeof punchBodySchema>,
) {
  const existing = await prisma.attendance.findUnique({
    where: { idempotencyKey: body.idempotencyKey },
  });
  if (existing) {
    return existing;
  }

  const employee = await requireEmployeeId(user.sub, user.employeeId);
  const activeLocations = employee.locations
    .map((l) => l.location)
    .filter((loc) => loc.isActive);

  if (activeLocations.length === 0) {
    throw new AppError(400, "NO_LOCATION", "Employee has no assigned office location");
  }

  const matched = activeLocations.find((loc) =>
    isInsideGeofence({
      userLat: body.latitude,
      userLng: body.longitude,
      fenceLat: loc.latitude,
      fenceLng: loc.longitude,
      radiusMeters: loc.radiusMeters,
    }),
  );

  if (!matched) {
    throw new AppError(
      403,
      "OUTSIDE_GEOFENCE",
      "Clock punch rejected: outside assigned office geofence",
    );
  }

  const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
  const flags = attendanceFlags(type, recordedAt);

  const created = await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      type,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters,
      locationId: matched.id,
      idempotencyKey: body.idempotencyKey,
      isLate: flags.isLate,
      isEarly: flags.isEarly,
      recordedAt,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
      location: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.sub,
      action: type === AttendanceType.CLOCK_IN ? "ATTENDANCE_CLOCK_IN" : "ATTENDANCE_CLOCK_OUT",
      entityType: "Attendance",
      entityId: created.id,
      meta: { locationId: matched.id, idempotencyKey: body.idempotencyKey },
    },
  });

  return created;
}

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/attendance/clock-in",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = punchBodySchema.parse(request.body);
      const row = await punch(AttendanceType.CLOCK_IN, request.user, body);
      return sendData(reply, row, 201);
    },
  );

  app.post(
    "/attendance/clock-out",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = punchBodySchema.parse(request.body);
      const row = await punch(AttendanceType.CLOCK_OUT, request.user, body);
      return sendData(reply, row, 201);
    },
  );

  app.get(
    "/attendance/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      if (!request.user.employeeId) {
        throw new AppError(400, "NO_EMPLOYEE_PROFILE", "User is not linked to an employee");
      }

      const where = {
        employeeId: request.user.employeeId,
        ...(query.from || query.to
          ? {
              recordedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      };

      const [total, rows] = await Promise.all([
        prisma.attendance.count({ where }),
        prisma.attendance.findMany({
          where,
          include: {
            location: { select: { id: true, name: true } },
          },
          orderBy: { recordedAt: "desc" },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
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

  app.get(
    "/attendance",
    {
      preHandler: [
        app.requireRoles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN),
      ],
    },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);

      const where = {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(request.user.role === Role.MANAGER
          ? {
              employee: {
                OR: [
                  { managerId: request.user.employeeId ?? "__none__" },
                  { id: request.user.employeeId ?? "__none__" },
                ],
              },
            }
          : {}),
        ...(query.from || query.to
          ? {
              recordedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      };

      const [total, rows] = await Promise.all([
        prisma.attendance.count({ where }),
        prisma.attendance.findMany({
          where,
          include: {
            employee: {
              select: { id: true, name: true, employeeCode: true, department: true },
            },
            location: { select: { id: true, name: true } },
          },
          orderBy: { recordedAt: "desc" },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
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
    "/attendance/corrections",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = correctionBodySchema.parse(request.body);
      if (!request.user.employeeId) {
        throw new AppError(400, "NO_EMPLOYEE_PROFILE", "User is not linked to an employee");
      }

      if (body.attendanceId) {
        const att = await prisma.attendance.findUnique({
          where: { id: body.attendanceId },
        });
        if (!att || att.employeeId !== request.user.employeeId) {
          throw new AppError(404, "NOT_FOUND", "Attendance record not found");
        }
      }

      const approval = await prisma.approval.create({
        data: {
          type: "ATTENDANCE_CORRECTION",
          status: "PENDING",
          requesterId: request.user.sub,
          note: body.note,
          entityType: body.attendanceId ? "Attendance" : null,
          entityId: body.attendanceId ?? null,
          payload: {
            employeeId: request.user.employeeId,
            attendanceId: body.attendanceId ?? null,
            proposedType: body.proposedType,
            proposedRecordedAt: body.proposedRecordedAt,
            latitude: body.latitude ?? null,
            longitude: body.longitude ?? null,
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: request.user.sub,
          action: "APPROVAL_REQUEST",
          entityType: "Approval",
          entityId: approval.id,
          meta: { type: "ATTENDANCE_CORRECTION" },
        },
      });

      return sendData(reply, approval, 201);
    },
  );
};
