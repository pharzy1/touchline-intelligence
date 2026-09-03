import type { Metadata } from "next";
import { SiteNav } from "../../site-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared Plan — Touchline", description: "A read-only Touchline squad or transfer decision." };
type Params = Promise<{ slug: string }>;

export default async function SharedPlanPage({ params }: { params: Params }) {
  const runtimeModule = "cloudflare:workers"; const { env } = await import(/* @vite-ignore */ runtimeModule) as { env: { DB: D1Database } };
  const { slug } = await params; const row = await env.DB.prepare("SELECT kind, name, description, payload_json, version, updated_at FROM workspace_plans WHERE public_slug = ? AND visibility = 'public' AND archived = 0").bind(slug).first<{ kind: string; name: string; description: string; payload_json: string; version: number; updated_at: string }>();
  if (!row) return <main className="shared-page"><SiteNav active="workspace" /><section className="shared-missing shell"><span>READ-ONLY WORKSPACE</span><h1>This shared plan is unavailable.</h1><p>The owner may have made it private, archived it, or removed it.</p><a href="/">Return to Touchline →</a></section></main>;
  const payload = JSON.parse(row.payload_json) as { url: string; summary?: Record<string, string | number | number[]> };
  return <main className="shared-page"><SiteNav active="workspace" /><section className="shared-plan shell"><div className="eyebrow"><span /> READ-ONLY {row.kind.toUpperCase()} PLAN</div><h1>{row.name}</h1><p>{row.description || "A shared Touchline decision scenario."}</p><div className="shared-meta"><span>VERSION <strong>{row.version}</strong></span><span>UPDATED <strong>{new Date(row.updated_at).toLocaleString()}</strong></span><span>ACCESS <strong>READ ONLY</strong></span></div>{payload.summary ? <div className="shared-summary">{Object.entries(payload.summary).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{Array.isArray(value) ? value.length : value}</strong></article>)}</div> : null}<a className="shared-open" href={payload.url}>OPEN INTERACTIVE SCENARIO ↗</a><small>This snapshot cannot be edited. Opening the interactive scenario creates no access to the owner’s workspace.</small></section></main>;
}
