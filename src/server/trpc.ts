import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { resolveLocalUser } from "@/server/db/users";
import { assertSensitiveRateLimit } from "@/server/platform/rate-limit";
import type { SensitiveAction } from "@/server/domain/types";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  const user = await resolveLocalUser(ctx.auth.userId);
  return next({ ctx: { ...ctx, user } });
});

function requireActiveUser(action: SensitiveAction) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.auth.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }
    const user = await resolveLocalUser(ctx.auth.userId);
    if (user.deletedAt || user.suspendedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This account cannot perform marketplace actions",
      });
    }
    try {
      await assertSensitiveRateLimit(action, {
        userId: user.id,
        ipAddress: ctx.ipAddress,
      });
    } catch (error) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message:
          error instanceof Error ? error.message : "Too many requests. Try again later.",
      });
    }
    return next({ ctx: { ...ctx, user } });
  });
}

function requireRole(roles: Array<"moderator" | "admin">) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.auth.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }
    const user = await resolveLocalUser(ctx.auth.userId);
    if (!roles.includes(user.role as "moderator" | "admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    return next({ ctx: { ...ctx, user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const activeUserAction = (action: SensitiveAction) =>
  t.procedure.use(requireActiveUser(action));
export const staffQuery = t.procedure.use(requireRole(["moderator", "admin"]));
export const adminQuery = t.procedure.use(requireRole(["admin"]));
