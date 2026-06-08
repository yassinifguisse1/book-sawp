CREATE TABLE `feature_flags` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`country` varchar(2),
	`enabled` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_key_country_unique` UNIQUE(`key`,`country`)
);
--> statement-breakpoint
CREATE TABLE `identity_audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`type` varchar(80) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `identity_audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `identity_audit_logs_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `listing_images` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`bookId` bigint unsigned NOT NULL,
	`blobUrl` text NOT NULL,
	`blobPath` varchar(512) NOT NULL,
	`sortOrder` int unsigned NOT NULL,
	`contentType` varchar(100) NOT NULL,
	`sizeBytes` int unsigned NOT NULL,
	`moderationStatus` enum('pending','active','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `listing_images_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `listing_images_book_order_unique` UNIQUE(`bookId`,`sortOrder`)
);
--> statement-breakpoint
CREATE TABLE `moderation_audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`actorUserId` bigint unsigned NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` bigint unsigned NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moderation_audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `moderation_audit_logs_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`link` varchar(512),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`type` varchar(120) NOT NULL,
	`aggregateType` varchar(80) NOT NULL,
	`aggregateId` varchar(80) NOT NULL,
	`version` int unsigned NOT NULL DEFAULT 1,
	`payload` json NOT NULL,
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`deadLetteredAt` timestamp,
	`attempts` int unsigned NOT NULL DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outbox_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `outbox_events_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`reporterId` bigint unsigned NOT NULL,
	`targetType` enum('user','listing','message') NOT NULL,
	`targetId` bigint unsigned NOT NULL,
	`reason` varchar(80) NOT NULL,
	`details` text,
	`status` enum('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
	`assignedToId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `transaction_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`transactionId` bigint unsigned NOT NULL,
	`actorUserId` bigint unsigned,
	`type` varchar(80) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `transaction_events_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_assets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`blobUrl` varchar(768) NOT NULL,
	`blobPath` varchar(512) NOT NULL,
	`uploaderPublicId` varchar(36) NOT NULL,
	`contentType` varchar(100) NOT NULL,
	`sizeBytes` int unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploaded_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploaded_assets_blobUrl_unique` UNIQUE(`blobUrl`)
);
--> statement-breakpoint
ALTER TABLE `favorites` DROP INDEX `user_book_unique`;--> statement-breakpoint
ALTER TABLE `books` MODIFY COLUMN `pages` int unsigned;--> statement-breakpoint
ALTER TABLE `books` MODIFY COLUMN `status` enum('available','pending','cancelled','draft','active','reserved','completed','withdrawn','suspended') NOT NULL DEFAULT 'available';--> statement-breakpoint
UPDATE `books` SET `status` = 'active' WHERE `status` = 'available';--> statement-breakpoint
UPDATE `books` SET `status` = 'reserved' WHERE `status` = 'pending';--> statement-breakpoint
UPDATE `books` SET `status` = 'withdrawn' WHERE `status` = 'cancelled';--> statement-breakpoint
UPDATE `books` SET `pickupAvailable` = false WHERE `pickupAvailable` IS NULL;--> statement-breakpoint
ALTER TABLE `books` MODIFY COLUMN `pickupAvailable` boolean NOT NULL;--> statement-breakpoint
DELETE FROM `messages` WHERE `conversationId` IN (SELECT `id` FROM `conversations` WHERE `bookId` IS NULL);--> statement-breakpoint
DELETE FROM `conversations` WHERE `bookId` IS NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `bookId` bigint unsigned NOT NULL;--> statement-breakpoint
DELETE FROM `reviews` WHERE `transactionId` IS NULL;--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `transactionId` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `rating` int unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `type` enum('swap','giveaway','purchase','swap_request','giveaway_request','sale_reservation') NOT NULL;--> statement-breakpoint
UPDATE `transactions` SET `type` = 'swap_request' WHERE `type` = 'swap';--> statement-breakpoint
UPDATE `transactions` SET `type` = 'giveaway_request' WHERE `type` = 'giveaway';--> statement-breakpoint
UPDATE `transactions` SET `type` = 'sale_reservation' WHERE `type` = 'purchase';--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `status` enum('pending','accepted','completed','declined','cancelled','expired') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','moderator','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `books` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `books` ADD `currency` varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `priceMinor` int unsigned;--> statement-breakpoint
ALTER TABLE `books` ADD `shippingMinor` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `country` varchar(2) DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `city` varchar(120) DEFAULT 'Unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `books` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `books` ADD `anonymizedAt` timestamp;--> statement-breakpoint
ALTER TABLE `conversations` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `conversations` ADD `subjectKey` varchar(120);--> statement-breakpoint
ALTER TABLE `messages` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `messages` ADD `flaggedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reviews` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `transactions` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `transactions` ADD `idempotencyKey` varchar(80);--> statement-breakpoint
ALTER TABLE `transactions` ADD `priceMinor` int unsigned;--> statement-breakpoint
ALTER TABLE `transactions` ADD `currency` varchar(3);--> statement-breakpoint
ALTER TABLE `transactions` ADD `reservationExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `transactions` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `publicId` varchar(36);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneHash` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `phoneVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneRevokedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `anonymizedAt` timestamp;--> statement-breakpoint
UPDATE `books` SET `publicId` = UUID(), `priceMinor` = CASE WHEN `price` IS NULL THEN NULL ELSE ROUND(`price` * 100) END, `shippingMinor` = ROUND(COALESCE(`shippingCost`, 0) * 100);--> statement-breakpoint
UPDATE `books` SET `priceMinor` = NULL WHERE `transactionType` <> 'sale';--> statement-breakpoint
UPDATE `conversations` SET `publicId` = UUID(), `subjectKey` = CONCAT(LEAST(`participant1Id`, `participant2Id`), ':', GREATEST(`participant1Id`, `participant2Id`), ':', `bookId`);--> statement-breakpoint
UPDATE `messages` SET `publicId` = UUID();--> statement-breakpoint
UPDATE `reviews` SET `publicId` = UUID();--> statement-breakpoint
UPDATE `transactions` SET `publicId` = UUID(), `idempotencyKey` = UUID(), `priceMinor` = CASE WHEN `price` IS NULL THEN NULL ELSE ROUND(`price` * 100) END;--> statement-breakpoint
UPDATE `users` SET `publicId` = UUID();--> statement-breakpoint
UPDATE `messages` AS `m` JOIN `conversations` AS `c` ON `m`.`conversationId` = `c`.`id` JOIN (SELECT `subjectKey`, MIN(`id`) AS `keepId` FROM `conversations` GROUP BY `subjectKey`) AS `d` ON `d`.`subjectKey` = `c`.`subjectKey` SET `m`.`conversationId` = `d`.`keepId`;--> statement-breakpoint
DELETE `c` FROM `conversations` AS `c` JOIN (SELECT `subjectKey`, MIN(`id`) AS `keepId` FROM `conversations` GROUP BY `subjectKey`) AS `d` ON `d`.`subjectKey` = `c`.`subjectKey` WHERE `c`.`id` <> `d`.`keepId`;--> statement-breakpoint
DELETE `r` FROM `reviews` AS `r` JOIN (SELECT `transactionId`, `reviewerId`, MIN(`id`) AS `keepId` FROM `reviews` GROUP BY `transactionId`, `reviewerId`) AS `d` ON `d`.`transactionId` = `r`.`transactionId` AND `d`.`reviewerId` = `r`.`reviewerId` WHERE `r`.`id` <> `d`.`keepId`;--> statement-breakpoint
ALTER TABLE `books` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `books` MODIFY COLUMN `status` enum('draft','active','reserved','completed','withdrawn','suspended') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `subjectKey` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `idempotencyKey` varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `type` enum('swap_request','giveaway_request','sale_reservation') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `publicId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_subjectKey_unique` UNIQUE(`subjectKey`);--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_book_unique` UNIQUE(`userId`,`bookId`);--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_transaction_reviewer_unique` UNIQUE(`transactionId`,`reviewerId`);--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_idempotencyKey_unique` UNIQUE(`idempotencyKey`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_phoneHash_unique` UNIQUE(`phoneHash`);--> statement-breakpoint
CREATE INDEX `feature_flags_country_idx` ON `feature_flags` (`country`,`key`);--> statement-breakpoint
CREATE INDEX `identity_audit_user_idx` ON `identity_audit_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `listing_images_book_status_idx` ON `listing_images` (`bookId`,`moderationStatus`);--> statement-breakpoint
CREATE INDEX `moderation_audit_target_idx` ON `moderation_audit_logs` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `moderation_audit_actor_idx` ON `moderation_audit_logs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `outbox_pending_idx` ON `outbox_events` (`processedAt`,`deadLetteredAt`,`availableAt`);--> statement-breakpoint
CREATE INDEX `outbox_aggregate_idx` ON `outbox_events` (`aggregateType`,`aggregateId`);--> statement-breakpoint
CREATE INDEX `reports_queue_idx` ON `reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `transaction_events_transaction_idx` ON `transaction_events` (`transactionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `uploaded_assets_uploader_idx` ON `uploaded_assets` (`uploaderPublicId`,`createdAt`);--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_sale_price_check` CHECK ((`books`.`transactionType` = 'sale' AND `books`.`priceMinor` > 0) OR (`books`.`transactionType` <> 'sale' AND `books`.`priceMinor` IS NULL));--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_rating_check` CHECK (`reviews`.`rating` BETWEEN 1 AND 5);--> statement-breakpoint
CREATE INDEX `books_feed_idx` ON `books` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `books_owner_idx` ON `books` (`ownerId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `books_geo_idx` ON `books` (`country`,`city`,`status`);--> statement-breakpoint
CREATE INDEX `books_mode_idx` ON `books` (`transactionType`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversations_p1_idx` ON `conversations` (`participant1Id`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `conversations_p2_idx` ON `conversations` (`participant2Id`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `conversations_book_idx` ON `conversations` (`bookId`);--> statement-breakpoint
CREATE INDEX `favorites_book_idx` ON `favorites` (`bookId`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`senderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reviews_reviewee_idx` ON `reviews` (`revieweeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transactions_owner_idx` ON `transactions` (`ownerId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transactions_requester_idx` ON `transactions` (`requesterId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transactions_book_idx` ON `transactions` (`bookId`,`status`);--> statement-breakpoint
CREATE INDEX `transactions_expiration_idx` ON `transactions` (`status`,`reservationExpiresAt`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_deleted_at_idx` ON `users` (`deletedAt`);--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `shippingCost`;--> statement-breakpoint
ALTER TABLE `transactions` DROP COLUMN `price`;
