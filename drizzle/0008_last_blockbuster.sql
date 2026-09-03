CREATE TABLE `beta_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journey_hash` text NOT NULL,
	`category` text NOT NULL,
	`rating` integer NOT NULL,
	`message` text NOT NULL,
	`source_path` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_beta_feedback_created` ON `beta_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_beta_feedback_category_created` ON `beta_feedback` (`category`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journey_hash` text NOT NULL,
	`event` text NOT NULL,
	`source_path` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_product_events_event_created` ON `product_events` (`event`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_product_events_journey_created` ON `product_events` (`journey_hash`,`created_at`);