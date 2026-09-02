import matchModel from "../../../data/match-model.json";
import scoutingModel from "../../../data/scouting-index.json";
import valuationModel from "../../../data/valuation-model.json";
import { rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type SyncRow = { id: number; trigger: string; status: string; completed_at: string; fixtures_fetched: number; created_candidates: number; graded_candidates: number; duration_ms: number };
type FixtureSummary = { scheduled: number; graded: number; latest_source_update: string | null };

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
    const fixtureRows = (await env.DB.prepare("SELECT status, COUNT(*) AS count, MAX(source_updated_at) AS latest_source_update FROM fixture_predictions GROUP BY status").all<{ status: string; count: number; latest_source_update: string | null }>()).results;
    const fixtures: FixtureSummary = { scheduled: 0, graded: 0, latest_source_update: null };
    for (const row of fixtureRows) { if (row.status === "scheduled") fixtures.scheduled = row.count; if (row.status === "graded") fixtures.graded = row.count; if (row.latest_source_update && (!fixtures.latest_source_update || row.latest_source_update > fixtures.latest_source_update)) fixtures.latest_source_update = row.latest_source_update; }
    const lastSuccessAt = runs.find((run) => run.status === "success")?.completed_at ?? fixtures.latest_source_update;
    const current = health(lastSuccessAt, runs[0]?.status ?? (lastSuccessAt ? "success" : null));
    await recordEvent("/api/status", 200, startedAt);
    return Response.json({ generatedAt: new Date().toISOString(), ...current, cadenceHours: 6, lastSuccessAt, lastAttemptAt: runs[0]?.completed_at ?? lastSuccessAt, nextExpectedAt: lastSuccessAt ? new Date(new Date(lastSuccessAt).getTime() + 6 * 3_600_000).toISOString() : null, fixtures, runs, models: { valuation: valuationModel.version, scouting: scoutingModel.version, matches: matchModel.version }, source: "Fantasy Premier League" });
  } catch {
    return Response.json({ generatedAt: new Date().toISOString(), state: "initializing", label: "Awaiting production telemetry", cadenceHours: 6, lastSuccessAt: null, lastAttemptAt: null, nextExpectedAt: null, fixtures: { scheduled: 0, graded: 0, latest_source_update: null }, runs: [], models: { valuation: valuationModel.version, scouting: scoutingModel.version, matches: matchModel.version }, source: "Fantasy Premier League" });
  }
}
