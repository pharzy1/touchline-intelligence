CREATE TABLE `api_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route` text NOT NULL,
	`status` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_events_route_created` ON `api_events` (`route`,`created_at`);