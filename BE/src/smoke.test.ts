import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import { loadEnv } from "./config/env.js";
import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import type { FastifyInstance } from "fastify";

describe("smoke: health + auth + me", () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    const env = loadEnv();
    app = await buildApp(env);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("GET /api/v1/health", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe("ok");
  });

  it("POST /api/v1/auth/login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "ani@masarif.local",
        password: "Password123!",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    accessToken = body.data.accessToken;
  });

  it("GET /api/v1/me", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.email).toBe("ani@masarif.local");
    expect(body.data.role).toBe("EMPLOYEE");
  });
});
