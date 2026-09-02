/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import matchModel from "../data/match-model.json";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SYNC_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController { scheduledTime: number; cron: string; }

type ModelTeam = (typeof matchModel.teams)[number];
type FplFixture = { id: number; event: number | null; kickoff_time: string | null; team_h: number; team_a: number; team_h_score: number | null; team_a_score: number | null; finished: boolean; started: boolean };
type FplTeam = { id: number; name: string };

const aliases: Record<string, string> = {
  "bournemouth": "AFC Bournemouth", "arsenal": "Arsenal FC", "aston villa": "Aston Villa", "brentford": "Brentford FC", "brighton": "Brighton & Hove Albion",
  "burnley": "Burnley FC", "chelsea": "Chelsea FC", "crystal palace": "Crystal Palace", "everton": "Everton FC", "fulham": "Fulham FC", "leeds": "Leeds United", "liverpool": "Liverpool FC",
  "man city": "Manchester City", "man utd": "Manchester United", "newcastle": "Newcastle United", "nott'm forest": "Nottingham Forest", "sunderland": "Sunderland AFC",
  "spurs": "Tottenham Hotspur", "west ham": "West Ham United", "wolves": "Wolverhampton Wanderers",
};

function softmax(values: number[]) { const peak = Math.max(...values); const exp = values.map((value) => Math.exp(value - peak)); const total = exp.reduce((a, b) => a + b, 0); return exp.map((value) => value / total); }
function fixtureProbabilities(home: ModelTeam, away: ModelTeam) {
  const raw = [home.elo - away.elo, home.points_5, away.points_5, home.goal_difference_5, away.goal_difference_5, home.goals_for_5, away.goals_for_5, home.goals_against_5, away.goals_against_5];
  const design = [1, ...raw.map((value, index) => (value - matchModel.mean[index]) / matchModel.scale[index])];
  return softmax(matchModel.classes.map((_, classIndex) => design.reduce((total, value, featureIndex) => total + value * matchModel.weights[featureIndex][classIndex], 0) / matchModel.temperature));
}

async function syncFixtures(env: Env) {
  const headers = { "user-agent": "TouchlineIntelligence/1.0 (+https://touchlineintelligence.com)" };
  const [bootstrapResponse, fixturesResponse] = await Promise.all([
    fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers }),
    fetch("https://fantasy.premierleague.com/api/fixtures/", { headers }),
  ]);
  if (!bootstrapResponse.ok || !fixturesResponse.ok) throw new Error(`Fixture provider failed: ${bootstrapResponse.status}/${fixturesResponse.status}`);
  const bootstrap = await bootstrapResponse.json() as { teams: FplTeam[] };
  const fixtures = await fixturesResponse.json() as FplFixture[];
  const names = new Map(bootstrap.teams.map((team) => [team.id, team.name]));
  const modelTeams = new Map(matchModel.teams.map((team) => [team.name, team]));
  const now = new Date(); const nowIso = now.toISOString(); const forecastHorizon = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); const statements: D1PreparedStatement[] = [env.DB.prepare("DELETE FROM fixture_predictions WHERE status = 'scheduled' AND kickoff_at > ?").bind(forecastHorizon.toISOString())];
  let created = 0; let graded = 0; let skipped = 0;

  for (const fixture of fixtures) {
    const homeName = names.get(fixture.team_h); const awayName = names.get(fixture.team_a);
    const home = homeName ? modelTeams.get(aliases[homeName.toLowerCase()] ?? homeName) : undefined;
    const away = awayName ? modelTeams.get(aliases[awayName.toLowerCase()] ?? awayName) : undefined;
    if (!homeName || !awayName || !home || !away || !fixture.kickoff_time) { skipped += 1; continue; }
    const kickoff = new Date(fixture.kickoff_time);
    if (!fixture.finished && kickoff > now && kickoff <= forecastHorizon) {
      const probabilities = fixtureProbabilities(home, away); const predictedClass = matchModel.classes[probabilities.indexOf(Math.max(...probabilities))];
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO fixture_predictions (fixture_id, gameweek, home_team, away_team, kickoff_at, status, model_version, predicted_at, home_probability, draw_probability, away_probability, predicted_class, source_updated_at) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?)`).bind(fixture.id, fixture.event, homeName, awayName, fixture.kickoff_time, matchModel.version, nowIso, probabilities[0], probabilities[1], probabilities[2], predictedClass, nowIso));
      statements.push(env.DB.prepare("UPDATE fixture_predictions SET gameweek = ?, kickoff_at = ?, status = 'scheduled', source_updated_at = ? WHERE fixture_id = ? AND actual_class IS NULL").bind(fixture.event, fixture.kickoff_time, nowIso, fixture.id));
      created += 1;
    } else if (fixture.finished && fixture.team_h_score !== null && fixture.team_a_score !== null) {
      const actualClass = fixture.team_h_score > fixture.team_a_score ? "home_win" : fixture.team_h_score < fixture.team_a_score ? "away_win" : "draw";
      const target = matchModel.classes.map((value) => value === actualClass ? 1 : 0);
      statements.push(env.DB.prepare(`UPDATE fixture_predictions SET gameweek = ?, kickoff_at = ?, status = 'graded', home_score = ?, away_score = ?, actual_class = ?, correct = CASE WHEN predicted_class = ? THEN 1 ELSE 0 END, brier_score = ((home_probability - ?) * (home_probability - ?) + (draw_probability - ?) * (draw_probability - ?) + (away_probability - ?) * (away_probability - ?)), scored_at = COALESCE(scored_at, ?), source_updated_at = ? WHERE fixture_id = ? AND actual_class IS NULL`).bind(fixture.event, fixture.kickoff_time, fixture.team_h_score, fixture.team_a_score, actualClass, actualClass, target[0], target[0], target[1], target[1], target[2], target[2], nowIso, nowIso, fixture.id));
      graded += 1;
    }
  }
  for (let index = 0; index < statements.length; index += 75) await env.DB.batch(statements.slice(index, index + 75));
  const summary = { fixturesFetched: fixtures.length, createdCandidates: created, gradedCandidates: graded, skipped, statements: statements.length, at: nowIso };
  console.log(JSON.stringify({ event: "fixture_sync", ...summary }));
  return summary;
}

async function runFixtureSync(env: Env, trigger: "cron" | "manual") {
  const startedAt = new Date().toISOString(); const started = Date.now();
  try {
    const summary = await syncFixtures(env); const completedAt = new Date().toISOString(); const durationMs = Date.now() - started;
    await env.DB.prepare("INSERT INTO sync_runs (source, trigger, status, started_at, completed_at, fixtures_fetched, created_candidates, graded_candidates, skipped, statements, duration_ms, error_message) VALUES (?, ?, 'success', ?, ?, ?, ?, ?, ?, ?, ?, NULL)").bind("Fantasy Premier League", trigger, startedAt, completedAt, summary.fixturesFetched, summary.createdCandidates, summary.gradedCandidates, summary.skipped, summary.statements, durationMs).run();
    return { ...summary, trigger, durationMs };
  } catch (error) {
    const completedAt = new Date().toISOString(); const durationMs = Date.now() - started; const message = (error instanceof Error ? error.message : "Unknown sync failure").replace(/[\r\n]+/g, " ").slice(0, 240);
    try { await env.DB.prepare("INSERT INTO sync_runs (source, trigger, status, started_at, completed_at, fixtures_fetched, created_candidates, graded_candidates, skipped, statements, duration_ms, error_message) VALUES (?, ?, 'failed', ?, ?, 0, 0, 0, 0, 0, ?, ?)").bind("Fantasy Premier League", trigger, startedAt, completedAt, durationMs, message).run(); } catch { /* Preserve the original provider failure. */ }
    console.error(JSON.stringify({ event: "fixture_sync_failed", trigger, message, durationMs }));
    throw error;
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/internal/fixture-sync" && request.method === "POST") {
      if (!env.SYNC_SECRET || request.headers.get("authorization") !== `Bearer ${env.SYNC_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
      try { return Response.json({ ok: true, ...(await runFixtureSync(env, "manual")) }); }
      catch { return Response.json({ error: "Fixture sync failed" }, { status: 502 }); }
    }

    if (url.pathname === "/api/internal/diagnostics" && request.method === "GET") {
      if (!env.SYNC_SECRET || request.headers.get("authorization") !== `Bearer ${env.SYNC_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const [runs, errors, fixtures] = await Promise.all([
        env.DB.prepare("SELECT id, source, trigger, status, started_at, completed_at, fixtures_fetched, created_candidates, graded_candidates, skipped, statements, duration_ms, error_message FROM sync_runs ORDER BY completed_at DESC LIMIT 20").all(),
        env.DB.prepare("SELECT route, status, COUNT(*) AS requests, ROUND(AVG(latency_ms), 1) AS average_latency_ms FROM api_events WHERE status >= 400 AND created_at >= datetime('now', '-24 hours') GROUP BY route, status ORDER BY requests DESC").all(),
        env.DB.prepare("SELECT status, COUNT(*) AS count, MAX(source_updated_at) AS latest_source_update FROM fixture_predictions GROUP BY status").all(),
      ]);
      return Response.json({ generatedAt: new Date().toISOString(), syncRuns: runs.results, recentApiErrors: errors.results, fixtures: fixtures.results });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runFixtureSync(env, "cron"));
  },
};

export default worker;
