CREATE TABLE `workspace_plan_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workspace_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_plan_versions_plan_version` ON `workspace_plan_versions` (`plan_id`,`version`);--> statement-breakpoint
CREATE TABLE `workspace_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`payload_json` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`public_slug` text,
	`archived` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_plans_owner_updated` ON `workspace_plans` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_workspace_plans_owner_archived` ON `workspace_plans` (`owner_id`,`archived`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_plans_public_slug` ON `workspace_plans` (`public_slug`);