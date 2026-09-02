"use client";

import { useEffect, useState } from "react";

type StatusData = { state: string; label: string; cadenceHours: number; lastSuccessAt: string | null; nextExpectedAt: string | null; fixtures: { scheduled: number; graded: number }; runs: Array<{ id: number; trigger: string; status: string; completed_at: string; fixtures_fetched: number; created_candidates: number; graded_candidates: number; duration_ms: number }>; models: Record<string, string>; source: string };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available yet";

export function StatusDashboard() {
  const [data, setData] = useState<StatusData | null>(null);
  useEffect(() => { fetch("/api/status").then((response) => response.json()).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <section className="status-loading" aria-live="polite">Loading production telemetry…</section>;
  return <>
    <section className={`status-banner ${data.state}`}><div><span className="status-dot" /><strong>{data.label}</strong></div><p>Fixture ingestion runs automatically every {data.cadenceHours} hours.</p></section>
    <section className="status-kpis" aria-label="Production health summary">
      <article><span>LAST SUCCESSFUL SYNC</span><strong>{formatDate(data.lastSuccessAt)}</strong></article>
      <article><span>NEXT EXPECTED SYNC</span><strong>{formatDate(data.nextExpectedAt)}</strong></article>
      <article><span>LOCKED PREDICTIONS</span><strong>{data.fixtures.scheduled}</strong></article>
      <article><span>GRADED FIXTURES</span><strong>{data.fixtures.graded}</strong></article>
    </section>
    <section className="status-grid">
      <div><div className="section-index">01 / SYNC LEDGER</div><h2>Recent automation runs</h2>{data.runs.length ? <div className="run-ledger">{data.runs.map((run) => <article key={run.id}><i className={run.status} /><div><strong>{run.status === "success" ? "Fixture sync completed" : "Fixture sync failed"}</strong><span>{formatDate(run.completed_at)} · {run.trigger}</span></div><div><strong>{run.duration_ms} ms</strong><span>{run.fixtures_fetched} fetched · {run.created_candidates} upcoming · {run.graded_candidates} graded</span></div></article>)}</div> : <p className="status-empty">The deployed fixture ledger is healthy; detailed run history begins with the next instrumented sync.</p>}</div>
      <aside><div className="section-index">02 / DEPLOYED ARTIFACTS</div><h2>Model versions</h2>{Object.entries(data.models).map(([name, version]) => <div className="model-version" key={name}><span>{name}</span><code>{version}</code></div>)}<p>Versioned artifacts are schema-validated before deployment. Fixture data source: {data.source}.</p></aside>
    </section>
  </>;
}
