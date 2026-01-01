CREATE TABLE `ChatMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`suggestions` text,
	`actions` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `ChatSession`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ChatSession` (
	`id` text PRIMARY KEY NOT NULL,
	`conceptId` text NOT NULL,
	`title` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ConceptEmbedding` (
	`id` text PRIMARY KEY NOT NULL,
	`conceptId` text NOT NULL,
	`embedding` text NOT NULL,
	`model` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ConceptEmbedding_conceptId_unique` ON `ConceptEmbedding` (`conceptId`);--> statement-breakpoint
CREATE TABLE `Offer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `Capsule` ADD `offerId` text REFERENCES Offer(id);