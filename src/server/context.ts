import { auth } from "@clerk/nextjs/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

function decodeHeader(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

export async function createContext({ req }: FetchCreateContextFnOptions) {
  return {
    auth: await auth(),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown",
    requestId: req.headers.get("x-vercel-id") ?? crypto.randomUUID(),
    geo: {
      countryCode: decodeHeader(req.headers.get("x-vercel-ip-country")),
      regionCode: decodeHeader(req.headers.get("x-vercel-ip-country-region")),
      city: decodeHeader(req.headers.get("x-vercel-ip-city")),
    },
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;
