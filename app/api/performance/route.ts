import model from "../../../data/match-model.json";
import { rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type Row = { fixture_id: number; gameweek: number | null; home_team: string; away_team: string; kickoff_at: string | null; status: string; predicted_at: string; home_probability: number; draw_probability: number; away_probability: number; predicted_class: string; home_score: number | null; away_score: number | null; actual_class: string | null; correct: number | null; brier_score: number | null; scored_at: string | null };

export async function GET(request: Request) {
  const startedAt = Date.now(); const limited = rateLimit(request, 30); if (limited) return limited;
  try {
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    if (!env.DB) throw new Error("Performance database is not bound");
    const result = await env.DB.prepare("SELECT fixture_id, gameweek, home_team, away_team, kickoff_at, status, predicted_at, home_probability, draw_probability, away_probability, predicted_class, home_score, away_score, actual_class, correct, brier_score, scored_at FROM fixture_predictions ORDER BY kickoff_at DESC LIMIT 500").all<Row>();
    const fixtures = result.results; const graded = fixtures.filter((row) => row.actual_class !== null).reverse(); let wins = 0;
    const timeline = graded.map((row, index) => { wins += row.correct ?? 0; return { fixtureId: row.fixture_id, kickoffAt: row.kickoff_at, accuracy: wins / (index + 1), correct: row.correct === 1 }; });
    const next = fixtures.filter((row) => row.status === "scheduled").sort((a, b) => String(a.kickoff_at).localeCompare(String(b.kickoff_at))).slice(0, 8);
    const recent = fixtures.filter((row) => row.actual_class !== null).slice(0, 12);
    const summary = { predictions: fixtures.length, graded: graded.length, accuracy: graded.length ? wins / graded.length : null, brierScore: graded.length ? graded.reduce((sum, row) => sum + (row.brier_score ?? 0), 0) / graded.length : null, lastScoredAt: recent[0]?.scored_at ?? null };
    await recordEvent("/api/performance", 200, startedAt);
    return Response.json({ version: model.version, source: "Fantasy Premier League fixtures", summary, timeline, next, recent, policy: "Probabilities are immutable after their pre-kickoff insert; only schedule and result fields may change." });
  } catch {
    return Response.json({ version: model.version, summary: { predictions: 0, graded: 0, accuracy: null, brierScore: null, lastScoredAt: null }, timeline: [], next: [], recent: [], status: "The first scheduled fixture sync has not completed yet." });
  }
}
