import EmbeddedPostgres from "embedded-postgres";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const databaseDir = resolve(process.cwd(), ".data/pg");
mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "masarif",
  password: "masarif",
  port: 5433,
  persistent: true,
});

await pg.initialise();
await pg.start();

try {
  await pg.createDatabase("masarif");
} catch {
  // already exists
}

console.log("Embedded Postgres running on port 5433");
console.log(
  "DATABASE_URL=postgresql://masarif:masarif@127.0.0.1:5433/masarif?schema=public",
);
console.log("Press Ctrl+C to stop");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
