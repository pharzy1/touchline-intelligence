CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text NOT NULL,
	`fixtures_fetched` integer NOT NULL,
	`created_candidates` integer NOT NULL,
	`graded_candidates` integer NOT NULL,
	`skipped` integer NOT NULL,
	`statements` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `idx_sync_runs_completed` ON `sync_runs` (`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_sync_runs_status_completed` ON `sync_runs` (`status`,`completed_at`);