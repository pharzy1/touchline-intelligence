"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar, type PlayerPhoto } from "../player-avatar";

type Position = "Attack" | "Midfield" | "Defender" | "Goalkeeper";
type Player = { player_id: number; name: string; club: string; position: string; age: number; appearances: number; goals: number; assists: number; minutes: number; goals_per_90: number; assists_per_90: number; minutes_per_appearance: number; international_caps: number; market_value_eur: number; vector: number[]; photo?: PlayerPhoto | null };
type Slot = { id: string; label: string; position: Position; x: number; y: number };
type Formation = "4-3-3" | "4-2-3-1" | "3-4-2-1";
type Deal = { slotId: string; sold: Player; bought: Player };
type SavedPlan = { id: string; name: string; savedAt: string; formation: Formation; club: string; budget: number; squad: number[]; deals: { slotId: string; soldId: number; boughtId: number }[] };

const PLAN_STORAGE_KEY = "touchline:squad-plans:v1";
const squadTargets: Record<Position, number> = { Goalkeeper: 3, Defender: 8, Midfield: 7, Attack: 5 };

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

export function SquadPlanner({ players, modelVersion, datasetUpdatedAt, season }: { players: Player[]; modelVersion: string; datasetUpdatedAt: string; season: number }) {
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
  const [planName, setPlanName] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
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
    try {
      const stored = JSON.parse(window.localStorage.getItem(PLAN_STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setSavedPlans(stored);
    } catch { setSavedPlans([]); }
  }, []);

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
  const originalSquad = useMemo(() => club === "Custom" ? [] : players.filter((player) => player.club === club).toSorted((a, b) => b.market_value_eur - a.market_value_eur).slice(0, 23), [club, players]);
  const proposedSquad = useMemo(() => {
    const soldIds = new Set(deals.map((deal) => deal.sold.player_id));
    const candidates = [...Object.values(lineup), ...deals.map((deal) => deal.bought), ...originalSquad].filter((player): player is Player => Boolean(player) && !soldIds.has(player!.player_id));
    return [...new Map(candidates.map((player) => [player.player_id, player])).values()].slice(0, 23);
  }, [deals, lineup, originalSquad]);
  const lineupIds = new Set(Object.values(lineup).flatMap((player) => player ? [player.player_id] : []));
  const depthPlayers = proposedSquad.filter((player) => !lineupIds.has(player.player_id));
  const coverage = (Object.keys(squadTargets) as Position[]).map((position) => {
    const count = proposedSquad.filter((player) => player.position === position).length;
    return { position, count, target: squadTargets[position], gap: Math.max(0, squadTargets[position] - count) };
  });
  const metrics = (squad: Player[]) => ({
    value: squad.reduce((sum, player) => sum + player.market_value_eur, 0),
    age: squad.length ? squad.reduce((sum, player) => sum + player.age, 0) / squad.length : 0,
    fit: squad.length ? squad.reduce((sum, player) => sum + fitScore(player), 0) / squad.length : 0,
    gaps: (Object.keys(squadTargets) as Position[]).reduce((sum, position) => sum + Math.max(0, squadTargets[position] - squad.filter((player) => player.position === position).length), 0),
  });
  const originalMetrics = metrics(originalSquad);
  const proposedMetrics = metrics(proposedSquad);
  const agingPositions = (Object.keys(squadTargets) as Position[]).filter((position) => proposedSquad.filter((player) => player.position === position).some((player) => player.age >= 30));
  const topThreeValue = proposedSquad.toSorted((a, b) => b.market_value_eur - a.market_value_eur).slice(0, 3).reduce((sum, player) => sum + player.market_value_eur, 0);
  const concentration = proposedMetrics.value ? Math.round(topThreeValue / proposedMetrics.value * 100) : 0;

  const resetClub = (nextClub: string) => { setClub(nextClub); setLineup(nextClub === "Custom" ? Object.fromEntries(formations[formation].map((slot) => [slot.id, null])) : buildLineup(players, nextClub, formation)); setDeals([]); setSelectedSlot(formations[formation][0].id); };
  const changeFormation = (next: Formation) => { setFormation(next); setLineup(club === "Custom" ? Object.fromEntries(formations[next].map((slot) => [slot.id, null])) : buildLineup(players, club, next)); setDeals([]); setSelectedSlot(formations[next][0].id); };
  const assign = (player: Player) => { setLineup((current) => ({ ...current, [selectedSlot]: player })); setQuery(""); };
  const replace = (bought: Player) => { if (!selected) return; setLineup((current) => ({ ...current, [selectedSlot]: bought })); setDeals((current) => [...current.filter((deal) => deal.slotId !== selectedSlot), { slotId: selectedSlot, sold: selected, bought }]); };
  const share = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  const savePlan = () => {
    const name = planName.trim() || `${club} ${formation}`;
    const plan: SavedPlan = { id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), formation, club, budget, squad: slots.map((slot) => lineup[slot.id]?.player_id ?? 0), deals: deals.map((deal) => ({ slotId: deal.slotId, soldId: deal.sold.player_id, boughtId: deal.bought.player_id })) };
    setSavedPlans((current) => { const next = [plan, ...current].slice(0, 8); window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next)); return next; });
    setPlanName(""); setSaveMessage(`Saved “${name}” on this device.`); window.setTimeout(() => setSaveMessage(""), 2200);
  };
  const openPlan = (plan: SavedPlan) => {
    const nextSlots = formations[plan.formation];
    setFormation(plan.formation); setClub(plan.club); setBudget(plan.budget);
    setLineup(Object.fromEntries(nextSlots.map((slot, index) => [slot.id, players.find((player) => player.player_id === plan.squad[index]) ?? null])));
    setDeals(plan.deals.flatMap((deal) => { const sold = players.find((player) => player.player_id === deal.soldId); const bought = players.find((player) => player.player_id === deal.boughtId); return sold && bought ? [{ slotId: deal.slotId, sold, bought }] : []; }));
    setSelectedSlot(nextSlots[0].id); setSaveMessage(`Opened “${plan.name}”.`);
  };
  const deletePlan = (id: string) => setSavedPlans((current) => { const next = current.filter((plan) => plan.id !== id); window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next)); return next; });

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
      <section className="squad-depth"><div className="depth-heading"><span className="section-index">03 / SQUAD DEPTH</span><h2>{proposedSquad.length} of 23 places modeled.</h2><p>The starting XI is combined with the remaining club roster and proposed arrivals. Targets use a balanced 3–8–7–5 goalkeeper/defender/midfielder/attacker structure.</p></div><div className="coverage-grid">{coverage.map((item) => <article className={item.gap ? "gap" : "covered"} key={item.position}><span>{item.position}</span><strong>{item.count}<small> / {item.target}</small></strong><em>{item.gap ? `${item.gap} short` : "covered"}</em></article>)}</div><div className="depth-roster" aria-label="Substitutes and reserves">{depthPlayers.map((player) => <button type="button" key={player.player_id} onClick={() => { const matching = slots.find((slot) => slot.position === player.position); if (matching) { setSelectedSlot(matching.id); setLineup((current) => ({ ...current, [matching.id]: player })); } }}><PlayerAvatar name={player.name} position={player.position} photo={player.photo} size="small" /><span><strong>{player.name}</strong><small>{player.position} · age {player.age}</small></span><em>{money(player.market_value_eur)}</em></button>)}{!depthPlayers.length && <p>No bench or reserve players yet. Assign players to a custom squad to build depth.</p>}</div></section>
      <section className="squad-diagnostics"><div><span className="section-index">04 / ROSTER RISK</span><h2>Coverage beyond the XI.</h2></div><div className="risk-grid"><article><span>POSITION GAPS</span><strong>{coverage.reduce((sum, item) => sum + item.gap, 0)}</strong><p>{coverage.filter((item) => item.gap).map((item) => item.position).join(", ") || "Every position group meets its depth target."}</p></article><article><span>AGING AREAS</span><strong>{agingPositions.length}</strong><p>{agingPositions.join(", ") || "No position group includes a player aged 30+."}</p></article><article><span>TOP-3 VALUE SHARE</span><strong>{concentration}%</strong><p>{concentration > 45 ? "Squad value is concentrated in a small group." : "Value is relatively distributed across the squad."}</p></article></div></section>
      <section className="squad-comparison"><div><span className="section-index">05 / BEFORE VS AFTER</span><h2>See what the window changes.</h2></div><div className="before-after"><div className="comparison-head"><span>MEASURE</span><span>ORIGINAL</span><span>PROPOSED</span><span>CHANGE</span></div>{[{ label: "Squad value", before: money(originalMetrics.value), after: money(proposedMetrics.value), change: money(proposedMetrics.value - originalMetrics.value) }, { label: "Average age", before: originalMetrics.age.toFixed(1), after: proposedMetrics.age.toFixed(1), change: `${proposedMetrics.age - originalMetrics.age >= 0 ? "+" : ""}${(proposedMetrics.age - originalMetrics.age).toFixed(1)}` }, { label: "Average profile fit", before: originalMetrics.fit.toFixed(0), after: proposedMetrics.fit.toFixed(0), change: `${proposedMetrics.fit - originalMetrics.fit >= 0 ? "+" : ""}${(proposedMetrics.fit - originalMetrics.fit).toFixed(0)}` }, { label: "Unfilled depth places", before: String(originalMetrics.gaps), after: String(proposedMetrics.gaps), change: `${proposedMetrics.gaps - originalMetrics.gaps >= 0 ? "+" : ""}${proposedMetrics.gaps - originalMetrics.gaps}` }].map((row) => <div className="comparison-data" key={row.label}><strong>{row.label}</strong><span>{row.before}</span><span>{row.after}</span><em>{row.change}</em></div>)}</div></section>
      <section className="saved-plans"><div><span className="section-index">06 / SAVED PLANS</span><h2>Name it. Reopen it.</h2><p>Plans are stored only in this browser, keeping experimentation private and available when you return.</p><div className="save-plan-controls"><label><span>PLAN NAME</span><input aria-label="Plan name" value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder={`${club} summer window`} /></label><button type="button" onClick={savePlan}>SAVE THIS PLAN</button></div>{saveMessage && <p className="save-message" role="status">{saveMessage}</p>}</div><div className="saved-plan-list">{savedPlans.map((plan) => <article key={plan.id}><div><strong>{plan.name}</strong><span>{plan.club} · {plan.formation} · {new Date(plan.savedAt).toLocaleDateString()}</span></div><button type="button" onClick={() => openPlan(plan)}>OPEN</button><button type="button" className="delete-plan" aria-label={`Delete ${plan.name}`} onClick={() => deletePlan(plan.id)}>×</button></article>)}{!savedPlans.length && <p>No saved plans on this device yet.</p>}</div></section>
    </div>
    <p className="planner-method">Season {season} dataset · updated {new Date(datasetUpdatedAt).toLocaleDateString()} · powered by <code>{modelVersion}</code>. Listed values are dataset snapshots, similarity uses six standardized profile signals, and fit scores are transparent heuristics for planning—not forecasts of performance.</p>
  </section>;
}
