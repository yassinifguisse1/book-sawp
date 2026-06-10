-- invitedByUserId and acceptedByUserId intentionally omit FK constraints to users(id).
-- BookSwap stores user references as raw bigint IDs across the schema; referential
-- integrity is enforced in domain services (sharding-ready, no physical FKs).
-- Invitation rows are an audit trail: invitedByUserId stays NOT NULL so the inviter
-- is always recorded; acceptedByUserId is nullable until acceptance. Users are
-- soft-deleted (deletedAt), and retention anonymization may later clear PII without
-- cascading or blocking historical admin-invitation records.
CREATE TABLE `admin_invitations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('moderator','admin','super_admin') NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`invitedByUserId` bigint unsigned NOT NULL,
	`acceptedByUserId` bigint unsigned,
	`clerkInvitationId` varchar(255),
	`deliveryError` text,
	`expiresAt` timestamp,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invitations_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE INDEX `admin_invitations_email_status_idx` ON `admin_invitations` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `admin_invitations_inviter_idx` ON `admin_invitations` (`invitedByUserId`,`createdAt`);
