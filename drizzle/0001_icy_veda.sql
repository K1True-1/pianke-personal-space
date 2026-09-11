CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`upload_id` text NOT NULL,
	`object_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`part_size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_owner_created` ON `uploads` (`owner_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `items` ADD `preview_key` text;