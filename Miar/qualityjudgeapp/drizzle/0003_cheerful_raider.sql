ALTER TABLE `nominations` ADD `judgeCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `nominations` ADD `judgesJson` text;--> statement-breakpoint
ALTER TABLE `nominations` ADD `weightsJson` text;