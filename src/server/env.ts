import { isMysqlSslEnabled } from "@/server/db/mysql-ssl";

function value(name: string) {
  return process.env[name] ?? "";
}

function enabled(name: string) {
  return value(name) === "true";
}

function databaseNameFromUrl(databaseUrl: string) {
  try {
    const name = new URL(databaseUrl).pathname.replace(/^\//, "");
    return name || "bookswap";
  } catch {
    return "bookswap";
  }
}

export const env = {
  get appUrl() {
    return value("APP_URL") || "http://localhost:3000";
  },
  get databaseUrl() {
    return value("DATABASE_URL");
  },
  get cacheNamespace() {
    return value("CACHE_NAMESPACE") || databaseNameFromUrl(value("DATABASE_URL"));
  },
  get databaseDriver() {
    return value("DATABASE_DRIVER") || "mysql2";
  },
  get databaseSsl() {
    return isMysqlSslEnabled(value("DATABASE_URL"));
  },
  get databaseSslRejectUnauthorized() {
    const rejectEnv = value("DATABASE_SSL_REJECT_UNAUTHORIZED");
    if (rejectEnv === "true") return true;
    if (rejectEnv === "false") return false;
    try {
      const sslMode = new URL(value("DATABASE_URL")).searchParams
        .get("ssl-mode")
        ?.toUpperCase();
      return sslMode !== "REQUIRED";
    } catch {
      return true;
    }
  },
  get ownerClerkUserId() {
    return value("OWNER_CLERK_USER_ID");
  },
  get clerkWebhookSigningSecret() {
    return value("CLERK_WEBHOOK_SIGNING_SECRET");
  },
  get rateLimitBypass() {
    return enabled("RATE_LIMIT_BYPASS");
  },
  get anonymizationRetentionDays() {
    return Number(value("ANONYMIZATION_RETENTION_DAYS") || "30");
  },
  get phoneHmacKey() {
    return value("PHONE_HMAC_KEY");
  },
  get upstashRedisRestUrl() {
    return value("UPSTASH_REDIS_REST_URL");
  },
  get upstashRedisRestToken() {
    return value("UPSTASH_REDIS_REST_TOKEN");
  },
  get qstashToken() {
    return value("QSTASH_TOKEN");
  },
  get qstashCurrentSigningKey() {
    return value("QSTASH_CURRENT_SIGNING_KEY");
  },
  get qstashNextSigningKey() {
    return value("QSTASH_NEXT_SIGNING_KEY");
  },
  get algoliaAppId() {
    return value("ALGOLIA_APP_ID");
  },
  get algoliaAdminApiKey() {
    return value("ALGOLIA_ADMIN_API_KEY");
  },
  get algoliaSearchApiKey() {
    return value("NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY");
  },
  get algoliaIndexName() {
    return value("ALGOLIA_INDEX_NAME") || "bookswap_listings";
  },
  get ablyApiKey() {
    return value("ABLY_API_KEY");
  },
  get resendApiKey() {
    return value("RESEND_API_KEY");
  },
  get resendFromEmail() {
    return value("RESEND_FROM_EMAIL") || "BookSwap <notifications@example.com>";
  },
  get supportEmail() {
    return value("SUPPORT_EMAIL");
  },
};
