CREATE TABLE `error_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route` text NOT NULL,
	`fingerprint` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_error_events_route_created` ON `error_events` (`route`,`created_at`);--> statement-breakpoint
CREATE TABLE `operational_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fingerprint` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_operational_alerts_created` ON `operational_alerts` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_operational_alerts_resolved_created` ON `operational_alerts` (`resolved_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_hash` text NOT NULL,
	`route` text NOT NULL,
	`window_started_at` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_windows_subject_route` ON `rate_limit_windows` (`subject_hash`,`route`);--> statement-breakpoint
CREATE INDEX `idx_rate_limit_windows_expires` ON `rate_limit_windows` (`expires_at`);--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`route` text NOT NULL,
	`status` integer NOT NULL,
	`subject_hash` text,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_security_events_category_created` ON `security_events` (`category`,`created_at`);