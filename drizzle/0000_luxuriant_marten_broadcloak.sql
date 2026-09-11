CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`language` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_items_owner_created` ON `items` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `activity` (
	`owner_id` text NOT NULL,
	`day` text NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`uploads` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner_id`, `day`)
);
