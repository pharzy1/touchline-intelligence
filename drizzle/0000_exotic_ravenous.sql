CREATE TABLE `model_runs` (
	`version` text PRIMARY KEY NOT NULL,
	`trained_at` text NOT NULL,
	`algorithm` text NOT NULL,
	`records` integer NOT NULL,
	`r2` real NOT NULL,
	`mae_eur` integer NOT NULL,
	`artifact_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performance_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`season` integer NOT NULL,
	`appearances` integer NOT NULL,
	`goals` integer NOT NULL,
	`assists` integer NOT NULL,
	`minutes` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_performance_player_season` ON `performance_snapshots` (`player_id`,`season`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`club` text NOT NULL,
	`position` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`market_value_eur` integer NOT NULL,
	`source_updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_club_position` ON `players` (`club`,`position`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_version` text NOT NULL,
	`input_json` text NOT NULL,
	`estimate_eur` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`model_version`) REFERENCES `model_runs`(`version`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_predictions_model_created` ON `predictions` (`model_version`,`created_at`);