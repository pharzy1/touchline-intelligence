import index from "../../../data/scouting-index.json";

export const runtime = "edge";

type Player = (typeof index.players)[number];

const labels: Record<string, string> = {
  age: "age profile", appearances: "availability", goals_per_90: "scoring rate",
  assists_per_90: "creative output", minutes_per_appearance: "starting involvement", international_caps: "international experience",
};

function summary(player: Player) {
  const { vector: _vector, ...rest } = player;
  return rest;
}

function distance(left: Player, right: Player) {
  return Math.sqrt(left.vector.reduce((total, value, i) => total + (value - right.vector[i]) ** 2, 0) / left.vector.length);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const playerId = Number(params.get("player_id"));
  if (!playerId) {
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const position = params.get("position") ?? "";
    const players = index.players
      .filter((player) => (!query || `${player.name} ${player.club}`.toLowerCase().includes(query)) && (!position || player.position === position))
      .sort((a, b) => b.market_value_eur - a.market_value_eur)
      .slice(0, 20)
      .map(summary);
    return Response.json({ version: index.version, players });
  }

  const selected = index.players.find((player) => player.player_id === playerId);
  if (!selected) return Response.json({ error: "Player not found" }, { status: 404 });
  const maxAge = Number(params.get("max_age")) || 99;
  const maxValue = Number(params.get("max_value_eur")) || Number.MAX_SAFE_INTEGER;
  const club = params.get("club") ?? "any";
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
  return Response.json({ version: index.version, method: index.method, features: index.features, selected: summary(selected), matches });
}
