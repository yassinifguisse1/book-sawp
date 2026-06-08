CREATE TABLE `books` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`author` varchar(255) NOT NULL,
	`description` text,
	`genre` varchar(100) NOT NULL,
	`condition` enum('likenew','verygood','good','fair','poor') NOT NULL,
	`isbn` varchar(20),
	`language` varchar(50) DEFAULT 'English',
	`pages` int,
	`transactionType` enum('swap','giveaway','sale') NOT NULL,
	`price` decimal(10,2),
	`status` enum('available','pending','completed','cancelled') NOT NULL DEFAULT 'available',
	`ownerId` bigint unsigned NOT NULL,
	`imageUrl` text,
	`imageUrls` json,
	`shippingCost` decimal(10,2) DEFAULT '0',
	`pickupAvailable` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`participant1Id` bigint unsigned NOT NULL,
	`participant2Id` bigint unsigned NOT NULL,
	`bookId` bigint unsigned,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`bookId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_book_unique` UNIQUE(`userId`,`bookId`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`conversationId` bigint unsigned NOT NULL,
	`senderId` bigint unsigned NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`reviewerId` bigint unsigned NOT NULL,
	`revieweeId` bigint unsigned NOT NULL,
	`transactionId` bigint unsigned,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bookId` bigint unsigned NOT NULL,
	`requesterId` bigint unsigned NOT NULL,
	`ownerId` bigint unsigned NOT NULL,
	`offeredBookId` bigint unsigned,
	`type` enum('swap','giveaway','purchase') NOT NULL,
	`status` enum('pending','accepted','declined','completed','cancelled') NOT NULL DEFAULT 'pending',
	`message` text,
	`price` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`clerkUserId` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`avatar` text,
	`location` varchar(255),
	`bio` text,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignInAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_clerkUserId_unique` UNIQUE(`clerkUserId`)
);
