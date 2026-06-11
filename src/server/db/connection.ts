import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePlanetScale } from "drizzle-orm/planetscale-serverless";
import mysql from "mysql2/promise";
import { env } from "@/server/env";
import { mysqlSslOptions } from "@/server/db/mysql-ssl";
import * as schema from "./schema";
import * as relations from "./relations";

const fullSchema = { ...schema, ...relations };

const globalForDb = globalThis as typeof globalThis & {
  bookswapPool?: mysql.Pool;
};

function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  return env.databaseUrl;
}

function mysqlConnectionOptions(): mysql.PoolOptions {
  const url = new URL(requireDatabaseUrl());
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
    connectionLimit: 10,
    ssl: mysqlSslOptions(requireDatabaseUrl()),
  };
}

function createLocalDatabase() {
  const pool =
    globalForDb.bookswapPool ??
    mysql.createPool(mysqlConnectionOptions());

  if (process.env.NODE_ENV !== "production") {
    globalForDb.bookswapPool = pool;
  }

  return drizzleMysql(pool, {
    mode: "default",
    schema: fullSchema,
  });
}

export type Database = ReturnType<typeof createLocalDatabase>;

function createPlanetScaleDatabase() {
  return drizzlePlanetScale(requireDatabaseUrl(), {
    schema: fullSchema,
  }) as unknown as Database;
}

let database: Database | undefined;

export function getDb(): Database {
  database ??=
    env.databaseDriver === "planetscale"
      ? createPlanetScaleDatabase()
      : createLocalDatabase();
  return database;
}

export async function closeDb() {
  await globalForDb.bookswapPool?.end();
  globalForDb.bookswapPool = undefined;
  database = undefined;
}
