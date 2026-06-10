import { algoliasearch } from "algoliasearch";
import { env } from "@/server/env";

export type SearchListingRecord = {
  objectID: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string;
  condition: string;
  mode: string;
  language: string | null;
  country: string;
  city: string;
  currency: string;
  priceMinor: number | null;
  createdAt: number;
};

export async function indexListing(record: SearchListingRecord) {
  if (!env.algoliaAppId || !env.algoliaAdminApiKey) {
    return;
  }

  const client = algoliasearch(env.algoliaAppId, env.algoliaAdminApiKey);
  await client.saveObjects({
    indexName: env.algoliaIndexName,
    objects: [record],
  });
}

export async function clearListingSearchIndex() {
  if (!env.algoliaAppId || !env.algoliaAdminApiKey) {
    return;
  }

  const client = algoliasearch(env.algoliaAppId, env.algoliaAdminApiKey);
  const indexes = [
    env.algoliaIndexName,
    `${env.algoliaIndexName}_recent`,
    `${env.algoliaIndexName}_price_asc`,
    `${env.algoliaIndexName}_price_desc`,
  ];

  await Promise.all(
    indexes.map((indexName) =>
      client.clearObjects({ indexName }).catch((error) => {
        console.error(`Failed to clear Algolia index ${indexName}`, error);
        return undefined;
      }),
    ),
  );
}

export async function removeListingFromIndex(objectID: string) {
  if (!env.algoliaAppId || !env.algoliaAdminApiKey) {
    return;
  }

  const client = algoliasearch(env.algoliaAppId, env.algoliaAdminApiKey);
  await client.deleteObject({
    indexName: env.algoliaIndexName,
    objectID,
  });
}

function filterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function findListingPublicIds(input: {
  query: string;
  genre?: string;
  condition?: string;
  mode?: string;
  country?: string;
  city?: string;
  sort?: "newest" | "price-low" | "price-high";
  limit?: number;
  offset?: number;
}) {
  const apiKey = env.algoliaSearchApiKey || env.algoliaAdminApiKey;
  if (!env.algoliaAppId || !apiKey) return null;

  const filters = [
    input.genre ? `genre:"${filterValue(input.genre)}"` : "",
    input.condition ? `condition:"${filterValue(input.condition)}"` : "",
    input.mode ? `mode:"${filterValue(input.mode)}"` : "",
    input.country ? `country:"${filterValue(input.country)}"` : "",
    input.city ? `city:"${filterValue(input.city)}"` : "",
  ].filter(Boolean);
  const indexName =
    input.sort === "price-low"
      ? `${env.algoliaIndexName}_price_asc`
      : input.sort === "price-high"
        ? `${env.algoliaIndexName}_price_desc`
        : `${env.algoliaIndexName}_recent`;

  try {
    const client = algoliasearch(env.algoliaAppId, apiKey);
    const response = await client.searchForHits<{ objectID: string }>({
      requests: [
        {
          indexName,
          query: input.query,
          filters: filters.join(" AND ") || undefined,
          hitsPerPage: input.limit ?? 60,
          page: Math.floor((input.offset ?? 0) / (input.limit ?? 60)),
        },
      ],
    });
    return response.results[0]?.hits.map((hit) => hit.objectID) ?? [];
  } catch {
    return null;
  }
}

export async function configureListingSearch() {
  if (!env.algoliaAppId || !env.algoliaAdminApiKey) {
    throw new Error("ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY are required");
  }
  const client = algoliasearch(env.algoliaAppId, env.algoliaAdminApiKey);
  await client.setSettings({
    indexName: env.algoliaIndexName,
    indexSettings: {
      searchableAttributes: ["title", "author", "isbn", "genre"],
      attributesForFaceting: [
        "genre",
        "condition",
        "mode",
        "language",
        "country",
        "city",
        "currency",
      ],
      replicas: [
        `${env.algoliaIndexName}_recent`,
        `${env.algoliaIndexName}_price_asc`,
        `${env.algoliaIndexName}_price_desc`,
      ],
    },
  });
  await Promise.all([
    client.setSettings({
      indexName: `${env.algoliaIndexName}_recent`,
      indexSettings: { customRanking: ["desc(createdAt)"] },
    }),
    client.setSettings({
      indexName: `${env.algoliaIndexName}_price_asc`,
      indexSettings: { customRanking: ["asc(priceMinor)"] },
    }),
    client.setSettings({
      indexName: `${env.algoliaIndexName}_price_desc`,
      indexSettings: { customRanking: ["desc(priceMinor)"] },
    }),
  ]);
}
