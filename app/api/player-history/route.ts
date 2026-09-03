import histories from "../../../data/player-histories.json";
import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";

export async function GET(request: Request) {
  const startedAt = Date.now(); const limited = await rateLimit(request, 90); if (limited) return limited;
  try {
    const input = parse(z.object({ ids: z.string().regex(/^\d+(,\d+){0,2}$/) }), Object.fromEntries(new URL(request.url).searchParams));
    const ids = new Set(input.ids.split(",").map(Number));
    const players = histories.players.filter((player) => ids.has(player.player_id));
    await recordEvent("/api/player-history", 200, startedAt);
    return Response.json({ version: histories.version, modelVersion: histories.model_version, methodology: histories.methodology, players });
  } catch (error) {
    await recordEvent("/api/player-history", 400, startedAt); return apiError(error);
  }
}
