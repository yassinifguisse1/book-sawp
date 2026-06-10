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
CREATE INDEX `categories_parent_status_idx` ON `categories` (`parentId`,`status`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `categories_status_sort_idx` ON `categories` (`status`,`sortOrder`);--> statement-breakpoint
ALTER TABLE `books` ADD `categoryId` bigint unsigned;--> statement-breakpoint
CREATE INDEX `books_category_idx` ON `books` (`categoryId`,`status`,`createdAt`);--> statement-breakpoint
INSERT INTO `categories` (`id`, `publicId`, `parentId`, `slug`, `name`, `status`, `sortOrder`, `seoTitle`, `seoDescription`) VALUES
	(1, UUID(), NULL, 'fiction', 'Fiction', 'active', 1, 'Fiction books', 'Browse fiction books available for swap, giveaway, and sale on BookSwap.'),
	(2, UUID(), 1, 'general-fiction', 'General Fiction', 'active', 1, 'General Fiction books', 'Browse general fiction books available for swap, giveaway, and sale on BookSwap.'),
	(3, UUID(), 1, 'classics', 'Classics', 'active', 2, 'Classics books', 'Browse classics books available for swap, giveaway, and sale on BookSwap.'),
	(4, UUID(), 1, 'mystery', 'Mystery', 'active', 3, 'Mystery books', 'Browse mystery books available for swap, giveaway, and sale on BookSwap.'),
	(5, UUID(), 1, 'romance', 'Romance', 'active', 4, 'Romance books', 'Browse romance books available for swap, giveaway, and sale on BookSwap.'),
	(6, UUID(), 1, 'sci-fi-fantasy', 'Sci-Fi & Fantasy', 'active', 5, 'Sci-Fi & Fantasy books', 'Browse sci-fi and fantasy books available for swap, giveaway, and sale on BookSwap.'),
	(7, UUID(), 1, 'horror', 'Horror', 'active', 6, 'Horror books', 'Browse horror books available for swap, giveaway, and sale on BookSwap.'),
	(8, UUID(), NULL, 'non-fiction', 'Non-Fiction', 'active', 2, 'Non-Fiction books', 'Browse non-fiction books available for swap, giveaway, and sale on BookSwap.'),
	(9, UUID(), 8, 'general-non-fiction', 'General Non-Fiction', 'active', 1, 'General Non-Fiction books', 'Browse general non-fiction books available for swap, giveaway, and sale on BookSwap.'),
	(10, UUID(), 8, 'biography', 'Biography', 'active', 2, 'Biography books', 'Browse biography books available for swap, giveaway, and sale on BookSwap.'),
	(11, UUID(), 8, 'history', 'History', 'active', 3, 'History books', 'Browse history books available for swap, giveaway, and sale on BookSwap.'),
	(12, UUID(), 8, 'self-help', 'Self-Help', 'active', 4, 'Self-Help books', 'Browse self-help books available for swap, giveaway, and sale on BookSwap.'),
	(13, UUID(), 8, 'science-nature', 'Science & Nature', 'active', 5, 'Science & Nature books', 'Browse science and nature books available for swap, giveaway, and sale on BookSwap.'),
	(14, UUID(), NULL, 'childrens-books', 'Children''s Books', 'active', 3, 'Children''s Books', 'Browse children''s books available for swap, giveaway, and sale on BookSwap.'),
	(15, UUID(), 14, 'childrens-fiction', 'Children''s Fiction', 'active', 1, 'Children''s Fiction books', 'Browse children''s fiction books available for swap, giveaway, and sale on BookSwap.'),
	(16, UUID(), 14, 'early-readers', 'Early Readers', 'active', 2, 'Early Readers books', 'Browse early reader books available for swap, giveaway, and sale on BookSwap.'),
	(17, UUID(), 14, 'young-adult', 'Young Adult', 'active', 3, 'Young Adult books', 'Browse young adult books available for swap, giveaway, and sale on BookSwap.'),
	(18, UUID(), NULL, 'textbooks-academic', 'Textbooks & Academic', 'active', 4, 'Textbooks & Academic books', 'Browse textbooks and academic books available for swap, giveaway, and sale on BookSwap.'),
	(19, UUID(), 18, 'general-academic', 'General Academic', 'active', 1, 'General Academic books', 'Browse general academic books available for swap, giveaway, and sale on BookSwap.'),
	(20, UUID(), 18, 'textbooks', 'Textbooks', 'active', 2, 'Textbooks', 'Browse textbooks available for swap, giveaway, and sale on BookSwap.'),
	(21, UUID(), 18, 'study-guides', 'Study Guides', 'active', 3, 'Study Guides', 'Browse study guides available for swap, giveaway, and sale on BookSwap.'),
	(22, UUID(), 18, 'school-books', 'School Books', 'active', 4, 'School Books', 'Browse school books available for swap, giveaway, and sale on BookSwap.'),
	(23, UUID(), NULL, 'comics-manga-graphic-novels', 'Comics, Manga & Graphic Novels', 'active', 5, 'Comics, Manga & Graphic Novels', 'Browse comics, manga, and graphic novels available for swap, giveaway, and sale on BookSwap.'),
	(24, UUID(), 23, 'comics', 'Comics', 'active', 1, 'Comics', 'Browse comics available for swap, giveaway, and sale on BookSwap.'),
	(25, UUID(), 23, 'manga', 'Manga', 'active', 2, 'Manga', 'Browse manga available for swap, giveaway, and sale on BookSwap.'),
	(26, UUID(), 23, 'graphic-novels', 'Graphic Novels', 'active', 3, 'Graphic Novels', 'Browse graphic novels available for swap, giveaway, and sale on BookSwap.'),
	(27, UUID(), NULL, 'religion-spirituality', 'Religion & Spirituality', 'active', 6, 'Religion & Spirituality books', 'Browse religion and spirituality books available for swap, giveaway, and sale on BookSwap.'),
	(28, UUID(), 27, 'religion', 'Religion', 'active', 1, 'Religion books', 'Browse religion books available for swap, giveaway, and sale on BookSwap.'),
	(29, UUID(), 27, 'spirituality', 'Spirituality', 'active', 2, 'Spirituality books', 'Browse spirituality books available for swap, giveaway, and sale on BookSwap.'),
	(30, UUID(), NULL, 'business-career', 'Business & Career', 'active', 7, 'Business & Career books', 'Browse business and career books available for swap, giveaway, and sale on BookSwap.'),
	(31, UUID(), 30, 'business', 'Business', 'active', 1, 'Business books', 'Browse business books available for swap, giveaway, and sale on BookSwap.'),
	(32, UUID(), 30, 'career', 'Career', 'active', 2, 'Career books', 'Browse career books available for swap, giveaway, and sale on BookSwap.'),
	(33, UUID(), 30, 'personal-finance', 'Personal Finance', 'active', 3, 'Personal Finance books', 'Browse personal finance books available for swap, giveaway, and sale on BookSwap.'),
	(34, UUID(), NULL, 'cookbooks-food', 'Cookbooks & Food', 'active', 8, 'Cookbooks & Food', 'Browse cookbooks and food books available for swap, giveaway, and sale on BookSwap.'),
	(35, UUID(), 34, 'cookbooks', 'Cookbooks', 'active', 1, 'Cookbooks', 'Browse cookbooks available for swap, giveaway, and sale on BookSwap.'),
	(36, UUID(), 34, 'baking', 'Baking', 'active', 2, 'Baking books', 'Browse baking books available for swap, giveaway, and sale on BookSwap.'),
	(37, UUID(), NULL, 'art-photography-design', 'Art, Photography & Design', 'active', 9, 'Art, Photography & Design books', 'Browse art, photography, and design books available for swap, giveaway, and sale on BookSwap.'),
	(38, UUID(), 37, 'art', 'Art', 'active', 1, 'Art books', 'Browse art books available for swap, giveaway, and sale on BookSwap.'),
	(39, UUID(), 37, 'photography', 'Photography', 'active', 2, 'Photography books', 'Browse photography books available for swap, giveaway, and sale on BookSwap.'),
	(40, UUID(), 37, 'design', 'Design', 'active', 3, 'Design books', 'Browse design books available for swap, giveaway, and sale on BookSwap.'),
	(41, UUID(), NULL, 'language-learning', 'Language Learning', 'active', 10, 'Language Learning books', 'Browse language learning books available for swap, giveaway, and sale on BookSwap.'),
	(42, UUID(), 41, 'english-language-learning', 'English Language Learning', 'active', 1, 'English Language Learning books', 'Browse English language learning books available for swap, giveaway, and sale on BookSwap.'),
	(43, UUID(), 41, 'foreign-languages', 'Foreign Languages', 'active', 2, 'Foreign Language books', 'Browse foreign language books available for swap, giveaway, and sale on BookSwap.'),
	(44, UUID(), NULL, 'reference', 'Reference', 'active', 11, 'Reference books', 'Browse reference books available for swap, giveaway, and sale on BookSwap.'),
	(45, UUID(), 44, 'dictionaries', 'Dictionaries', 'active', 1, 'Dictionaries', 'Browse dictionaries available for swap, giveaway, and sale on BookSwap.'),
	(46, UUID(), 44, 'encyclopedias', 'Encyclopedias', 'active', 2, 'Encyclopedias', 'Browse encyclopedias available for swap, giveaway, and sale on BookSwap.'),
	(47, UUID(), 44, 'writing-reference', 'Writing Reference', 'active', 3, 'Writing Reference books', 'Browse writing reference books available for swap, giveaway, and sale on BookSwap.');
--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'general-fiction' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Fiction' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'general-non-fiction' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Non-Fiction' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'sci-fi-fantasy' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Sci-Fi & Fantasy' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'romance' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Romance' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'mystery' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Mystery' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'biography' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Biography' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'self-help' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Self-Help' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'general-academic' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Academic' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'childrens-fiction' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` IN ('Children''s', 'Children''s Books') AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'history' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'History' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'cookbooks' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Cooking' AND `b`.`categoryId` IS NULL;--> statement-breakpoint
UPDATE `books` AS `b` JOIN `categories` AS `c` ON `c`.`slug` = 'horror' SET `b`.`categoryId` = `c`.`id`, `b`.`genre` = `c`.`name` WHERE `b`.`genre` = 'Horror' AND `b`.`categoryId` IS NULL;
