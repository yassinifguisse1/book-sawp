import { relations } from "drizzle-orm";
import {
  books,
  adminInvitations,
  categories,
  conversations,
  favorites,
  listingImages,
  listingShippingDestinations,
  locations,
  locationAliases,
  messages,
  notifications,
  reviews,
  transactions,
  transactionEvents,
  userBrowsePreferences,
  userProfileLocations,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  favorites: many(favorites),
  notifications: many(notifications),
  adminInvitations: many(adminInvitations),
}));

export const adminInvitationsRelations = relations(adminInvitations, ({ one }) => ({
  inviter: one(users, {
    fields: [adminInvitations.invitedByUserId],
    references: [users.id],
    relationName: "inviter",
  }),
  acceptedBy: one(users, {
    fields: [adminInvitations.acceptedByUserId],
    references: [users.id],
    relationName: "acceptedBy",
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  books: many(books),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  owner: one(users, { fields: [books.ownerId], references: [users.id] }),
  category: one(categories, { fields: [books.categoryId], references: [categories.id] }),
  location: one(locations, { fields: [books.locationId], references: [locations.id] }),
  images: many(listingImages),
  shippingDestinations: many(listingShippingDestinations),
  transactions: many(transactions),
  favorites: many(favorites),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  books: many(books),
  aliases: many(locationAliases),
}));

export const locationAliasesRelations = relations(locationAliases, ({ one }) => ({
  location: one(locations, {
    fields: [locationAliases.locationId],
    references: [locations.id],
  }),
}));

export const listingShippingDestinationsRelations = relations(
  listingShippingDestinations,
  ({ one }) => ({
    listing: one(books, {
      fields: [listingShippingDestinations.listingId],
      references: [books.id],
    }),
  }),
);

export const userProfileLocationsRelations = relations(userProfileLocations, ({ one }) => ({
  user: one(users, { fields: [userProfileLocations.userId], references: [users.id] }),
  homeLocation: one(locations, {
    fields: [userProfileLocations.homeLocationId],
    references: [locations.id],
  }),
}));

export const userBrowsePreferencesRelations = relations(userBrowsePreferences, ({ one }) => ({
  user: one(users, { fields: [userBrowsePreferences.userId], references: [users.id] }),
  browseLocation: one(locations, {
    fields: [userBrowsePreferences.browseLocationId],
    references: [locations.id],
  }),
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
