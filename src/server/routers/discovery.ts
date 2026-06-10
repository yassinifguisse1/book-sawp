import { z } from "zod";

import { createRouter, publicQuery } from "@/server/trpc";
import { runDiscovery } from "@/server/domain/discovery";
import { assertPublicRateLimit } from "@/server/platform/rate-limit";

const transactionType = z.enum(["swap", "giveaway", "sale"]);
const condition = z.enum(["likenew", "verygood", "good", "fair", "poor"]);
const schoolType = z.enum(["public_school", "private_school", "not_applicable"]);
const deliveryMode = z.enum(["pickup", "ship", "both"]);
const sort = z.enum(["relevance", "recent", "price_asc", "price_desc", "distance"]);

const discoverInput = z.object({
  locationId: z.number().int().positive().optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  radiusKm: z.number().int().min(1).max(20000).nullable().optional(),
  includeDomesticShipping: z.boolean().default(true),
  includeInternationalShipping: z.boolean().default(false),
  search: z.string().trim().max(200).optional(),
  genre: z.string().trim().max(100).optional(),
  categorySlug: z.string().trim().max(120).optional(),
  transactionType: transactionType.optional(),
  condition: condition.optional(),
  educationLevel: z.string().trim().max(80).optional(),
  schoolType: schoolType.optional(),
  language: z.string().trim().max(50).optional(),
  deliveryMode: deliveryMode.optional(),
  localOnly: z.boolean().optional(),
  sameCountryOnly: z.boolean().optional(),
  sort: sort.default("relevance"),
  perGroupLimit: z.number().int().min(1).max(40).default(12),
});

export const discoveryRouter = createRouter({
  discover: publicQuery.input(discoverInput).query(async ({ ctx, input }) => {
    await assertPublicRateLimit("discovery.discover", `ip:${ctx.ipAddress}`, {
      requests: 120,
      window: "1 m",
    });

    return runDiscovery({
      locationId: input.locationId,
      countryCode: input.countryCode,
      radiusKm: input.radiusKm,
      includeDomesticShipping: input.includeDomesticShipping,
      includeInternationalShipping: input.includeInternationalShipping,
      sort: input.sort,
      perGroupLimit: input.perGroupLimit,
      filters: {
        search: input.search,
        genre: input.genre,
        categorySlug: input.categorySlug,
        transactionType: input.transactionType,
        condition: input.condition,
        educationLevel: input.educationLevel,
        schoolType: input.schoolType,
        language: input.language,
        deliveryMode: input.deliveryMode,
        localOnly: input.localOnly,
        sameCountryOnly: input.sameCountryOnly,
      },
    });
  }),
});
