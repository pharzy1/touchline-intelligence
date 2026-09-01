import { ZodError, type ZodType } from "zod";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request, limit = 60) {
  const now = Date.now();
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = `${ip}:${new URL(request.url).pathname}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + 60_000 }); return null; }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  return Response.json({ error: "Too many requests. Try again in a minute.", code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)) } });
}

export function parse<T>(schema: ZodType<T>, value: unknown): T { return schema.parse(value); }

export function apiError(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", issues: error.issues }, { status: 400 });
  return Response.json({ error: error instanceof Error ? error.message : "Invalid request", code: "BAD_REQUEST" }, { status: 400 });
}

export async function recordEvent(route: string, status: number, startedAt: number) {
  const latencyMs = Date.now() - startedAt;
  console.log(JSON.stringify({ event: "api_request", route, status, latencyMs, at: new Date().toISOString() }));
  try {
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    await env.DB?.prepare("INSERT INTO api_events (route, status, latency_ms, created_at) VALUES (?, ?, ?, ?)").bind(route, status, latencyMs, new Date().toISOString()).run();
  } catch { /* Analytics must never block the product path. */ }
}
