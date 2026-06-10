import { and, asc, desc, eq, like, sql } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import { locations, moderationAuditLogs } from "@/server/db/schema";
import { formatLocationLabel } from "@/lib/location-format";

export type AdminLocationFilters = {
  query?: string;
  countryCode?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
};

function escapeLike(value: string) {
  return value.replace(/[!%_]/g, (match) => `!${match}`);
}

export async function listAdminLocations(filters: AdminLocationFilters) {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const conditions = [];

  if (filters.countryCode) {
    conditions.push(eq(locations.countryCode, filters.countryCode.toUpperCase()));
  }
  if (filters.activeOnly) {
    conditions.push(eq(locations.isActive, true));
  }
  if (filters.query && filters.query.trim().length >= 1) {
    const pattern = `${escapeLike(filters.query.trim().toLowerCase())}%`;
    conditions.push(
      sql`(${like(locations.normalizedCityName, sql`${pattern}`)} escape '!' or ${like(
        locations.asciiCityName,
        sql`${pattern}`,
      )} escape '!')`,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: locations.id,
        publicId: locations.publicId,
        placeType: locations.placeType,
        countryCode: locations.countryCode,
        regionCode: locations.regionCode,
        cityName: locations.cityName,
        population: locations.population,
        isActive: locations.isActive,
      })
      .from(locations)
      .where(where)
      .orderBy(desc(locations.population), asc(locations.cityName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(locations).where(where),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  return {
    rows: rows.map((row) => ({
      ...row,
      label: formatLocationLabel({
        cityName: row.cityName,
        regionCode: row.regionCode,
        countryCode: row.countryCode,
      }),
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function setLocationActive(input: {
  actorUserId: number;
  locationId: number;
  isActive: boolean;
}) {
  const db = getDb();
  const [current] = await db
    .select({ id: locations.id, isActive: locations.isActive })
    .from(locations)
    .where(eq(locations.id, input.locationId))
    .limit(1);
  if (!current) throw new Error("Location not found.");

  await db.transaction(async (tx) => {
    await tx
      .update(locations)
      .set({ isActive: input.isActive })
      .where(eq(locations.id, input.locationId));
    await tx.insert(moderationAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "taxonomy.location_active_updated",
      targetType: "location",
      targetId: input.locationId,
      metadata: { previousActive: current.isActive, nextActive: input.isActive },
    });
  });

  return { success: true };
}
