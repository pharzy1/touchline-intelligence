CREATE TABLE `fixture_predictions` (
	`fixture_id` integer PRIMARY KEY NOT NULL,
	`gameweek` integer,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`kickoff_at` text,
	`status` text NOT NULL,
	`model_version` text NOT NULL,
	`predicted_at` text NOT NULL,
	`home_probability` real NOT NULL,
	`draw_probability` real NOT NULL,
	`away_probability` real NOT NULL,
	`predicted_class` text NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`actual_class` text,
	`correct` integer,
	`brier_score` real,
	`scored_at` text,
	`source_updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fixture_predictions_kickoff` ON `fixture_predictions` (`kickoff_at`);--> statement-breakpoint
CREATE INDEX `idx_fixture_predictions_status_kickoff` ON `fixture_predictions` (`status`,`kickoff_at`);