import model from "../../../data/match-model.json";
import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type Team = (typeof model.teams)[number];

const featureLabels: Record<string, string> = {
  elo_difference: "long-run team strength", home_points_5: "home recent results", away_points_5: "away recent results",
  home_goal_difference_5: "home goal difference", away_goal_difference_5: "away goal difference",
  home_goals_for_5: "home scoring form", away_goals_for_5: "away scoring form",
  home_goals_against_5: "home defensive form", away_goals_against_5: "away defensive form",
};

function softmax(values: number[]) {
  const peak = Math.max(...values); const exp = values.map((value) => Math.exp(value - peak)); const total = exp.reduce((a, b) => a + b, 0); return exp.map((value) => value / total);
}

function teamFeatures(home: Team, away: Team) {
  return [home.elo - away.elo, home.points_5, away.points_5, home.goal_difference_5, away.goal_difference_5, home.goals_for_5, away.goals_for_5, home.goals_against_5, away.goals_against_5];
}

export async function GET(request: Request) {
  const startedAt = Date.now(); const limited = rateLimit(request, 90); if (limited) return limited;
  const params = new URL(request.url).searchParams;
  let ids: { home_id?: number; away_id?: number };
  try { ids = parse(z.object({ home_id: z.coerce.number().int().positive().optional(), away_id: z.coerce.number().int().positive().optional() }), Object.fromEntries(params)); } catch (error) { return apiError(error); }
  const homeId = ids.home_id ?? 0; const awayId = ids.away_id ?? 0;
  if (!homeId && !awayId) return Response.json({ version: model.version, teams: model.teams, metrics: model.metrics, split: model.split });
  if (!homeId || !awayId || homeId === awayId) return Response.json({ error: "Choose two different teams" }, { status: 400 });
  const home = model.teams.find((team) => team.club_id === homeId); const away = model.teams.find((team) => team.club_id === awayId);
  if (!home || !away) return Response.json({ error: "Team not found" }, { status: 404 });
  const raw = teamFeatures(home, away); const standardized = raw.map((value, i) => (value - model.mean[i]) / model.scale[i]); const design = [1, ...standardized];
  const logits = model.classes.map((_, classIndex) => design.reduce((total, value, featureIndex) => total + value * model.weights[featureIndex][classIndex], 0) / model.temperature);
  const probabilities = softmax(logits);
  const contributions = model.features.map((feature, i) => ({ label: featureLabels[feature] ?? feature, edge: standardized[i] * (model.weights[i + 1][0] - model.weights[i + 1][2]) })).sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge)).slice(0, 4).map((item) => ({ ...item, favors: item.edge >= 0 ? "home" : "away" }));
  await recordEvent("/api/matches", 200, startedAt);
  return Response.json({ version: model.version, home, away, probabilities: { home_win: probabilities[0], draw: probabilities[1], away_win: probabilities[2] }, factors: contributions, metrics: model.metrics, calibrated: true });
}
