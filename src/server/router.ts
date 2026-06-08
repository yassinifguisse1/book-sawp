import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./trpc";
import { bookRouter } from "./routers/book";
import { transactionRouter } from "./routers/transaction";
import { messageRouter } from "./routers/message";
import { favoriteRouter } from "./routers/favorite";
import { reviewRouter } from "./routers/review";
import { notificationRouter } from "./routers/notification";
import { moderationRouter } from "./routers/moderation";
import { profileRouter } from "./routers/profile";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  book: bookRouter,
  transaction: transactionRouter,
  message: messageRouter,
  favorite: favoriteRouter,
  review: reviewRouter,
  notification: notificationRouter,
  moderation: moderationRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
