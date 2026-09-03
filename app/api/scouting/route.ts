import index from "../../../data/scouting-index.json";
import imageManifest from "../../../data/player-images.json";
import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

type Player = (typeof index.players)[number];

const labels: Record<string, string> = {
  age: "age profile", appearances: "availability", goals_per_90: "scoring rate",
  assists_per_90: "creative output", minutes_per_appearance: "starting involvement", international_caps: "international experience",
};

function summary(player: Player) {
  const { vector: _vector, ...rest } = player;
  const photo = (imageManifest.players as Record<string, { src: string; author: string; license: string; licenseUrl: string; sourceUrl: string }>)[String(player.player_id)];
  return { ...rest, photo: photo ?? null };
}

function distance(left: Player, right: Player) {
  return Math.sqrt(left.vector.reduce((total, value, i) => total + (value - right.vector[i]) ** 2, 0) / left.vector.length);
}

export async function GET(request: Request) {
  const startedAt = Date.now(); const limited = await rateLimit(request, 90); if (limited) return limited;
  const params = new URL(request.url).searchParams;
  let input: { player_id?: number; q?: string; position?: string; max_age?: number; max_value_eur?: number; club?: string };
  try { input = parse(z.object({ player_id: z.coerce.number().int().positive().optional(), q: z.string().max(80).optional(), position: z.enum(["Attack", "Midfield", "Defender", "Goalkeeper", ""]).optional(), max_age: z.coerce.number().int().min(16).max(99).optional(), max_value_eur: z.coerce.number().int().positive().optional(), club: z.string().max(80).optional() }), Object.fromEntries(params)); } catch (error) { return apiError(error); }
  const playerId = input.player_id ?? 0;
  if (!playerId) {
    const query = (input.q ?? "").trim().toLowerCase();
    const position = input.position ?? "";
    const players = index.players
      .filter((player) => (!query || `${player.name} ${player.club}`.toLowerCase().includes(query)) && (!position || player.position === position))
      .sort((a, b) => b.market_value_eur - a.market_value_eur)
      .slice(0, 20)
      .map(summary);
    await recordEvent("/api/scouting", 200, startedAt); return Response.json({ version: index.version, players });
  }

  const selected = index.players.find((player) => player.player_id === playerId);
  if (!selected) return Response.json({ error: "Player not found" }, { status: 404 });
  const maxAge = input.max_age ?? 99;
  const maxValue = input.max_value_eur ?? Number.MAX_SAFE_INTEGER;
  const club = input.club ?? "any";
  const matches = index.players
    .filter((player) => player.player_id !== selected.player_id && player.position === selected.position && player.age <= maxAge && player.market_value_eur <= maxValue && (club === "any" || (club === "different" ? player.club !== selected.club : player.club === club)))
    .map((player) => {
      const metricDistance = distance(selected, player);
      const closest = index.features
        .map((feature, i) => ({ feature, gap: Math.abs(selected.vector[i] - player.vector[i]) }))
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 3)
        .map(({ feature }) => labels[feature] ?? feature);
      return { ...summary(player), similarity: Math.round(Math.exp(-metricDistance / 2.2) * 100), shared_signals: closest, distance: metricDistance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(({ distance: _distance, ...player }) => player);
  await recordEvent("/api/scouting", 200, startedAt); return Response.json({ version: index.version, method: index.method, features: index.features, selected: summary(selected), matches });
}
