import { auth } from "@clerk/nextjs/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  return {
    auth: await auth(),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown",
    requestId: req.headers.get("x-vercel-id") ?? crypto.randomUUID(),
  };
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;
