import { relations } from "drizzle-orm";
import {
  books,
  conversations,
  favorites,
  listingImages,
  messages,
  notifications,
  reviews,
  transactions,
  transactionEvents,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  favorites: many(favorites),
  notifications: many(notifications),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  owner: one(users, { fields: [books.ownerId], references: [users.id] }),
  images: many(listingImages),
  transactions: many(transactions),
  favorites: many(favorites),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  book: one(books, { fields: [listingImages.bookId], references: [books.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  book: one(books, { fields: [transactions.bookId], references: [books.id] }),
  requester: one(users, {
    fields: [transactions.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  owner: one(users, {
    fields: [transactions.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  offeredBook: one(books, {
    fields: [transactions.offeredBookId],
    references: [books.id],
    relationName: "offeredBook",
  }),
  events: many(transactionEvents),
}));

export const transactionEventsRelations = relations(transactionEvents, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionEvents.transactionId],
    references: [transactions.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  book: one(books, { fields: [conversations.bookId], references: [books.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  book: one(books, { fields: [favorites.bookId], references: [books.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: "reviewee",
  }),
  transaction: one(transactions, {
    fields: [reviews.transactionId],
    references: [transactions.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
