CREATE TABLE `ai_output_logs` (
	`id` varchar(64) NOT NULL,
	`feature` varchar(64) NOT NULL,
	`nominationId` varchar(64),
	`userId` int,
	`outputText` text NOT NULL,
	`sourceIdsJson` text,
	`confidence` int,
	`reviewStatus` enum('unreviewed','approved','flagged') NOT NULL DEFAULT 'unreviewed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_output_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `award_milestones` (
	`id` varchar(64) NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`nameAr` text NOT NULL,
	`nameEn` text NOT NULL,
	`dueDate` timestamp NOT NULL,
	`alertDaysBefore` int NOT NULL DEFAULT 7,
	`status` enum('upcoming','due_soon','completed','missed') NOT NULL DEFAULT 'upcoming',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `award_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_meetings` (
	`id` varchar(64) NOT NULL,
	`committeeId` varchar(64) NOT NULL,
	`heldAt` timestamp NOT NULL,
	`minutesText` text,
	`decisionsText` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_members` (
	`id` varchar(64) NOT NULL,
	`committeeId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('chair','member','secretary') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conflict_of_interest_declarations` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`judgeUserId` int NOT NULL,
	`hasConflict` int NOT NULL DEFAULT 0,
	`detailsText` text,
	`declaredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conflict_of_interest_declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corrective_actions` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`sourceRecommendation` text NOT NULL,
	`titleAr` text NOT NULL,
	`titleEn` text NOT NULL,
	`ownerUserId` int NOT NULL,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','done','overdue') NOT NULL DEFAULT 'open',
	`progressPercent` int NOT NULL DEFAULT 0,
	`dueDate` timestamp,
	`closureEvidenceUrl` text,
	`closureNotes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corrective_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eligibility_checks` (
	`id` varchar(64) NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`nominationId` varchar(64),
	`userId` int NOT NULL,
	`passed` int NOT NULL DEFAULT 0,
	`answersJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eligibility_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `judging_committees` (
	`id` varchar(64) NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`nameAr` text NOT NULL,
	`nameEn` text NOT NULL,
	`chairUserId` int NOT NULL,
	`status` enum('forming','active','dissolved') NOT NULL DEFAULT 'forming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `judging_committees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_sources` (
	`id` varchar(64) NOT NULL,
	`titleAr` text NOT NULL,
	`titleEn` text NOT NULL,
	`programType` varchar(32),
	`bodyText` text NOT NULL,
	`storageUrl` text,
	`version` int NOT NULL DEFAULT 1,
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nomination_approvals` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`stage` enum('draft','quality_review','management_approval','submitted','result') NOT NULL,
	`decision` enum('pending','approved','rejected','reopened') NOT NULL DEFAULT 'pending',
	`actorUserId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nomination_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reference_data` (
	`id` varchar(64) NOT NULL,
	`type` enum('category','sector','level','kpi') NOT NULL,
	`refKey` varchar(128) NOT NULL,
	`labelAr` text NOT NULL,
	`labelEn` text NOT NULL,
	`ownerUserId` int,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','approved','retired') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reference_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` varchar(64) NOT NULL,
	`type` varchar(64) NOT NULL,
	`actorUserId` int,
	`ip` varchar(64),
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `classification` enum('public','internal','confidential','highly_confidential') DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence_items` ADD `malwareScanStatus` enum('pending','clean','infected','skipped') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `nominations` ADD `workflowStage` enum('draft','quality_review','management_approval','submitted','result') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `nominations` ADD `awardId` varchar(64);