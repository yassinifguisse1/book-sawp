function value(name: string) {
  return process.env[name] ?? "";
}

function enabled(name: string) {
  return value(name) === "true";
}

export const env = {
  get appUrl() {
    return value("APP_URL") || "http://localhost:3000";
  },
  get databaseUrl() {
    return value("DATABASE_URL");
  },
  get databaseDriver() {
    return value("DATABASE_DRIVER") || "mysql2";
  },
  get databaseSsl() {
    return enabled("DATABASE_SSL") || value("DATABASE_SSL") === "required";
  },
  get databaseSslRejectUnauthorized() {
    return value("DATABASE_SSL_REJECT_UNAUTHORIZED") !== "false";
  },
  get ownerClerkUserId() {
    return value("OWNER_CLERK_USER_ID");
  },
  get rateLimitBypass() {
    return enabled("RATE_LIMIT_BYPASS");
  },
  get anonymizationRetentionDays() {
    return Number(value("ANONYMIZATION_RETENTION_DAYS") || "30");
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
};
