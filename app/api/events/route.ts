import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";
const schema = z.object({ journeyId: z.string().uuid(), event: z.enum(["player_search", "comparison_opened", "trend_compared", "transfer_scenario", "workspace_save"]), sourcePath: z.string().startsWith("/").max(120) });

async function digest(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`touchline-journey-v1:${value}`)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function POST(request: Request) {
  const startedAt = Date.now(); const limited = await rateLimit(request, 30); if (limited) return limited;
  try {
    const input = parse(schema, await request.json()); const journeyHash = await digest(input.journeyId);
    const runtimeModule = "cloudflare:workers"; const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    await env.DB?.prepare("INSERT INTO product_events (journey_hash, event, source_path, created_at) VALUES (?, ?, ?, ?)").bind(journeyHash, input.event, input.sourcePath, new Date().toISOString()).run();
    await recordEvent("/api/events", 202, startedAt); return new Response(null, { status: 202 });
  } catch (error) { await recordEvent("/api/events", 400, startedAt); return apiError(error); }
}
