CREATE TABLE `audit_events` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`previousValue` text,
	`newValue` text,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `judge_assignments` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`judgeUserId` int NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'assigned',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `judge_assignments_id` PRIMARY KEY(`id`)
);
