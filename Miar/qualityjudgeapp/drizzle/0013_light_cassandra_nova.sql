CREATE TABLE `award_eligibility_rules` (
	`id` varchar(64) NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`ruleKey` varchar(128) NOT NULL,
	`nameAr` text NOT NULL,
	`nameEn` text NOT NULL,
	`descriptionAr` text NOT NULL,
	`descriptionEn` text NOT NULL,
	`required` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `award_eligibility_rules_id` PRIMARY KEY(`id`)
);
