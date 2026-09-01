import { rateLimit } from "../shared";

export const runtime = "edge";

export async function GET(request: Request) {
  const limited = rateLimit(request, 30); if (limited) return limited;
  try {
    const runtimeModule = "cloudflare:workers";
    const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB?: D1Database } };
    if (!env.DB) throw new Error("Analytics database is not bound");
    const [totals, routes] = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS requests, ROUND(AVG(latency_ms), 1) AS average_latency_ms FROM api_events"),
      env.DB.prepare("SELECT route, COUNT(*) AS requests, ROUND(AVG(latency_ms), 1) AS average_latency_ms FROM api_events GROUP BY route ORDER BY requests DESC"),
    ]);
    return Response.json({ totals: totals.results[0] ?? { requests: 0, average_latency_ms: 0 }, routes: routes.results, generatedAt: new Date().toISOString() });
  } catch { return Response.json({ totals: { requests: 0, average_latency_ms: 0 }, routes: [], status: "Analytics begin accumulating after the D1 migration is applied." }); }
}
