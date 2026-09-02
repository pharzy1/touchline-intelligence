"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { season: number; estimate_eur: number; peer_median_eur: number; position_percentile: number; age: number; appearances: number; goals: number; assists: number; minutes: number; goals_per_90: number; assists_per_90: number; drivers: Array<{ label: string; direction: string }> };
const money = (value: number) => `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
const axisMoney = (value: number) => `€${Math.round(value / 1_000_000)}m`;

export function PlayerHistory({ points, recordedValue }: { points: Point[]; recordedValue: number }) {
  const latest = points.at(-1)!; const previous = points.at(-2); const delta = previous ? latest.estimate_eur - previous.estimate_eur : 0;
  return <>
    <section className="history-kpis">
      <article><span>LATEST MODEL ESTIMATE</span><strong>{money(latest.estimate_eur)}</strong><small>{previous ? `${delta >= 0 ? "+" : "−"}${money(Math.abs(delta))} vs. prior season` : "First qualifying season"}</small></article>
      <article><span>LATEST RECORDED VALUE</span><strong>{money(recordedValue)}</strong><small>Current source snapshot · not backfilled</small></article>
      <article><span>POSITION PERCENTILE</span><strong>{latest.position_percentile}th</strong><small>Among same-position 2025/26 profiles</small></article>
      <article><span>SEASONS OBSERVED</span><strong>{points.length}</strong><small>Minimum 180 league minutes per season</small></article>
    </section>
    <section className="history-chart-panel"><div className="history-chart-copy"><div className="section-index">01 / VALUE TRAJECTORY</div><h2>Performance-priced<br />over time.</h2><p>The lime line applies the same deployed valuation model to each season’s actual league output. The peer line is the same-position median.</p><div className="recorded-key"><i /> Latest recorded market value: <strong>{money(recordedValue)}</strong></div></div><div className="history-chart"><ResponsiveContainer width="100%" height={390}><LineChart data={points} margin={{ top: 25, right: 30, bottom: 12, left: 8 }}><CartesianGrid stroke="#4c675b" strokeDasharray="2 5" vertical={false} /><XAxis dataKey="season" tickFormatter={(value) => `${String(value).slice(2)}/${String(value + 1).slice(2)}`} stroke="#8da096" tick={{ fontSize: 10 }} /><YAxis tickFormatter={axisMoney} stroke="#8da096" tick={{ fontSize: 10 }} width={52} /><Tooltip formatter={(value, name) => [money(Number(value)), name === "estimate_eur" ? "Model estimate" : "Position median"]} labelFormatter={(value) => `${value}/${Number(value) + 1} season`} /><Legend formatter={(value) => value === "estimate_eur" ? "Model estimate" : "Position median"} /><Line type="monotone" dataKey="estimate_eur" stroke="#d9ff43" strokeWidth={3} dot={{ fill: "#d9ff43", r: 5 }} /><Line type="monotone" dataKey="peer_median_eur" stroke="#aab9b1" strokeWidth={2} strokeDasharray="5 5" dot={false} />{latest.season === points.at(-1)?.season && <ReferenceDot x={latest.season} y={latest.estimate_eur} r={9} fill="none" stroke="#d9ff43" />}</LineChart></ResponsiveContainer></div></section>
    <section className="season-ledger"><div className="section-index">02 / SEASON EVIDENCE</div><h2>What moved the estimate?</h2><div className="season-table">{[...points].reverse().map((point, index) => <article key={point.season}><div><span>{point.season}/{String(point.season + 1).slice(2)}</span><strong>{money(point.estimate_eur)}</strong></div><div className="season-stat"><span>APPS</span><strong>{point.appearances}</strong></div><div className="season-stat"><span>G / 90</span><strong>{point.goals_per_90.toFixed(2)}</strong></div><div className="season-stat"><span>A / 90</span><strong>{point.assists_per_90.toFixed(2)}</strong></div><div className="season-drivers">{index === points.length - 1 ? <span>Baseline season</span> : point.drivers.map((driver) => <span className={driver.direction} key={driver.label}>{driver.direction === "up" ? "↑" : "↓"} {driver.label}</span>)}</div></article>)}</div></section>
  </>;
}
