import "dotenv/config";
import { loadEnv } from "./config/env.js";
import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
