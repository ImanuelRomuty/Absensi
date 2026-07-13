import type { FastifyReply } from "fastify";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function sendData<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
) {
  return reply.status(statusCode).send(meta ? { data, meta } : { data });
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return reply.status(statusCode).send({
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}
