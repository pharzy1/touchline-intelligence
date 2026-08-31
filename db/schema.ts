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
