"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar, type PlayerPhoto } from "../player-avatar";

type Position = "Attack" | "Midfield" | "Defender" | "Goalkeeper";
type Player = { player_id: number; name: string; club: string; position: string; age: number; appearances: number; goals: number; assists: number; minutes: number; goals_per_90: number; assists_per_90: number; minutes_per_appearance: number; international_caps: number; market_value_eur: number; vector: number[]; photo?: PlayerPhoto | null };
type Slot = { id: string; label: string; position: Position; x: number; y: number };
type Formation = "4-3-3" | "4-2-3-1" | "3-4-2-1";
type Deal = { slotId: string; sold: Player; bought: Player };

const formations: Record<Formation, Slot[]> = {
  "4-3-3": [
    { id: "lw", label: "LW", position: "Attack", x: 19, y: 15 }, { id: "st", label: "ST", position: "Attack", x: 50, y: 9 }, { id: "rw", label: "RW", position: "Attack", x: 81, y: 15 },
    { id: "lcm", label: "LCM", position: "Midfield", x: 27, y: 39 }, { id: "cm", label: "CM", position: "Midfield", x: 50, y: 47 }, { id: "rcm", label: "RCM", position: "Midfield", x: 73, y: 39 },
    { id: "lb", label: "LB", position: "Defender", x: 14, y: 69 }, { id: "lcb", label: "LCB", position: "Defender", x: 38, y: 65 }, { id: "rcb", label: "RCB", position: "Defender", x: 62, y: 65 }, { id: "rb", label: "RB", position: "Defender", x: 86, y: 69 },
    { id: "gk", label: "GK", position: "Goalkeeper", x: 50, y: 88 },
  ],
  "4-2-3-1": [
    { id: "st", label: "ST", position: "Attack", x: 50, y: 8 }, { id: "lw", label: "LW", position: "Attack", x: 18, y: 28 }, { id: "am", label: "AM", position: "Midfield", x: 50, y: 29 }, { id: "rw", label: "RW", position: "Attack", x: 82, y: 28 },
    { id: "ldm", label: "LDM", position: "Midfield", x: 36, y: 50 }, { id: "rdm", label: "RDM", position: "Midfield", x: 64, y: 50 },
    { id: "lb", label: "LB", position: "Defender", x: 14, y: 70 }, { id: "lcb", label: "LCB", position: "Defender", x: 38, y: 67 }, { id: "rcb", label: "RCB", position: "Defender", x: 62, y: 67 }, { id: "rb", label: "RB", position: "Defender", x: 86, y: 70 },
    { id: "gk", label: "GK", position: "Goalkeeper", x: 50, y: 88 },
  ],
  "3-4-2-1": [
    { id: "st", label: "ST", position: "Attack", x: 50, y: 7 }, { id: "lam", label: "LAM", position: "Attack", x: 32, y: 28 }, { id: "ram", label: "RAM", position: "Attack", x: 68, y: 28 },
    { id: "lwb", label: "LWB", position: "Midfield", x: 13, y: 49 }, { id: "lcm", label: "LCM", position: "Midfield", x: 38, y: 49 }, { id: "rcm", label: "RCM", position: "Midfield", x: 62, y: 49 }, { id: "rwb", label: "RWB", position: "Midfield", x: 87, y: 49 },
    { id: "lcb", label: "LCB", position: "Defender", x: 27, y: 70 }, { id: "cb", label: "CB", position: "Defender", x: 50, y: 67 }, { id: "rcb", label: "RCB", position: "Defender", x: 73, y: 70 },
    { id: "gk", label: "GK", position: "Goalkeeper", x: 50, y: 88 },
  ],
};

const money = (value: number) => `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
const distance = (a: Player, b: Player) => Math.sqrt(a.vector.reduce((sum, value, index) => sum + (value - b.vector[index]) ** 2, 0));
const fitScore = (player: Player) => {
  const availability = Math.min(100, player.appearances / 38 * 100);
  const involvement = Math.min(100, player.minutes_per_appearance / 90 * 100);
  const prime = Math.max(10, 100 - Math.abs(player.age - 25) * 9);
  if (player.position === "Attack") return Math.round(Math.min(100, player.goals_per_90 / .75 * 45 + player.assists_per_90 / .45 * 25 + availability * .2 + prime * .1));
  if (player.position === "Midfield") return Math.round(Math.min(100, player.assists_per_90 / .4 * 30 + involvement * .25 + availability * .25 + prime * .2));
  return Math.round(Math.min(100, involvement * .35 + availability * .35 + prime * .2 + Math.min(100, player.international_caps * 2) * .1));
};

function buildLineup(players: Player[], club: string, formation: Formation) {
  const pool = players.filter((player) => player.club === club).sort((a, b) => b.market_value_eur - a.market_value_eur);
  const used = new Set<number>();
  return Object.fromEntries(formations[formation].map((slot) => {
    const player = pool.find((candidate) => candidate.position === slot.position && !used.has(candidate.player_id));
    if (player) used.add(player.player_id);
    return [slot.id, player ?? null];
  })) as Record<string, Player | null>;
}

export function SquadPlanner({ players, modelVersion }: { players: Player[]; modelVersion: string }) {
  const clubs = useMemo(() => [...new Set(players.map((player) => player.club))].sort(), [players]);
  const defaultClub = clubs.includes("Arsenal FC") ? "Arsenal FC" : clubs[0];
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [club, setClub] = useState(defaultClub);
  const [budget, setBudget] = useState(100_000_000);
  const [lineup, setLineup] = useState<Record<string, Player | null>>(() => buildLineup(players, defaultClub, "4-3-3"));
  const [selectedSlot, setSelectedSlot] = useState("st");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const slots = formations[formation];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFormation = (Object.keys(formations).includes(params.get("formation") ?? "") ? params.get("formation") : "4-3-3") as Formation;
    const nextClub = params.get("club") === "Custom" || clubs.includes(params.get("club") ?? "") ? params.get("club")! : defaultClub;
    const nextBudget = Math.max(0, Math.min(500, Number(params.get("budget") ?? 100))) * 1_000_000;
    const ids = (params.get("squad") ?? "").split(",").map(Number);
    const restored = ids.length === formations[nextFormation].length ? Object.fromEntries(formations[nextFormation].map((slot, index) => [slot.id, players.find((player) => player.player_id === ids[index]) ?? null])) : buildLineup(players, nextClub, nextFormation);
    setFormation(nextFormation); setClub(nextClub); setBudget(nextBudget); setLineup(restored); setSelectedSlot(formations[nextFormation][0].id); setReady(true);
  }, [clubs, defaultClub, players]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({ formation, club, budget: String(Math.round(budget / 1_000_000)), squad: slots.map((slot) => lineup[slot.id]?.player_id ?? 0).join(",") });
    window.history.replaceState(null, "", `/squad-planner?${params}`);
  }, [budget, club, formation, lineup, ready, slots]);

  const selected = lineup[selectedSlot];
  const spend = deals.reduce((sum, deal) => sum + deal.bought.market_value_eur, 0);
  const sales = deals.reduce((sum, deal) => sum + deal.sold.market_value_eur, 0);
  const netSpend = spend - sales;
  const remaining = budget - netSpend;
  const priorities = slots.map((slot) => ({ slot, player: lineup[slot.id], score: lineup[slot.id] ? fitScore(lineup[slot.id]!) : 0 })).sort((a, b) => a.score - b.score).slice(0, 3);
  const suggestions = selected ? players.filter((player) => player.position === selected.position && player.club !== selected.club && !Object.values(lineup).some((item) => item?.player_id === player.player_id) && player.market_value_eur <= Math.max(remaining + selected.market_value_eur, 0)).sort((a, b) => distance(selected, a) - distance(selected, b)).slice(0, 3) : [];
  const searchResults = query.trim().length > 1 ? players.filter((player) => `${player.name} ${player.club}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];

  const resetClub = (nextClub: string) => { setClub(nextClub); setLineup(nextClub === "Custom" ? Object.fromEntries(formations[formation].map((slot) => [slot.id, null])) : buildLineup(players, nextClub, formation)); setDeals([]); setSelectedSlot(formations[formation][0].id); };
  const changeFormation = (next: Formation) => { setFormation(next); setLineup(club === "Custom" ? Object.fromEntries(formations[next].map((slot) => [slot.id, null])) : buildLineup(players, club, next)); setDeals([]); setSelectedSlot(formations[next][0].id); };
  const assign = (player: Player) => { setLineup((current) => ({ ...current, [selectedSlot]: player })); setQuery(""); };
  const replace = (bought: Player) => { if (!selected) return; setLineup((current) => ({ ...current, [selectedSlot]: bought })); setDeals((current) => [...current.filter((deal) => deal.slotId !== selectedSlot), { slotId: selectedSlot, sold: selected, bought }]); };
  const share = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return <section className="squad-workspace shell" aria-label="Squad planning workspace">
    <div className="planner-toolbar">
      <label><span>STARTING POINT</span><select aria-label="Starting club" value={club} onChange={(event) => resetClub(event.target.value)}><option value="Custom">Custom squad</option>{clubs.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>FORMATION</span><select aria-label="Formation" value={formation} onChange={(event) => changeFormation(event.target.value as Formation)}>{Object.keys(formations).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="budget-control"><span>TRANSFER BUDGET <strong>{money(budget)}</strong></span><input aria-label="Transfer budget" type="range" min="0" max="300" step="5" value={budget / 1_000_000} onChange={(event) => setBudget(Number(event.target.value) * 1_000_000)} /></label>
      <button type="button" onClick={share}>{copied ? "LINK COPIED" : "SHARE PLAN ↗"}</button>
    </div>
    <div className="planner-grid">
      <div className="pitch-panel">
        <div className="pitch" aria-label={`${formation} formation board`}>
          <i className="pitch-half" /><i className="pitch-circle" /><i className="pitch-box top" /><i className="pitch-box bottom" />
          {slots.map((slot) => { const player = lineup[slot.id]; const priority = priorities.some((item) => item.slot.id === slot.id); return <button type="button" key={slot.id} className={`pitch-player ${selectedSlot === slot.id ? "selected" : ""} ${priority ? "priority" : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onClick={() => setSelectedSlot(slot.id)} aria-label={`${slot.label}: ${player?.name ?? "empty"}`}><PlayerAvatar name={player?.name ?? slot.label} position={player?.position ?? slot.position} photo={player?.photo} size="small" /><strong>{player ? player.name.split(" ").at(-1) : "+ ADD"}</strong><span>{slot.label}{player ? ` · ${fitScore(player)}` : ""}</span></button>; })}
        </div>
        <div className="pitch-legend"><span><i className="selected" /> Selected slot</span><span><i className="priority" /> Review priority</span><small>Fit scores describe current statistical profiles—not player quality.</small></div>
      </div>
      <aside className="squad-inspector">
        <div className="inspector-head"><span>SELECTED ROLE</span><strong>{slots.find((slot) => slot.id === selectedSlot)?.label}</strong></div>
        <label className="squad-search"><span>ASSIGN ANY PLAYER</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or club" /></label>
        {searchResults.length > 0 && <div className="squad-search-results">{searchResults.map((player) => <button type="button" key={player.player_id} onClick={() => assign(player)}><span><strong>{player.name}</strong><small>{player.club} · {player.position}</small></span><em>{money(player.market_value_eur)}</em></button>)}</div>}
        {selected ? <>
          <div className="selected-player"><PlayerAvatar name={selected.name} position={selected.position} photo={selected.photo} size="large" /><div><span>CURRENT PROFILE</span><h2>{selected.name}</h2><p>{selected.club} · age {selected.age}</p></div><strong>{fitScore(selected)}</strong></div>
          <div className="selected-links"><a href={`/players/${selected.player_id}`}>Player evidence ↗</a><a href={`/compare?players=${selected.player_id}`}>Compare ↗</a><a href={`/transfers?player=${selected.player_id}`}>Transfer lab ↗</a></div>
          <div className="replacement-title"><span>MODEL-BACKED ALTERNATIVES</span><small>Similarity-ranked · affordable</small></div>
          <div className="planner-replacements">{suggestions.map((player) => <article key={player.player_id}><div><strong>{player.name}</strong><span>{player.club} · fit {fitScore(player)}</span></div><em>{money(player.market_value_eur)}</em><button type="button" onClick={() => replace(player)}>REPLACE ↗</button></article>)}{!suggestions.length && <p>No affordable same-position alternatives under the current plan.</p>}</div>
        </> : <div className="empty-slot"><strong>This role is empty.</strong><p>Search above to assign a player and unlock similarity-ranked alternatives.</p></div>}
      </aside>
    </div>
    <div className="window-board">
      <div className="window-kpis"><article><span>BUDGET</span><strong>{money(budget)}</strong></article><article><span>PLAYER SALES</span><strong>{money(sales)}</strong></article><article><span>PLAYER PURCHASES</span><strong>{money(spend)}</strong></article><article className={remaining < 0 ? "over" : ""}><span>REMAINING</span><strong>{money(remaining)}</strong></article></div>
      <section className="priority-panel"><div><span className="section-index">01 / SQUAD DIAGNOSIS</span><h2>Review these roles first.</h2><p>The three lowest profile-fit scores are surfaced for interrogation. Select one on the pitch to inspect alternatives.</p></div><div>{priorities.map(({ slot, player, score }, index) => <button type="button" key={slot.id} onClick={() => setSelectedSlot(slot.id)}><i>0{index + 1}</i><span><small>{slot.label} · FIT {score}</small><strong>{player?.name ?? "Unfilled role"}</strong></span><em>INSPECT ↗</em></button>)}</div></section>
      <section className="deal-ledger"><div><span className="section-index">02 / WINDOW LEDGER</span><h2>{deals.length ? `${deals.length} proposed move${deals.length === 1 ? "" : "s"}` : "No moves proposed yet"}</h2></div><div>{deals.map((deal) => <article key={deal.slotId}><span>{deal.sold.name}<small>SELL {money(deal.sold.market_value_eur)}</small></span><b>→</b><span>{deal.bought.name}<small>BUY {money(deal.bought.market_value_eur)}</small></span><strong>{money(deal.bought.market_value_eur - deal.sold.market_value_eur)}</strong></article>)}{!deals.length && <p>Choose a priority role, inspect its alternatives, and add a replacement to model the net spend.</p>}</div></section>
    </div>
    <p className="planner-method">Powered by <code>{modelVersion}</code>. Listed values are dataset snapshots, similarity uses six standardized profile signals, and fit scores are transparent heuristics for planning—not forecasts of performance.</p>
  </section>;
}
