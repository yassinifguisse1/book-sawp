CREATE TABLE `post_categories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`seoTitle` varchar(160),
	`seoDescription` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_categories_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `post_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `post_category_assignments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`postId` bigint unsigned NOT NULL,
	`categoryId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_category_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_category_assign_unique` UNIQUE(`postId`,`categoryId`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` varchar(500),
	`content` text NOT NULL,
	`coverImageUrl` text,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`authorId` bigint unsigned NOT NULL,
	`publishedAt` timestamp,
	`seoTitle` varchar(160),
	`seoDescription` varchar(320),
	`readingTimeMinutes` int unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `post_category_assign_category_idx` ON `post_category_assignments` (`categoryId`);--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`authorId`,`status`);