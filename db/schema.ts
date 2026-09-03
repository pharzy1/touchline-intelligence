import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const rateLimitWindows = sqliteTable("rate_limit_windows", {
  id: text("id").primaryKey(),
  subjectHash: text("subject_hash").notNull(),
  route: text("route").notNull(),
  windowStartedAt: text("window_started_at").notNull(),
  count: integer("count").notNull().default(1),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("idx_rate_limit_windows_subject_route").on(table.subjectHash, table.route),
  index("idx_rate_limit_windows_expires").on(table.expiresAt),
]);

export const securityEvents = sqliteTable("security_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  route: text("route").notNull(),
  status: integer("status").notNull(),
  subjectHash: text("subject_hash"),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_security_events_category_created").on(table.category, table.createdAt)]);

export const errorEvents = sqliteTable("error_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  route: text("route").notNull(),
  fingerprint: text("fingerprint").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_error_events_route_created").on(table.route, table.createdAt)]);

export const operationalAlerts = sqliteTable("operational_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fingerprint: text("fingerprint").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (table) => [
  index("idx_operational_alerts_created").on(table.createdAt),
  index("idx_operational_alerts_resolved_created").on(table.resolvedAt, table.createdAt),
]);

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

export const workspacePlans = sqliteTable("workspace_plans", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  ownerEmail: text("owner_email"),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  payloadJson: text("payload_json").notNull(),
  visibility: text("visibility").notNull().default("private"),
  publicSlug: text("public_slug"),
  archived: integer("archived").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_workspace_plans_owner_updated").on(table.ownerId, table.updatedAt),
  index("idx_workspace_plans_owner_archived").on(table.ownerId, table.archived),
  uniqueIndex("idx_workspace_plans_public_slug").on(table.publicSlug),
]);

export const workspacePlanVersions = sqliteTable("workspace_plan_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: text("plan_id").notNull().references(() => workspacePlans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_workspace_plan_versions_plan_version").on(table.planId, table.version),
]);

export const workspacePlanMembers = sqliteTable("workspace_plan_members", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => workspacePlans.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userId: text("user_id"),
  role: text("role").notNull(),
  invitedBy: text("invited_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_workspace_plan_members_plan_email").on(table.planId, table.email),
  index("idx_workspace_plan_members_email").on(table.email),
  index("idx_workspace_plan_members_user").on(table.userId),
]);

export const workspacePlanComments = sqliteTable("workspace_plan_comments", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => workspacePlans.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorEmail: text("author_email").notNull(),
  body: text("body").notNull(),
  playerId: integer("player_id"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_workspace_plan_comments_plan_created").on(table.planId, table.createdAt)]);

export const workspacePlanActivity = sqliteTable("workspace_plan_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: text("plan_id").notNull().references(() => workspacePlans.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_workspace_plan_activity_plan_created").on(table.planId, table.createdAt)]);

export const notificationPreferences = sqliteTable("notification_preferences", {
  email: text("email").primaryKey(),
  collaborationEnabled: integer("collaboration_enabled").notNull().default(1),
  weeklyEnabled: integer("weekly_enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const notificationJobs = sqliteTable("notification_jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  actorEmail: text("actor_email"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lockedAt: text("locked_at"),
  availableAt: text("available_at").notNull(),
  dedupeKey: text("dedupe_key").notNull(),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
}, (table) => [
  uniqueIndex("idx_notification_jobs_dedupe").on(table.dedupeKey),
  index("idx_notification_jobs_status_available").on(table.status, table.availableAt),
  index("idx_notification_jobs_recipient_created").on(table.recipientEmail, table.createdAt),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => notificationJobs.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_notifications_job").on(table.jobId),
  index("idx_notifications_recipient_created").on(table.recipientEmail, table.createdAt),
  index("idx_notifications_recipient_read").on(table.recipientEmail, table.readAt),
]);

export const notificationDeadLetters = sqliteTable("notification_dead_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  type: text("type").notNull(),
  attempts: integer("attempts").notNull(),
  error: text("error").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_notification_dead_letters_created").on(table.createdAt)]);
