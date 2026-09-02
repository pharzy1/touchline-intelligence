"use client";

import { useEffect, useMemo, useState } from "react";
import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { PlayerAvatar, type PlayerPhoto } from "../player-avatar";

type Player = { player_id: number; name: string; club: string; position: string; age: number; appearances: number; goals: number; assists: number; minutes: number; goals_per_90: number; assists_per_90: number; minutes_per_appearance: number; international_caps: number; market_value_eur: number; photo?: PlayerPhoto | null };
type Match = Player & { similarity: number; shared_signals: string[] };
type Estimate = { estimateEur: number; lowEur: number; highEur: number };
type PlayerWithEstimate = Player & { estimate?: Estimate; similarity?: number; shared_signals?: string[] };
const colors = ["#d9ff43", "#f3a66f", "#8bc5ff", "#df9cff"];
const money = (value: number) => `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
const positionLabel = (value: string) => value === "Attack" ? "Forward" : value;

async function estimate(player: Player): Promise<Estimate> {
  const response = await fetch("/api/predict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ age: player.age, position: player.position, appearances: player.appearances, goals: player.goals, assists: player.assists, minutes: player.minutes, internationalCaps: player.international_caps }) });
  if (!response.ok) throw new Error("Valuation unavailable"); return response.json();
}

export function TransferBuilder() {
  const [query, setQuery] = useState("Erling Haaland"); const [searchResults, setSearchResults] = useState<Player[]>([]); const [reference, setReference] = useState<PlayerWithEstimate | null>(null); const [alternatives, setAlternatives] = useState<PlayerWithEstimate[]>([]); const [candidates, setCandidates] = useState<Match[]>([]); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);

  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => fetch(`/api/scouting?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.json()).then((data) => setSearchResults(data.players ?? [])).catch(() => {}), 160); return () => { controller.abort(); clearTimeout(timer); }; }, [query]);

  const chooseReference = async (player: Player) => {
    setError(""); setQuery(player.name); setAlternatives([]);
    try {
      const [valuation, response] = await Promise.all([estimate(player), fetch(`/api/scouting?player_id=${player.player_id}`)]); const data = await response.json();
      setReference({ ...player, estimate: valuation }); setCandidates(data.matches ?? []);
    } catch { setError("The transfer scenario could not be loaded."); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search); const playerId = Number(params.get("player")) || 418560;
    fetch(`/api/scouting?player_id=${playerId}`).then((response) => response.json()).then(async (data) => {
      if (!data.selected) throw new Error(); const valuation = await estimate(data.selected); setReference({ ...data.selected, estimate: valuation }); setQuery(data.selected.name); setCandidates(data.matches ?? []);
      const requested = (params.get("alternatives") ?? "").split(",").map(Number).filter(Boolean); const chosen = (data.matches ?? []).filter((player: Match) => requested.includes(player.player_id)).slice(0, 3); setAlternatives(await Promise.all(chosen.map(async (player: Match) => ({ ...player, estimate: await estimate(player) }))));
    }).catch(() => setError("The transfer scenario could not be loaded."));
  }, []);

  useEffect(() => { if (!reference) return; const params = new URLSearchParams({ player: String(reference.player_id) }); if (alternatives.length) params.set("alternatives", alternatives.map((player) => player.player_id).join(",")); window.history.replaceState(null, "", `/transfers?${params}`); }, [reference, alternatives]);

  const toggleAlternative = async (player: Match) => {
    if (alternatives.some((item) => item.player_id === player.player_id)) { setAlternatives((items) => items.filter((item) => item.player_id !== player.player_id)); return; }
    if (alternatives.length >= 3) { setError("Choose up to three alternatives at a time."); return; }
    try { const valuation = await estimate(player); setAlternatives((items) => [...items, { ...player, estimate: valuation }]); setError(""); } catch { setError("That replacement cost is temporarily unavailable."); }
  };

  const compared = useMemo(() => reference ? [reference, ...alternatives] : [], [reference, alternatives]);
  const radar = useMemo(() => [
    { signal: "Prime-age fit", values: compared.map((player) => Math.max(5, 100 - Math.abs(player.age - 24) * 10)) },
    { signal: "Availability", values: compared.map((player) => Math.min(100, player.appearances / 38 * 100)) },
    { signal: "Scoring", values: compared.map((player) => Math.min(100, player.goals_per_90 / .9 * 100)) },
    { signal: "Creation", values: compared.map((player) => Math.min(100, player.assists_per_90 / .55 * 100)) },
    { signal: "Involvement", values: compared.map((player) => Math.min(100, player.minutes_per_appearance / 90 * 100)) },
    { signal: "Experience", values: compared.map((player) => Math.min(100, player.international_caps)) },
  ].map((row) => ({ signal: row.signal, ...Object.fromEntries(row.values.map((value, index) => [`player${index}`, Math.round(value)])) })), [compared]);

  const copy = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return <section className="transfer-builder shell">
    <aside className="transfer-search"><div className="control-head"><span>REFERENCE PLAYER</span><span>414 PROFILES</span></div><label className="search-field"><span>Search player or club</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Erling Haaland" /></label><div className="search-results">{searchResults.slice(0, 7).map((player) => <button type="button" key={player.player_id} className={reference?.player_id === player.player_id ? "selected" : ""} onClick={() => chooseReference(player)}><PlayerAvatar name={player.name} position={player.position} photo={player.photo} size="small" /><span><strong>{player.name}</strong><small>{player.club}</small></span><em>{money(player.market_value_eur)}</em></button>)}</div><div className="transfer-help"><strong>How to use this</strong><p>Pick a reference player, then add up to three same-position alternatives. Touchline combines the scouting index with fresh valuation-model inference.</p><a href="/photo-credits">Photo credits and licences →</a></div></aside>
    <div className="transfer-main"><div className="result-top"><span>REPLACEMENT SHORTLIST</span><button type="button" className="copy-scenario" onClick={copy}>{copied ? "LINK COPIED" : "SHARE SCENARIO ↗"}</button></div>{reference && <div className="transfer-reference"><PlayerAvatar name={reference.name} position={reference.position} photo={reference.photo} size="large" /><div><span>REFERENCE</span><h2>{reference.name}</h2><p>{reference.club} · {positionLabel(reference.position)} · age {reference.age}</p></div><div><small>MODEL COST</small><strong>{reference.estimate ? money(reference.estimate.estimateEur) : "—"}</strong><span>listed {money(reference.market_value_eur)}</span></div></div>}
      <div className="replacement-grid">{candidates.map((player) => { const selected = alternatives.some((item) => item.player_id === player.player_id); const valued = alternatives.find((item) => item.player_id === player.player_id); const saving = reference?.estimate && valued?.estimate ? reference.estimate.estimateEur - valued.estimate.estimateEur : null; return <article className={selected ? "selected" : ""} key={player.player_id}><button type="button" onClick={() => toggleAlternative(player)} aria-pressed={selected}><span>{selected ? "REMOVE" : "COMPARE"}</span><strong>{selected ? "✓" : "+"}</strong></button><div className="replacement-player"><PlayerAvatar name={player.name} position={player.position} photo={player.photo} size="large" /><div><h3>{player.name}</h3><p>{player.club} · age {player.age}</p></div></div><div className="replacement-metrics"><span><small>PROFILE</small><strong>{player.similarity}%</strong></span><span><small>LISTED</small><strong>{money(player.market_value_eur)}</strong></span><span><small>MODEL COST</small><strong>{valued?.estimate ? money(valued.estimate.estimateEur) : "select"}</strong></span></div>{saving !== null && <div className={saving >= 0 ? "saving positive" : "saving negative"}>{saving >= 0 ? `${money(saving)} potential saving` : `${money(Math.abs(saving))} cost premium`}</div>}<div className="replacement-signals">{player.shared_signals.map((signal) => <span key={signal}>{signal}</span>)}</div></article>; })}</div>
      {error && <p className="transfer-error">{error}</p>}
      {compared.length > 1 && <div className="radar-panel"><div><span className="section-index">PROFILE TRADE-OFFS</span><h2>Compare the shape,<br />not just the price.</h2><p>Signals are normalized to interpretable 0–100 display scores. They describe statistical profile, not overall player quality.</p></div><div className="radar-wrap"><ResponsiveContainer width="100%" height={390}><RadarChart data={radar} outerRadius="70%"><PolarGrid stroke="#60776b" /><PolarAngleAxis dataKey="signal" tick={{ fill: "#b8c7bf", fontSize: 9 }} />{compared.map((player, index) => <Radar key={player.player_id} name={player.name} dataKey={`player${index}`} stroke={colors[index]} fill={colors[index]} fillOpacity={index ? .08 : .15} strokeWidth={2} />)}<Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /></RadarChart></ResponsiveContainer></div></div>}
    </div>
  </section>;
}
