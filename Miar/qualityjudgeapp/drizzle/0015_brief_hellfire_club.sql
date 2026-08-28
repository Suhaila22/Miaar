CREATE TABLE `weight_templates` (
	`id` varchar(64) NOT NULL,
	`nameAr` varchar(240) NOT NULL,
	`nameEn` varchar(240) NOT NULL,
	`programType` varchar(64) NOT NULL,
	`weightsJson` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`ownerUserId` int NOT NULL,
	`status` enum('draft','approved','retired') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`approvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weight_templates_id` PRIMARY KEY(`id`)
);
