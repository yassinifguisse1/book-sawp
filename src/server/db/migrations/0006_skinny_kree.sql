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
CREATE TABLE `categories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`parentId` bigint unsigned,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft',
	`sortOrder` int unsigned NOT NULL DEFAULT 0,
	`seoTitle` varchar(160),
	`seoDescription` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `listing_shipping_destinations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`listingId` bigint unsigned NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_shipping_destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `listing_shipping_dest_unique` UNIQUE(`listingId`,`countryCode`)
);
--> statement-breakpoint
CREATE TABLE `location_aliases` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`locationId` bigint unsigned NOT NULL,
	`alias` varchar(200) NOT NULL,
	`normalizedAlias` varchar(200) NOT NULL,
	`languageCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_aliases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`publicId` varchar(36) NOT NULL,
	`sourceExternalId` varchar(32),
	`placeType` enum('country','region','city') NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`regionCode` varchar(20),
	`cityName` varchar(200),
	`normalizedCityName` varchar(200),
	`asciiCityName` varchar(200),
	`latitude` double,
	`longitude` double,
	`geohash` varchar(12),
	`population` int unsigned NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `locations_sourceExternalId_unique` UNIQUE(`sourceExternalId`)
);
--> statement-breakpoint
CREATE TABLE `market_configs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`enabledForBrowsing` boolean NOT NULL DEFAULT true,
	`enabledForListings` boolean NOT NULL DEFAULT true,
	`enabledForManualShipping` boolean NOT NULL DEFAULT true,
	`enabledForProtectedPayments` boolean NOT NULL DEFAULT false,
	`defaultCurrencyCode` varchar(3) NOT NULL DEFAULT 'USD',
	`distanceUnit` enum('km','mi') NOT NULL DEFAULT 'km',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_configs_countryCode_unique` UNIQUE(`countryCode`)
);
--> statement-breakpoint
CREATE TABLE `user_browse_preferences` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`browseLocationId` bigint unsigned,
	`radiusKm` int unsigned NOT NULL DEFAULT 25,
	`includeDomesticShipping` boolean NOT NULL DEFAULT true,
	`includeInternationalShipping` boolean NOT NULL DEFAULT false,
	`locationSource` enum('manual_selection','profile_default','browser_geolocation','ip_suggestion') NOT NULL DEFAULT 'manual_selection',
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_browse_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_browse_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_profile_locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`homeLocationId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_profile_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profile_locations_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `books` ADD `categoryId` bigint unsigned;--> statement-breakpoint
ALTER TABLE `books` ADD `locationId` bigint unsigned;--> statement-breakpoint
ALTER TABLE `books` ADD `pickupEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `pickupRadiusKm` int unsigned;--> statement-breakpoint
ALTER TABLE `books` ADD `manualShippingEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `shippingScope` enum('pickup_only','domestic_only','selected_countries','worldwide') DEFAULT 'pickup_only' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `locationPrecision` enum('city','region','country') DEFAULT 'city' NOT NULL;--> statement-breakpoint
ALTER TABLE `books` ADD `educationLevel` varchar(80);--> statement-breakpoint
ALTER TABLE `books` ADD `schoolType` enum('public_school','private_school','not_applicable');--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` timestamp;--> statement-breakpoint
CREATE INDEX `admin_invitations_email_status_idx` ON `admin_invitations` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `admin_invitations_inviter_idx` ON `admin_invitations` (`invitedByUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `categories_parent_status_idx` ON `categories` (`parentId`,`status`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `categories_status_sort_idx` ON `categories` (`status`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `listing_shipping_dest_country_idx` ON `listing_shipping_destinations` (`countryCode`);--> statement-breakpoint
CREATE INDEX `location_aliases_location_idx` ON `location_aliases` (`locationId`);--> statement-breakpoint
CREATE INDEX `location_aliases_normalized_idx` ON `location_aliases` (`normalizedAlias`);--> statement-breakpoint
CREATE INDEX `locations_country_city_idx` ON `locations` (`countryCode`,`normalizedCityName`);--> statement-breakpoint
CREATE INDEX `locations_city_idx` ON `locations` (`normalizedCityName`);--> statement-breakpoint
CREATE INDEX `locations_ascii_idx` ON `locations` (`asciiCityName`);--> statement-breakpoint
CREATE INDEX `locations_geohash_idx` ON `locations` (`geohash`);--> statement-breakpoint
CREATE INDEX `locations_population_idx` ON `locations` (`population`);--> statement-breakpoint
CREATE INDEX `locations_country_region_idx` ON `locations` (`countryCode`,`regionCode`);--> statement-breakpoint
CREATE INDEX `market_configs_browsing_idx` ON `market_configs` (`enabledForBrowsing`);--> statement-breakpoint
CREATE INDEX `user_browse_preferences_location_idx` ON `user_browse_preferences` (`browseLocationId`);--> statement-breakpoint
CREATE INDEX `user_profile_locations_home_idx` ON `user_profile_locations` (`homeLocationId`);--> statement-breakpoint
CREATE INDEX `books_category_idx` ON `books` (`categoryId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `books_location_idx` ON `books` (`locationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `books_shipping_scope_idx` ON `books` (`shippingScope`,`status`);--> statement-breakpoint
CREATE INDEX `users_banned_at_idx` ON `users` (`bannedAt`);