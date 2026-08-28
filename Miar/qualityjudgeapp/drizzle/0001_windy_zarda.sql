CREATE TABLE `nominations` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`awardTitle` text NOT NULL,
	`context` text,
	`overallScore` int NOT NULL,
	`tier` varchar(32) NOT NULL,
	`criteriaJson` text NOT NULL,
	`kpiFindings` text,
	`strengthsJson` text,
	`weaknessesJson` text,
	`recommendationsJson` text,
	`coverageJson` text,
	`fileCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nominations_id` PRIMARY KEY(`id`)
);
