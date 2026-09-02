import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  club: text("club").notNull(),
  position: text("position").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  marketValueEur: integer("market_value_eur").notNull(),
  sourceUpdatedAt: text("source_updated_at").notNull(),
}, (table) => [index("idx_players_club_position").on(table.club, table.position)]);

export const performanceSnapshots = sqliteTable("performance_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull().references(() => players.id),
  season: integer("season").notNull(),
  appearances: integer("appearances").notNull(),
  goals: integer("goals").notNull(),
  assists: integer("assists").notNull(),
  minutes: integer("minutes").notNull(),
}, (table) => [index("idx_performance_player_season").on(table.playerId, table.season)]);

export const modelRuns = sqliteTable("model_runs", {
  version: text("version").primaryKey(),
  trainedAt: text("trained_at").notNull(),
  algorithm: text("algorithm").notNull(),
  records: integer("records").notNull(),
  r2: real("r2").notNull(),
  maeEur: integer("mae_eur").notNull(),
  artifactJson: text("artifact_json").notNull(),
});

export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelVersion: text("model_version").notNull().references(() => modelRuns.version),
  inputJson: text("input_json").notNull(),
  estimateEur: integer("estimate_eur").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_predictions_model_created").on(table.modelVersion, table.createdAt)]);

export const apiEvents = sqliteTable("api_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), route: text("route").notNull(), status: integer("status").notNull(), latencyMs: integer("latency_ms").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_api_events_route_created").on(table.route, table.createdAt)]);

export const fixturePredictions = sqliteTable("fixture_predictions", {
  fixtureId: integer("fixture_id").primaryKey(),
  gameweek: integer("gameweek"),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  kickoffAt: text("kickoff_at"),
  status: text("status").notNull(),
  modelVersion: text("model_version").notNull(),
  predictedAt: text("predicted_at").notNull(),
  homeProbability: real("home_probability").notNull(),
  drawProbability: real("draw_probability").notNull(),
  awayProbability: real("away_probability").notNull(),
  predictedClass: text("predicted_class").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  actualClass: text("actual_class"),
  correct: integer("correct"),
  brierScore: real("brier_score"),
  scoredAt: text("scored_at"),
  sourceUpdatedAt: text("source_updated_at").notNull(),
}, (table) => [
  index("idx_fixture_predictions_kickoff").on(table.kickoffAt),
  index("idx_fixture_predictions_status_kickoff").on(table.status, table.kickoffAt),
]);

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at").notNull(),
  fixturesFetched: integer("fixtures_fetched").notNull(),
  createdCandidates: integer("created_candidates").notNull(),
  gradedCandidates: integer("graded_candidates").notNull(),
  skipped: integer("skipped").notNull(),
  statements: integer("statements").notNull(),
  durationMs: integer("duration_ms").notNull(),
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_sync_runs_completed").on(table.completedAt),
  index("idx_sync_runs_status_completed").on(table.status, table.completedAt),
]);
