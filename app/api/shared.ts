import { ZodError, type ZodType } from "zod";

const buckets = new Map<string, { count: number; resetAt: number }>();

async function subjectHash(request: Request, key: string) {
  const user = request.headers.get("oai-authenticated-user-id");
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${key}:touchline-rate-v1:${day}:${user ? `user:${user}` : `ip:${ip}`}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function memoryRateLimit(key: string, limit: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + 60_000 }); return null; }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  return Response.json({ error: "Too many requests. Try again in a minute.", code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)) } });
}

export async function rateLimit(request: Request, limit = 60) {
  const route = new URL(request.url).pathname; const now = Date.now(); let hash = await subjectHash(request, "touchline-local-development");
  const windowStartedAt = new Date(Math.floor(now / 60_000) * 60_000).toISOString(); const expiresAt = new Date(now + 172_800_000).toISOString();
  let id = `${hash}:${route}:${windowStartedAt}`;
  try {
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database; RATE_LIMIT_HASH_KEY?: string } };
    if (env.RATE_LIMIT_HASH_KEY) { hash = await subjectHash(request, env.RATE_LIMIT_HASH_KEY); id = `${hash}:${route}:${windowStartedAt}`; }
    if (!env.DB) return memoryRateLimit(id, limit);
    const row = await env.DB.prepare("INSERT INTO rate_limit_windows (id, subject_hash, route, window_started_at, count, expires_at) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1 RETURNING count").bind(id, hash, route, windowStartedAt, expiresAt).first<{ count: number }>();
    if ((row?.count ?? 1) <= limit) return null;
    await recordSecurityEvent("rate_limited", route, 429, hash, `limit=${limit}`);
    return Response.json({ error: "Too many requests. Try again in a minute.", code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "60" } });
  } catch { return memoryRateLimit(id, limit); }
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

export async function recordSecurityEvent(category: string, route: string, status: number, hash: string | null, detail = "") {
  console.warn(JSON.stringify({ event: "security_event", category, route, status, at: new Date().toISOString() }));
  try {
    const runtimeModule = "cloudflare:workers"; const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    await env.DB?.prepare("INSERT INTO security_events (category, route, status, subject_hash, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(category, route, status, hash, detail.slice(0, 160), new Date().toISOString()).run();
  } catch { /* Security telemetry must not block the response. */ }
}

export async function recordError(route: string, error: unknown) {
  const message = (error instanceof Error ? error.message : "Unknown failure").replace(/[\r\n]+/g, " ").slice(0, 240);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${route}:${message}`));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  console.error(JSON.stringify({ event: "application_error", route, fingerprint, message, at: new Date().toISOString() }));
  try {
    const runtimeModule = "cloudflare:workers"; const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    await env.DB?.prepare("INSERT INTO error_events (route, fingerprint, message, created_at) VALUES (?, ?, ?, ?)").bind(route, fingerprint, message, new Date().toISOString()).run();
  } catch { /* Error reporting must preserve the original product path. */ }
  return fingerprint;
}
