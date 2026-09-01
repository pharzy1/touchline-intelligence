"use client";

import { useEffect, useState } from "react";

type Fixture = { fixture_id: number; home_team: string; away_team: string; kickoff_at: string; home_probability: number; draw_probability: number; away_probability: number; predicted_class: string; actual_class?: string; correct?: number; home_score?: number; away_score?: number };
type Data = { version: string; status?: string; summary: { predictions: number; graded: number; accuracy: number | null; brierScore: number | null; lastScoredAt: string | null }; timeline: { fixtureId: number; accuracy: number; correct: boolean }[]; next: Fixture[]; recent: Fixture[]; policy?: string };
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const label = (value: string) => value.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function PerformanceDashboard() {
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/performance").then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); setData(value); }).catch(() => setError("Live performance data is temporarily unavailable.")); }, []);
  if (error) return <section className="performance-empty">{error}</section>;
  if (!data) return <section className="performance-empty">Loading the prediction ledger…</section>;
  return <>
    <section className="performance-kpis">
      <article><strong>{data.summary.predictions}</strong><span>locked predictions</span></article><article><strong>{data.summary.graded}</strong><span>graded fixtures</span></article><article><strong>{pct(data.summary.accuracy)}</strong><span>live accuracy</span></article><article><strong>{data.summary.brierScore?.toFixed(3) ?? "—"}</strong><span>mean Brier score</span></article>
    </section>
    {data.timeline.length ? <section className="performance-chart"><div className="performance-title"><div><span className="section-index">ACCOUNTABILITY CURVE</span><h2>Cumulative accuracy</h2></div><p>Each column is the accuracy that was visible after that result was graded.</p></div><div className="accuracy-columns">{data.timeline.slice(-40).map((point) => <i key={point.fixtureId} className={point.correct ? "correct" : "miss"} style={{ height: `${Math.max(8, point.accuracy * 100)}%` }} title={`${pct(point.accuracy)} cumulative accuracy`} />)}</div></section> : <section className="performance-empty"><strong>Waiting for the first graded match.</strong><p>{data.status ?? "Upcoming predictions will appear after the scheduled sync, then grade automatically after full time."}</p></section>}
    <section className="ledger-grid"><div><span className="section-index">UPCOMING / LOCKED</span><h2>Predictions made before kickoff</h2>{data.next.length ? data.next.map((fixture) => <article className="ledger-row" key={fixture.fixture_id}><div><strong>{fixture.home_team} — {fixture.away_team}</strong><span>{new Date(fixture.kickoff_at).toLocaleString()}</span></div><div><strong>{label(fixture.predicted_class)}</strong><span>{pct(Math.max(fixture.home_probability, fixture.draw_probability, fixture.away_probability))} confidence</span></div></article>) : <p className="ledger-note">The next sync will add supported upcoming fixtures.</p>}</div>
      <div><span className="section-index">RECENT / GRADED</span><h2>Results the model cannot rewrite</h2>{data.recent.length ? data.recent.map((fixture) => <article className="ledger-row" key={fixture.fixture_id}><div><strong>{fixture.home_team} {fixture.home_score}–{fixture.away_score} {fixture.away_team}</strong><span>Predicted {label(fixture.predicted_class)}</span></div><b className={fixture.correct ? "hit" : "miss"}>{fixture.correct ? "HIT" : "MISS"}</b></article>) : <p className="ledger-note">No completed locked predictions yet.</p>}</div></section>
    <p className="performance-policy">{data.policy ?? "Predictions are stored before kickoff and graded after the final score arrives."} · {data.version}</p>
  </>;
}
