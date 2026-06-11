export type MysqlSslConfig = {
  rejectUnauthorized: boolean;
};

function sslModeFromUrl(databaseUrl: string) {
  try {
    return new URL(databaseUrl).searchParams.get("ssl-mode")?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export function isMysqlSslEnabled(databaseUrl: string) {
  if (process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "required") {
    return true;
  }
  const sslMode = sslModeFromUrl(databaseUrl);
  return sslMode === "REQUIRED" || sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY";
}

/**
 * Managed providers such as Aiven require TLS but often use a chain that Node
 * does not trust unless their CA bundle is installed. For `ssl-mode=REQUIRED`
 * we default to `rejectUnauthorized: false` unless explicitly overridden.
 */
export function mysqlSslOptions(databaseUrl: string): MysqlSslConfig | undefined {
  if (!isMysqlSslEnabled(databaseUrl)) return undefined;

  const sslMode = sslModeFromUrl(databaseUrl);
  const rejectEnv = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;

  if (rejectEnv === "false") {
    return { rejectUnauthorized: false };
  }

  // Aiven and similar managed MySQL use TLS with a chain Node won't verify
  // unless the provider CA bundle is installed. Prefer a working connection.
  if (sslMode === "REQUIRED") {
    return { rejectUnauthorized: false };
  }

  if (rejectEnv === "true") {
    return { rejectUnauthorized: true };
  }

  return { rejectUnauthorized: true };
}
