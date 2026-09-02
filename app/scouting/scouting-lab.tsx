"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar, type PlayerPhoto } from "../player-avatar";

type Player = { player_id: number; name: string; club: string; position: string; age: number; appearances: number; goals: number; assists: number; minutes: number; goals_per_90: number; assists_per_90: number; market_value_eur: number; photo?: PlayerPhoto | null };
type Match = Player & { similarity: number; shared_signals: string[] };

function money(value: number) { const m = value / 1_000_000; return `€${Number.isInteger(m) ? m : m.toFixed(1)}m`; }
function positionLabel(value: string) { return value === "Attack" ? "Forward" : value; }

export function ScoutingLab() {
  const [query, setQuery] = useState("Erling Haaland");
  const [position, setPosition] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [maxAge, setMaxAge] = useState("99");
  const [maxValue, setMaxValue] = useState("999000000");
  const [club, setClub] = useState("any");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("player_id")); if (!requested) return;
    fetch(`/api/scouting?player_id=${requested}`).then((response) => response.json()).then((data) => { if (data.selected) { setSelected(data.selected); setQuery(data.selected.name); } }).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/scouting?q=${encodeURIComponent(query)}&position=${encodeURIComponent(position)}`, { signal: controller.signal });
        const data = await response.json(); setResults(data.players ?? []);
        if (!selected && data.players?.length) setSelected(data.players[0]);
      } catch { if (!controller.signal.aborted) setError("Player search is temporarily unavailable."); }
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, position, selected]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController(); setLoading(true);
    const params = new URLSearchParams({ player_id: String(selected.player_id), max_age: maxAge, max_value_eur: maxValue, club });
    fetch(`/api/scouting?${params}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setMatches(data.matches ?? []); setError("");
    }).catch(() => { if (!controller.signal.aborted) setError("Comparable profiles are temporarily unavailable."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, maxAge, maxValue, club]);

  return (
    <section className="scout-workbench shell" aria-label="Player similarity search">
      <aside className="scout-controls">
        <div className="control-head"><span>REFERENCE PLAYER</span><span>414 PROFILES</span></div>
        <label className="search-field"><span>Search by player or club</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Bukayo Saka" /></label>
        <label className="filter-field"><span>Position</span><select value={position} onChange={(event) => setPosition(event.target.value)}><option value="">Any position</option><option value="Attack">Forward</option><option value="Midfield">Midfielder</option><option value="Defender">Defender</option><option value="Goalkeeper">Goalkeeper</option></select></label>
        <div className="search-results" aria-label="Player search results">{results.slice(0, 7).map((player) => <button className={selected?.player_id === player.player_id ? "selected" : ""} type="button" key={player.player_id} onClick={() => { setSelected(player); setQuery(player.name); }}><PlayerAvatar name={player.name} position={player.position} photo={player.photo} size="small" /><span><strong>{player.name}</strong><small>{player.club}</small></span><em>{money(player.market_value_eur)}</em></button>)}</div>
        <div className="constraint-head">RECRUITMENT CONSTRAINTS</div>
        <div className="constraint-grid">
          <label className="filter-field"><span>Maximum age</span><select value={maxAge} onChange={(event) => setMaxAge(event.target.value)}><option value="99">Any age</option><option value="21">21</option><option value="23">23</option><option value="25">25</option><option value="28">28</option><option value="30">30</option></select></label>
          <label className="filter-field"><span>Maximum value</span><select value={maxValue} onChange={(event) => setMaxValue(event.target.value)}><option value="999000000">Any value</option><option value="10000000">€10m</option><option value="20000000">€20m</option><option value="40000000">€40m</option><option value="75000000">€75m</option></select></label>
        </div>
        <label className="filter-field"><span>Club</span><select value={club} onChange={(event) => setClub(event.target.value)}><option value="any">Any club</option><option value="different">Exclude reference club</option>{Array.from(new Set(results.map((player) => player.club))).sort().map((name) => <option key={name}>{name}</option>)}</select></label>
      </aside>

      <div className="scout-results-panel">
        <div className="result-top"><span>NEAREST PROFILES</span><span className="confidence"><i /> SAME-POSITION SEARCH</span></div>
        {selected && <div className="reference-card"><PlayerAvatar name={selected.name} position={selected.position} photo={selected.photo} size="large" /><div><span>REFERENCE</span><h2><a href={`/players/${selected.player_id}`}>{selected.name}</a></h2><p>{selected.club} · {positionLabel(selected.position)} · Age {selected.age}</p></div><strong>{money(selected.market_value_eur)}</strong></div>}
        <div className={`matches-list ${loading ? "loading" : ""}`} aria-live="polite">
          {error && <p className="empty-state">{error}</p>}
          {!error && !loading && matches.length === 0 && <p className="empty-state">No profiles meet these constraints. Widen the age, value, or club filter.</p>}
          {matches.map((player, index) => <article className="match-card" key={player.player_id}>
            <span className="match-rank">0{index + 1}</span><PlayerAvatar name={player.name} position={player.position} photo={player.photo} /><div className="match-person"><h3><a href={`/players/${player.player_id}`}>{player.name}</a></h3><p>{player.club} · Age {player.age}</p><div>{player.shared_signals.map((signal) => <span key={signal}>{signal}</span>)}</div></div>
            <div className="match-stats"><span><small>G / 90</small><strong>{player.goals_per_90.toFixed(2)}</strong></span><span><small>A / 90</small><strong>{player.assists_per_90.toFixed(2)}</strong></span><span><small>VALUE</small><strong>{money(player.market_value_eur)}</strong></span></div>
            <div className="match-score"><strong>{player.similarity}%</strong><span>profile match</span></div>
          </article>)}
        </div>
        <p className="scout-disclaimer">Similarity describes statistical profile—not quality, potential, tactical fit, or availability. Photos are locally cached from Wikimedia Commons; hover for licence details or view <a href="/photo-credits">all photo credits</a>.</p>
      </div>
    </section>
  );
}
