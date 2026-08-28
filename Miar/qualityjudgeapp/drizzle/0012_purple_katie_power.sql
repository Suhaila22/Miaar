CREATE TABLE `award_criteria` (
	`id` varchar(64) NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`criterionKey` varchar(128) NOT NULL,
	`nameAr` text NOT NULL,
	`nameEn` text NOT NULL,
	`descriptionAr` text,
	`descriptionEn` text,
	`weight` int NOT NULL,
	`evidenceRequired` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `award_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `awards` (
	`id` varchar(64) NOT NULL,
	`titleAr` text NOT NULL,
	`titleEn` text NOT NULL,
	`organizerAr` text NOT NULL,
	`organizerEn` text NOT NULL,
	`countryAr` text,
	`countryEn` text,
	`sector` varchar(64) NOT NULL,
	`level` varchar(32) NOT NULL,
	`category` varchar(64) NOT NULL,
	`eligibilityAr` text NOT NULL,
	`eligibilityEn` text NOT NULL,
	`deadline` timestamp,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `awards_id` PRIMARY KEY(`id`)
);
