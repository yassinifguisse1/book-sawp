import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { mysqlSslOptions } from "./src/server/db/mysql-ssl";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

function mysqlCredentials() {
  const url = new URL(process.env.DATABASE_URL!);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: mysqlSslOptions(process.env.DATABASE_URL!),
  };
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "mysql",
  dbCredentials: mysqlCredentials(),
});
