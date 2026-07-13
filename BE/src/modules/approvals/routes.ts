import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { ApprovalStatus, AttendanceType, Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";
import { attendanceFlags } from "../../lib/geofence.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(ApprovalStatus).optional(),
});

const decideBodySchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().max(500).optional(),
});

type CorrectionPayload = {
  employeeId: string;
  attendanceId: string | null;
  proposedType: AttendanceType;
  proposedRecordedAt: string;
  latitude: number | null;
  longitude: number | null;
};

export const approvalRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/approvals",
    {
      preHandler: [
        app.requireRoles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN),
      ],
    },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(request.user.role === Role.MANAGER
          ? {
              requester: {
                employee: {
                  OR: [
                    { managerId: request.user.employeeId ?? "__none__" },
                    { id: request.user.employeeId ?? "__none__" },
                  ],
                },
              },
            }
          : {}),
      };

      const [total, rows] = await Promise.all([
        prisma.approval.count({ where }),
        prisma.approval.findMany({
          where,
          include: {
            requester: {
              select: {
                id: true,
                email: true,
                role: true,
                employee: {
                  select: { id: true, name: true, employeeCode: true },
                },
              },
            },
            reviewer: {
              select: { id: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
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
    "/approvals/:id/decide",
    {
      preHandler: [
        app.requireRoles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN),
      ],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
      const body = decideBodySchema.parse(request.body);

      const approval = await prisma.approval.findUnique({
        where: { id },
        include: {
          requester: { include: { employee: true } },
        },
      });

      if (!approval) {
        throw new AppError(404, "NOT_FOUND", "Approval not found");
      }
      if (approval.status !== ApprovalStatus.PENDING) {
        throw new AppError(409, "ALREADY_DECIDED", "Approval already decided");
      }

      if (request.user.role === Role.MANAGER) {
        const emp = approval.requester.employee;
        if (
          !emp ||
          (emp.managerId !== request.user.employeeId &&
            emp.id !== request.user.employeeId)
        ) {
          throw new AppError(403, "FORBIDDEN", "Not allowed to decide this approval");
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.approval.update({
          where: { id },
          data: {
            status: body.decision,
            reviewerId: request.user.sub,
            decisionNote: body.decisionNote,
            decidedAt: new Date(),
          },
        });

        if (
          body.decision === "APPROVED" &&
          approval.type === "ATTENDANCE_CORRECTION"
        ) {
          const payload = approval.payload as CorrectionPayload;
          const recordedAt = new Date(payload.proposedRecordedAt);
          const flags = attendanceFlags(payload.proposedType, recordedAt);
          const idempotencyKey = `correction:${approval.id}`;

          if (payload.attendanceId) {
            await tx.attendance.update({
              where: { id: payload.attendanceId },
              data: {
                type: payload.proposedType,
                recordedAt,
                isLate: flags.isLate,
                isEarly: flags.isEarly,
                ...(payload.latitude != null ? { latitude: payload.latitude } : {}),
                ...(payload.longitude != null
                  ? { longitude: payload.longitude }
                  : {}),
              },
            });
          } else {
            await tx.attendance.create({
              data: {
                employeeId: payload.employeeId,
                type: payload.proposedType,
                latitude: payload.latitude ?? 0,
                longitude: payload.longitude ?? 0,
                idempotencyKey,
                isLate: flags.isLate,
                isEarly: flags.isEarly,
                recordedAt,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            actorUserId: request.user.sub,
            action: `APPROVAL_${body.decision}`,
            entityType: "Approval",
            entityId: id,
            meta: { decisionNote: body.decisionNote } as Prisma.InputJsonValue,
          },
        });

        return updated;
      });

      return sendData(reply, result);
    },
  );
};
