import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { JwtAccessPayload } from "../types/auth.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtAccessPayload;
    user: JwtAccessPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app, opts: { env: Env }) => {
  await app.register(fjwt, {
    secret: opts.env.JWT_ACCESS_SECRET,
    sign: { expiresIn: opts.env.JWT_ACCESS_EXPIRES_IN },
  });

  app.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or missing access token");
    }
  });
});
