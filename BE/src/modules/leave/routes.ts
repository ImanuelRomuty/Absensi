import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import {
  ApprovalStatus,
  ApprovalType,
  LeaveRequestStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/response.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(LeaveRequestStatus).optional(),
  employeeId: z.string().cuid().optional(),
});

const submitBodySchema = z.object({
  leaveTypeId: z.string().cuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

function inclusiveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function requireEmployee(userId: string, employeeId: string | null) {
  if (!employeeId) {
    throw new AppError(400, "NO_EMPLOYEE_PROFILE", "User is not linked to an employee");
  }
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.isActive) {
    throw new AppError(400, "EMPLOYEE_INACTIVE", "Employee profile is inactive");
  }
  return employee;
}

const leaveInclude = {
  leaveType: { select: { id: true, code: true, name: true, paid: true } },
  employee: {
    select: { id: true, name: true, employeeCode: true, department: true },
  },
} as const;

export const leaveRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/leave/types",
    { preHandler: [app.authenticate] },
    async (_request, reply) => {
      const types = await prisma.leaveType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return sendData(reply, types);
    },
  );

  app.get(
    "/leave/balances/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const employee = await requireEmployee(request.user.sub, request.user.employeeId);
      const year = new Date().getUTCFullYear();
      const balances = await prisma.leaveBalance.findMany({
        where: { employeeId: employee.id, year },
        include: {
          leaveType: { select: { id: true, code: true, name: true, paid: true } },
        },
        orderBy: { leaveType: { name: "asc" } },
      });
      return sendData(reply, balances);
    },
  );

  app.get(
    "/leave/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const employee = await requireEmployee(request.user.sub, request.user.employeeId);
      const query = listQuerySchema.parse(request.query);
      const where = {
        employeeId: employee.id,
        ...(query.status ? { status: query.status } : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.findMany({
          where,
          include: leaveInclude,
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

  app.get(
    "/leave",
    {
      preHandler: [
        app.requireRoles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN),
      ],
    },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const where: Prisma.LeaveRequestWhereInput = {
        ...(query.status ? { status: query.status } : {}),
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
      };

      const [total, rows] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.findMany({
          where,
          include: leaveInclude,
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

  app.post("/leave", { preHandler: [app.authenticate] }, async (request, reply) => {
    const employee = await requireEmployee(request.user.sub, request.user.employeeId);
    const body = submitBodySchema.parse(request.body);
    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    if (endDate < startDate) {
      throw new AppError(400, "INVALID_RANGE", "endDate must be on or after startDate");
    }
    const days = inclusiveDays(startDate, endDate);
    if (days < 1 || days > 90) {
      throw new AppError(400, "INVALID_DAYS", "Leave duration must be 1–90 days");
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { id: body.leaveTypeId, isActive: true },
    });
    if (!leaveType) {
      throw new AppError(404, "LEAVE_TYPE_NOT_FOUND", "Leave type not found");
    }

    const year = startDate.getUTCFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year,
        },
      },
    });
    if (!balance || balance.remainingDays < days) {
      throw new AppError(
        400,
        "INSUFFICIENT_BALANCE",
        `Insufficient leave balance (need ${days}, have ${balance?.remainingDays ?? 0})`,
      );
    }

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new AppError(409, "OVERLAPPING_LEAVE", "Overlapping leave request exists");
    }

    const created = await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          startDate,
          endDate,
          days,
          reason: body.reason,
          status: LeaveRequestStatus.PENDING,
        },
      });

      const approval = await tx.approval.create({
        data: {
          type: ApprovalType.LEAVE,
          status: ApprovalStatus.PENDING,
          requesterId: request.user.sub,
          note: body.reason,
          entityType: "LeaveRequest",
          entityId: leave.id,
          payload: {
            leaveRequestId: leave.id,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            leaveTypeCode: leaveType.code,
            startDate: body.startDate,
            endDate: body.endDate,
            days,
          },
        },
      });

      return tx.leaveRequest.update({
        where: { id: leave.id },
        data: { approvalId: approval.id },
        include: leaveInclude,
      });
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: request.user.sub,
        action: "LEAVE_SUBMIT",
        entityType: "LeaveRequest",
        entityId: created.id,
        meta: { days, leaveTypeId: leaveType.id } as Prisma.InputJsonValue,
      },
    });

    return sendData(reply, created, 201);
  });

  app.post(
    "/leave/:id/cancel",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
      const employee = await requireEmployee(request.user.sub, request.user.employeeId);

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave || leave.employeeId !== employee.id) {
        throw new AppError(404, "NOT_FOUND", "Leave request not found");
      }
      if (leave.status !== LeaveRequestStatus.PENDING) {
        throw new AppError(409, "NOT_CANCELLABLE", "Only pending leave can be cancelled");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.leaveRequest.update({
          where: { id },
          data: { status: LeaveRequestStatus.CANCELLED },
          include: leaveInclude,
        });
        if (leave.approvalId) {
          await tx.approval.updateMany({
            where: { id: leave.approvalId, status: ApprovalStatus.PENDING },
            data: {
              status: ApprovalStatus.REJECTED,
              reviewerId: request.user.sub,
              decisionNote: "Cancelled by requester",
              decidedAt: new Date(),
            },
          });
        }
        await tx.auditLog.create({
          data: {
            actorUserId: request.user.sub,
            action: "LEAVE_CANCEL",
            entityType: "LeaveRequest",
            entityId: id,
          },
        });
        return next;
      });

      return sendData(reply, updated);
    },
  );
};
