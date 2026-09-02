"use client";

import { useEffect, useState } from "react";

type RouteMetric = { route: string; feature: string; requests: number; errors: number; errorRate: number; averageLatencyMs: number };
type StatusData = { state: string; label: string; cadenceHours: number; lastSuccessAt: string | null; nextExpectedAt: string | null; fixtures: { scheduled: number; graded: number }; runs: Array<{ id: number; trigger: string; status: string; completed_at: string; fixtures_fetched: number; created_candidates: number; graded_candidates: number; createdCandidates?: number; gradedCandidates?: number; duration_ms: number }>; telemetry: { requests: number; errors: number; errorRate: number; medianLatencyMs: number; p95LatencyMs: number; routes: RouteMetric[]; daily: Array<{ day: string; requests: number; errors: number }>; records: { apiEvents: number; predictions: number; fixturePredictions: number; syncRuns: number }; syncReliability: { attempts: number; successes: number; successRate: number | null; averageDurationMs: number | null } }; models: Record<string, string>; source: string };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available yet";

export function StatusDashboard() {
  const [data, setData] = useState<StatusData | null>(null);
  useEffect(() => { fetch("/api/status").then((response) => response.json()).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <section className="status-loading" aria-live="polite">Loading production telemetry…</section>;
  const maxDaily = Math.max(1, ...data.telemetry.daily.map((day) => day.requests)); const maxRoute = Math.max(1, ...data.telemetry.routes.map((route) => route.requests));
  return <>
    <section className={`status-banner ${data.state}`}><div><span className="status-dot" /><strong>{data.label}</strong></div><p>Fixture ingestion runs automatically every {data.cadenceHours} hours.</p></section>
    <section className="status-kpis" aria-label="Production health summary">
      <article><span>LAST SUCCESSFUL SYNC</span><strong>{formatDate(data.lastSuccessAt)}</strong></article>
      <article><span>NEXT EXPECTED SYNC</span><strong>{formatDate(data.nextExpectedAt)}</strong></article>
      <article><span>LOCKED PREDICTIONS</span><strong>{data.fixtures.scheduled}</strong></article>
      <article><span>GRADED FIXTURES</span><strong>{data.fixtures.graded}</strong></article>
    </section>
    <section className="ops-kpis" aria-label="Seven-day API operations">
      <article><span>7-DAY REQUESTS</span><strong>{data.telemetry.requests.toLocaleString()}</strong><small>Anonymous API events</small></article>
      <article><span>MEDIAN LATENCY</span><strong>{data.telemetry.medianLatencyMs} ms</strong><small>50th percentile</small></article>
      <article><span>P95 LATENCY</span><strong>{data.telemetry.p95LatencyMs} ms</strong><small>Slowest 5% threshold</small></article>
      <article><span>ERROR RATE</span><strong>{(data.telemetry.errorRate * 100).toFixed(2)}%</strong><small>{data.telemetry.errors} responses ≥ 400</small></article>
    </section>
    <section className="telemetry-grid">
      <div className="traffic-panel"><div className="section-index">01 / TRAFFIC OVER TIME</div><div className="ops-title"><h2>Seven-day request volume</h2><p>Only route, response status, latency, and timestamp are retained.</p></div>{data.telemetry.daily.length ? <div className="traffic-bars">{data.telemetry.daily.map((day) => <div key={day.day}><span className="bar-stack" title={`${day.requests} requests · ${day.errors} errors`}><i style={{ height: `${Math.max(4, day.requests / maxDaily * 100)}%` }} /><b style={{ height: `${day.requests ? day.errors / day.requests * 100 : 0}%` }} /></span><strong>{day.requests}</strong><small>{new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en", { weekday: "short" })}</small></div>)}</div> : <p className="status-empty">Traffic history begins as production routes are used.</p>}</div>
      <div className="feature-panel"><div className="section-index">02 / FEATURE USAGE</div><h2>Requests by product surface</h2>{data.telemetry.routes.length ? <div className="route-usage">{data.telemetry.routes.map((route) => <article key={route.route}><div><strong>{route.feature}</strong><span>{route.route} · {route.averageLatencyMs} ms avg</span></div><div className="route-meter"><i style={{ width: `${route.requests / maxRoute * 100}%` }} /></div><b>{route.requests}</b></article>)}</div> : <p className="status-empty">No route events recorded yet.</p>}</div>
    </section>
    <section className="operations-ledger">
      <div><div className="section-index">03 / AUTOMATION RELIABILITY</div><h2>Scheduled ingestion</h2><strong>{data.telemetry.syncReliability.successRate === null ? "Awaiting runs" : `${(data.telemetry.syncReliability.successRate * 100).toFixed(1)}% successful`}</strong><p>{data.telemetry.syncReliability.successes} of {data.telemetry.syncReliability.attempts} attempts in the last 30 days · {data.telemetry.syncReliability.averageDurationMs ?? "—"} ms average successful duration.</p></div>
      <div><div className="section-index">04 / DURABLE RECORDS</div><h2>Database footprint</h2><div className="record-counts"><span><strong>{data.telemetry.records.apiEvents.toLocaleString()}</strong>API events</span><span><strong>{data.telemetry.records.predictions.toLocaleString()}</strong>valuation predictions</span><span><strong>{data.telemetry.records.fixturePredictions.toLocaleString()}</strong>fixture predictions</span><span><strong>{data.telemetry.records.syncRuns.toLocaleString()}</strong>sync runs</span></div></div>
    </section>
    <section className="status-grid">
      <div><div className="section-index">05 / SYNC LEDGER</div><h2>Recent automation runs</h2>{data.runs.length ? <div className="run-ledger">{data.runs.map((run) => <article key={run.id}><i className={run.status} /><div><strong>{run.status === "success" ? "Fixture sync completed" : "Fixture sync failed"}</strong><span>{formatDate(run.completed_at)} · {run.trigger}</span></div><div><strong>{run.duration_ms} ms</strong><span>{run.fixtures_fetched} fetched · {run.createdCandidates ?? run.created_candidates} upcoming · {run.gradedCandidates ?? run.graded_candidates} graded</span></div></article>)}</div> : <p className="status-empty">The deployed fixture ledger is healthy; detailed run history begins with the next instrumented sync.</p>}</div>
      <aside><div className="section-index">06 / DEPLOYED ARTIFACTS</div><h2>Model versions</h2>{Object.entries(data.models).map(([name, version]) => <div className="model-version" key={name}><span>{name}</span><code>{version}</code></div>)}<p>Versioned artifacts are schema-validated before deployment. Fixture data source: {data.source}. Detailed provider errors remain restricted to the protected diagnostics endpoint.</p></aside>
    </section>
  </>;
}
