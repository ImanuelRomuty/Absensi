import type { FastifyPluginAsync } from "fastify";
import { sendData } from "../../lib/response.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_request, reply) => {
    return sendData(reply, {
      status: "ok",
      service: "masarif-be",
      timestamp: new Date().toISOString(),
    });
  });
};
