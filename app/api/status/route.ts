import matchModel from "../../../data/match-model.json";
import scoutingModel from "../../../data/scouting-index.json";
import valuationModel from "../../../data/valuation-model.json";
import { rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type SyncRow = { id: number; trigger: string; status: string; completed_at: string; fixtures_fetched: number; created_candidates: number; graded_candidates: number; duration_ms: number };
type FixtureSummary = { scheduled: number; graded: number; latest_source_update: string | null };
type EventRow = { route: string; status: number; latency_ms: number; created_at: string };
const emptyTelemetry = { windowHours: 168, requests: 0, errors: 0, errorRate: 0, medianLatencyMs: 0, p95LatencyMs: 0, routes: [] as Array<{ route: string; feature: string; requests: number; errors: number; errorRate: number; averageLatencyMs: number }>, daily: [] as Array<{ day: string; requests: number; errors: number }>, records: { apiEvents: 0, predictions: 0, fixturePredictions: 0, syncRuns: 0 }, syncReliability: { attempts: 0, successes: 0, successRate: null as number | null, averageDurationMs: null as number | null } };

function percentile(values: number[], ratio: number) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)]; }
function featureName(route: string) { return ({ "/api/predict": "Valuation", "/api/scouting": "Scouting", "/api/matches": "Match forecasting", "/api/performance": "Live performance", "/api/status": "System status", "/api/stats": "Telemetry API" } as Record<string, string>)[route] ?? route; }

function health(lastSuccessAt: string | null, latestStatus: string | null) {
  if (!lastSuccessAt) return { state: "initializing", label: "Awaiting first sync" };
  const ageHours = (Date.now() - new Date(lastSuccessAt).getTime()) / 3_600_000;
  if (latestStatus === "failed" && ageHours <= 18) return { state: "degraded", label: "Sync degraded" };
  if (ageHours <= 8) return { state: "operational", label: "All systems operational" };
  if (ageHours <= 18) return { state: "delayed", label: "Sync delayed" };
  return { state: "stale", label: "Fixture data stale" };
}

export async function GET(request: Request) {
  const startedAt = Date.now(); const limited = rateLimit(request, 30); if (limited) return limited;
  try {
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    if (!env.DB) throw new Error("Status database is not bound");
    let runs: SyncRow[] = [];
    try { runs = (await env.DB.prepare("SELECT id, trigger, status, completed_at, fixtures_fetched, created_candidates, graded_candidates, duration_ms FROM sync_runs ORDER BY completed_at DESC LIMIT 8").all<SyncRow>()).results; } catch { /* The first deploy may precede the first instrumented run. */ }
    const [fixtureResult, eventResult, totalsResult, routeResult, dailyResult, recordResult, syncResult] = await Promise.all([
      env.DB.prepare("SELECT status, COUNT(*) AS count, MAX(source_updated_at) AS latest_source_update FROM fixture_predictions GROUP BY status").all<{ status: string; count: number; latest_source_update: string | null }>(),
      env.DB.prepare("SELECT route, status, latency_ms, created_at FROM api_events WHERE julianday(created_at) >= julianday('now', '-7 days') ORDER BY created_at DESC LIMIT 5000").all<EventRow>(),
      env.DB.prepare("SELECT COUNT(*) AS requests, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors FROM api_events WHERE julianday(created_at) >= julianday('now', '-7 days')").first<{ requests: number; errors: number }>(),
      env.DB.prepare("SELECT route, COUNT(*) AS requests, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors, ROUND(AVG(latency_ms), 0) AS average_latency_ms FROM api_events WHERE julianday(created_at) >= julianday('now', '-7 days') GROUP BY route ORDER BY requests DESC").all<{ route: string; requests: number; errors: number; average_latency_ms: number }>(),
      env.DB.prepare("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS requests, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors FROM api_events WHERE julianday(created_at) >= julianday('now', '-7 days') GROUP BY substr(created_at, 1, 10) ORDER BY day").all<{ day: string; requests: number; errors: number }>(),
      env.DB.prepare("SELECT (SELECT COUNT(*) FROM api_events) AS api_events, (SELECT COUNT(*) FROM predictions) AS predictions, (SELECT COUNT(*) FROM fixture_predictions) AS fixture_predictions, (SELECT COUNT(*) FROM sync_runs) AS sync_runs").first<{ api_events: number; predictions: number; fixture_predictions: number; sync_runs: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS attempts, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successes, ROUND(AVG(CASE WHEN status = 'success' THEN duration_ms END), 1) AS average_duration_ms FROM sync_runs WHERE completed_at >= datetime('now', '-30 days')").first<{ attempts: number; successes: number; average_duration_ms: number | null }>(),
    ]);
    const fixtureRows = fixtureResult.results;
    const fixtures: FixtureSummary = { scheduled: 0, graded: 0, latest_source_update: null };
    for (const row of fixtureRows) { if (row.status === "scheduled") fixtures.scheduled = row.count; if (row.status === "graded") fixtures.graded = row.count; if (row.latest_source_update && (!fixtures.latest_source_update || row.latest_source_update > fixtures.latest_source_update)) fixtures.latest_source_update = row.latest_source_update; }
    const lastSuccessAt = runs.find((run) => run.status === "success")?.completed_at ?? fixtures.latest_source_update;
    const current = health(lastSuccessAt, runs[0]?.status ?? (lastSuccessAt ? "success" : null));
    const events = eventResult.results; const requests = totalsResult?.requests ?? 0; const errors = totalsResult?.errors ?? 0;
    const syncAttempts = syncResult?.attempts ?? 0; const syncSuccesses = syncResult?.successes ?? 0;
    const telemetry = { windowHours: 168, requests, errors, errorRate: requests ? errors / requests : 0, medianLatencyMs: percentile(events.map((event) => event.latency_ms), .5), p95LatencyMs: percentile(events.map((event) => event.latency_ms), .95), routes: routeResult.results.map((row) => ({ route: row.route, feature: featureName(row.route), requests: row.requests, errors: row.errors, errorRate: row.requests ? row.errors / row.requests : 0, averageLatencyMs: row.average_latency_ms })), daily: dailyResult.results, records: { apiEvents: recordResult?.api_events ?? 0, predictions: recordResult?.predictions ?? 0, fixturePredictions: recordResult?.fixture_predictions ?? 0, syncRuns: recordResult?.sync_runs ?? 0 }, syncReliability: { attempts: syncAttempts, successes: syncSuccesses, successRate: syncAttempts ? syncSuccesses / syncAttempts : null, averageDurationMs: syncResult?.average_duration_ms ?? null } };
    await recordEvent("/api/status", 200, startedAt);
    return Response.json({ generatedAt: new Date().toISOString(), ...current, cadenceHours: 6, lastSuccessAt, lastAttemptAt: runs[0]?.completed_at ?? lastSuccessAt, nextExpectedAt: lastSuccessAt ? new Date(new Date(lastSuccessAt).getTime() + 6 * 3_600_000).toISOString() : null, fixtures, runs, telemetry, models: { valuation: valuationModel.version, scouting: scoutingModel.version, matches: matchModel.version }, source: "Fantasy Premier League" });
  } catch {
    return Response.json({ generatedAt: new Date().toISOString(), state: "initializing", label: "Awaiting production telemetry", cadenceHours: 6, lastSuccessAt: null, lastAttemptAt: null, nextExpectedAt: null, fixtures: { scheduled: 0, graded: 0, latest_source_update: null }, runs: [], telemetry: emptyTelemetry, models: { valuation: valuationModel.version, scouting: scoutingModel.version, matches: matchModel.version }, source: "Fantasy Premier League" });
  }
}
