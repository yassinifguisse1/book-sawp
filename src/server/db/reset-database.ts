import { config } from "dotenv";
import mysql from "mysql2/promise";

import { mysqlSslOptions } from "@/server/db/mysql-ssl";
import { clearListingSearchIndex } from "@/server/platform/search";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/** Production-style database names that must never be truncated by this script. */
const blockedDatabases = new Set(["defaultdb", "bookswap", "production"]);

function parseArgs() {
  const databaseArg = process.argv.find((arg) => arg.startsWith("--database="));
  const confirmArg = process.argv.find((arg) => arg.startsWith("--confirm="));
  const skipAlgolia = process.argv.includes("--skip-algolia");
  const algoliaIndexArg = process.argv.find((arg) => arg.startsWith("--algolia-index="));

  return {
    database: databaseArg?.split("=")[1]?.trim(),
    confirm: confirmArg?.split("=")[1]?.trim(),
    skipAlgolia,
    algoliaIndex: algoliaIndexArg?.split("=")[1]?.trim(),
  };
}

function connectionOptions(database: string): mysql.ConnectionOptions {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: mysqlSslOptions(databaseUrl),
  };
}

async function countRows(connection: mysql.Connection, tables: string[]) {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    counts[table] = Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
  }
  return counts;
}

async function main() {
  const { database, confirm, skipAlgolia, algoliaIndex } = parseArgs();
  if (!database || !confirm) {
    throw new Error(
      "Usage: npm run db:reset -- --database=bookswap_dev --confirm=bookswap_dev [--skip-algolia]",
    );
  }
  if (database !== confirm) {
    throw new Error("Confirmation failed: --confirm must exactly match --database");
  }
  if (blockedDatabases.has(database)) {
    throw new Error(
      `Refusing to reset protected database "${database}". For local dev, use bookswap_dev (see .env.example).`,
    );
  }

  const connection = await mysql.createConnection(connectionOptions(database));
  const [tablesResult] = await connection.query("SHOW TABLES");
  const tableRows = tablesResult as Array<Record<string, string>>;
  const tableKey = Object.keys(tableRows[0] ?? {})[0];
  const tables = tableKey ? tableRows.map((row) => row[tableKey]) : [];

  if (tables.length === 0) {
    console.log(`No tables found in ${database}.`);
    await connection.end();
    return;
  }

  const before = await countRows(connection, tables);
  const totalBefore = Object.values(before).reduce((sum, count) => sum + count, 0);
  console.log(`Resetting ${database} (${tables.length} tables, ${totalBefore} rows)...`);

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  const after = await countRows(connection, tables);
  const totalAfter = Object.values(after).reduce((sum, count) => sum + count, 0);
  await connection.end();

  console.log(`Database ${database} cleared. Remaining rows: ${totalAfter}`);

  if (!skipAlgolia) {
    const indexName = algoliaIndex ?? process.env.ALGOLIA_INDEX_NAME;
    if (indexName) {
      process.env.ALGOLIA_INDEX_NAME = indexName;
      await clearListingSearchIndex();
      console.log(`Algolia index cleared: ${indexName}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
