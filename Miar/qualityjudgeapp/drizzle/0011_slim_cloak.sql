CREATE TABLE `criterion_scores` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`decisionId` varchar(64) NOT NULL,
	`criterionKey` varchar(128) NOT NULL,
	`scoreTenths` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `criterion_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_signatures` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`decisionId` varchar(64) NOT NULL,
	`signerUserId` int NOT NULL,
	`signatureData` text NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decision_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_decisions` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`judgeUserId` int,
	`judgeKey` varchar(64),
	`decisionType` varchar(32) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'submitted',
	`overallScore` int NOT NULL,
	`tier` varchar(32) NOT NULL,
	`decisionText` text,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluation_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `criterionKey` varchar(128);--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `judgeKey` varchar(64);--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `uploadedByUserId` int;--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `mimeType` varchar(128);--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `extractedText` text;