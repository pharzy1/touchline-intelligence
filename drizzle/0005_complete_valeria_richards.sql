CREATE TABLE `workspace_plan_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workspace_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_plan_activity_plan_created` ON `workspace_plan_activity` (`plan_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_plan_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_email` text NOT NULL,
	`body` text NOT NULL,
	`player_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workspace_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_plan_comments_plan_created` ON `workspace_plan_comments` (`plan_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_plan_members` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workspace_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_plan_members_plan_email` ON `workspace_plan_members` (`plan_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_workspace_plan_members_email` ON `workspace_plan_members` (`email`);--> statement-breakpoint
CREATE INDEX `idx_workspace_plan_members_user` ON `workspace_plan_members` (`user_id`);