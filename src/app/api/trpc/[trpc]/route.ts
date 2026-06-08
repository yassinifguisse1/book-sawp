import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";
import { createContext } from "@/server/context";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ path, error, ctx }) {
      console.error(
        "trpc.error",
        JSON.stringify({
          path,
          requestId: ctx?.requestId,
          code: error.code,
          message: error.message,
        }),
      );
    },
  });
}

export { handler as GET, handler as POST };
