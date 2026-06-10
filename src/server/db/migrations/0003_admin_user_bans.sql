ALTER TABLE `users` ADD `bannedAt` timestamp;--> statement-breakpoint
CREATE INDEX `users_banned_at_idx` ON `users` (`bannedAt`);
