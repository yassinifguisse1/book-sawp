import { createRouter, authedQuery } from "./trpc";
import { refreshLocalUser } from "./db/users";

export const authRouter = createRouter({
  me: authedQuery.query(({ ctx }) => refreshLocalUser(ctx.user.clerkUserId)),
});
