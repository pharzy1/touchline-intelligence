CREATE TABLE `notification_dead_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`type` text NOT NULL,
	`attempts` integer NOT NULL,
	`error` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notification_dead_letters_created` ON `notification_dead_letters` (`created_at`);--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`recipient_email` text NOT NULL,
	`actor_email` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_at` text,
	`available_at` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_jobs_dedupe` ON `notification_jobs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_notification_jobs_status_available` ON `notification_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `idx_notification_jobs_recipient_created` ON `notification_jobs` (`recipient_email`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`email` text PRIMARY KEY NOT NULL,
	`collaboration_enabled` integer DEFAULT 1 NOT NULL,
	`weekly_enabled` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `notification_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notifications_job` ON `notifications` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_created` ON `notifications` (`recipient_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`recipient_email`,`read_at`);--> statement-breakpoint
ALTER TABLE `workspace_plans` ADD `owner_email` text;