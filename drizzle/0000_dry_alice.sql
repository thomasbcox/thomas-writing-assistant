CREATE TABLE `Anchor` (
	`id` text PRIMARY KEY NOT NULL,
	`capsuleId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`painPoints` text,
	`solutionSteps` text,
	`proof` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`capsuleId`) REFERENCES `Capsule`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Capsule` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`promise` text NOT NULL,
	`cta` text NOT NULL,
	`offerMapping` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Concept` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`content` text NOT NULL,
	`creator` text NOT NULL,
	`source` text NOT NULL,
	`year` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`trashedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Concept_identifier_unique` ON `Concept` (`identifier`);--> statement-breakpoint
CREATE TABLE `Link` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`targetId` text NOT NULL,
	`linkNameId` text NOT NULL,
	`notes` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`targetId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkNameId`) REFERENCES `LinkName`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `LinkName` (
	`id` text PRIMARY KEY NOT NULL,
	`forwardName` text NOT NULL,
	`reverseName` text NOT NULL,
	`isSymmetric` integer DEFAULT false NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `LinkName_forwardName_unique` ON `LinkName` (`forwardName`);--> statement-breakpoint
CREATE TABLE `MRUConcept` (
	`id` text PRIMARY KEY NOT NULL,
	`conceptId` text NOT NULL,
	`lastUsed` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MRUConcept_conceptId_unique` ON `MRUConcept` (`conceptId`);--> statement-breakpoint
CREATE TABLE `RepurposedContent` (
	`id` text PRIMARY KEY NOT NULL,
	`anchorId` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`guidance` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`anchorId`) REFERENCES `Anchor`(`id`) ON UPDATE no action ON DELETE cascade
);
