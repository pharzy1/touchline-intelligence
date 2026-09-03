import { operationsContext } from "./access";
import { rateLimit, recordError } from "../shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await rateLimit(request, 30); if (limited) return limited;
  const context = await operationsContext(); if ("error" in context) return context.error;
  try {
    const [summary, routes, errors, security, limits, syncs, alerts, records, deadLetters, funnel, feedback] = await Promise.all([
      context.db.prepare("SELECT COUNT(*) AS requests, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors, ROUND(AVG(latency_ms), 1) AS average_latency_ms FROM api_events WHERE julianday(created_at) >= julianday('now', '-24 hours')").first(),
      context.db.prepare("SELECT route, COUNT(*) AS requests, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors, ROUND(AVG(latency_ms), 1) AS average_latency_ms, MAX(latency_ms) AS max_latency_ms FROM api_events WHERE julianday(created_at) >= julianday('now', '-24 hours') GROUP BY route ORDER BY requests DESC").all(),
      context.db.prepare("SELECT fingerprint, route, message, COUNT(*) AS occurrences, MAX(created_at) AS last_seen FROM error_events WHERE julianday(created_at) >= julianday('now', '-7 days') GROUP BY fingerprint, route, message ORDER BY last_seen DESC LIMIT 30").all(),
      context.db.prepare("SELECT category, route, status, COUNT(*) AS occurrences, MAX(created_at) AS last_seen FROM security_events WHERE julianday(created_at) >= julianday('now', '-7 days') GROUP BY category, route, status ORDER BY last_seen DESC LIMIT 30").all(),
      context.db.prepare("SELECT COUNT(*) AS active_windows, SUM(CASE WHEN count > 1 THEN count - 1 ELSE 0 END) AS repeated_requests, MAX(count) AS busiest_window FROM rate_limit_windows WHERE julianday(expires_at) > julianday('now')").first(),
      context.db.prepare("SELECT id, source, trigger, status, completed_at, duration_ms, error_message FROM sync_runs ORDER BY completed_at DESC LIMIT 12").all(),
      context.db.prepare("SELECT id, fingerprint, severity, title, detail, created_at, resolved_at FROM operational_alerts ORDER BY created_at DESC LIMIT 30").all(),
      context.db.prepare("SELECT (SELECT COUNT(*) FROM workspace_plans) AS plans, (SELECT COUNT(*) FROM workspace_plan_members) AS collaborators, (SELECT COUNT(*) FROM workspace_plan_comments) AS comments, (SELECT COUNT(*) FROM fixture_predictions) AS fixtures").first(),
      context.db.prepare("SELECT id, job_id, type, attempts, error, created_at FROM notification_dead_letters ORDER BY created_at DESC LIMIT 20").all(),
      context.db.prepare("SELECT event, COUNT(*) AS events, COUNT(DISTINCT journey_hash) AS journeys FROM product_events WHERE julianday(created_at) >= julianday('now', '-30 days') GROUP BY event ORDER BY CASE event WHEN 'player_search' THEN 1 WHEN 'comparison_opened' THEN 2 WHEN 'trend_compared' THEN 3 WHEN 'transfer_scenario' THEN 4 WHEN 'workspace_save' THEN 5 END").all(),
      context.db.prepare("SELECT category, ROUND(AVG(rating), 2) AS average_rating, COUNT(*) AS responses, MAX(created_at) AS last_response FROM beta_feedback WHERE julianday(created_at) >= julianday('now', '-30 days') GROUP BY category ORDER BY responses DESC").all(),
    ]);
    return Response.json({ generatedAt: new Date().toISOString(), admin: context.user.email, database: { status: "operational" }, retention: { apiEventsDays: 30, productEventsDays: 30, feedbackDays: 90, securityEventsDays: 30, errorEventsDays: 30, rateLimitHours: 48 }, summary, routes: routes.results, errors: errors.results, security: security.results, rateLimits: limits, syncRuns: syncs.results, alerts: alerts.results, deadLetters: deadLetters.results, funnel: funnel.results, feedback: feedback.results, records });
  } catch (error) {
    const fingerprint = await recordError("/api/operations", error);
    return Response.json({ error: "Operations data unavailable", fingerprint }, { status: 500 });
  }
}
