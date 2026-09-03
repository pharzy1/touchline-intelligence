"use client";

import { useEffect, useState } from "react";
type Row = Record<string, string | number | null>;

export function ProductEvidence() {
  const [data, setData] = useState<{ funnel: Row[]; feedback: Row[] } | null>(null);
  useEffect(() => { fetch("/api/operations").then((response) => response.ok ? response.json() : Promise.reject()).then((body) => setData({ funnel: body.funnel ?? [], feedback: body.feedback ?? [] })).catch(() => {}); }, []);
  if (!data) return null;
  return <section className="product-evidence shell"><div><span className="section-index">07 / PRODUCT FUNNEL</span><h2>Anonymous decision journeys</h2><p>Thirty-day unique journeys—not people—show whether visitors move from exploration toward a saved decision.</p><div className="funnel-grid">{data.funnel.map((row, index) => <article key={String(row.event)}><span>0{index + 1}</span><strong>{row.journeys}</strong><small>{String(row.event).replaceAll("_", " ")}</small></article>)}</div>{!data.funnel.length ? <p className="ops-clear">Journey evidence begins with the next production visit.</p> : null}</div><div><span className="section-index">08 / BETA SIGNAL</span><h2>Structured feedback</h2>{data.feedback.map((row) => <article className="ops-event" key={String(row.category)}><i className="ok" /><div><strong>{String(row.category)} · {row.average_rating}/5</strong><p>{row.responses} anonymous response(s)</p><small>Last response {new Date(String(row.last_response)).toLocaleString()}</small></div></article>)}{!data.feedback.length ? <p className="ops-clear">No beta feedback has been submitted yet.</p> : null}</div></section>;
}
