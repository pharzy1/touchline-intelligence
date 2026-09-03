import { z } from "zod";
import { apiError, parse, rateLimit, recordEvent } from "../shared";

export const runtime = "edge";
const schema = z.object({ journeyId: z.string().uuid(), category: z.enum(["usability", "accuracy", "accessibility", "bug", "idea"]), rating: z.number().int().min(1).max(5), message: z.string().trim().min(10).max(1200), sourcePath: z.string().startsWith("/").max(120) });
async function digest(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`touchline-journey-v1:${value}`)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function POST(request: Request) {
  const startedAt = Date.now(); const limited = await rateLimit(request, 8); if (limited) return limited;
  try { const input = parse(schema, await request.json()); const runtimeModule = "cloudflare:workers"; const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } }; if (!env.DB) return Response.json({ error: "Feedback storage unavailable" }, { status: 503 }); await env.DB.prepare("INSERT INTO beta_feedback (journey_hash, category, rating, message, source_path, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(await digest(input.journeyId), input.category, input.rating, input.message, input.sourcePath, new Date().toISOString()).run(); await recordEvent("/api/feedback", 201, startedAt); return Response.json({ ok: true }, { status: 201 }); }
  catch (error) { await recordEvent("/api/feedback", 400, startedAt); return apiError(error); }
}
