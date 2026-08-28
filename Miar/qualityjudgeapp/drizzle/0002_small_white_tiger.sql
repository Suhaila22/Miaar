CREATE TABLE `evidence_items` (
	`id` varchar(64) NOT NULL,
	`nominationId` varchar(64) NOT NULL,
	`fileName` text NOT NULL,
	`fileType` varchar(64) NOT NULL,
	`storageKey` text NOT NULL,
	`storageUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_items_id` PRIMARY KEY(`id`)
);
