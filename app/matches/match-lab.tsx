"use client";

import { useEffect, useState } from "react";

type Team = { club_id: number; name: string; elo: number; form: string; points_5: number; goal_difference_5: number; goals_for_5: number; goals_against_5: number };
type Prediction = { home: Team; away: Team; probabilities: { home_win: number; draw: number; away_win: number }; factors: { label: string; edge: number; favors: "home" | "away" }[]; metrics: { accuracy: number; log_loss: number; brier_score: number; baselines: { always_home_accuracy: number; elo_favorite_accuracy: number } }; version: string };
const pct = (value: number) => `${Math.round(value * 100)}%`;

function Form({ value }: { value: string }) { return <div className="form-pills" aria-label={`Recent form ${value.split("").join(" ")}`}>{value.split("").map((result, i) => <span className={result} key={`${result}-${i}`}>{result}</span>)}</div>; }

export function MatchLab() {
  const [teams, setTeams] = useState<Team[]>([]); const [homeId, setHomeId] = useState(11); const [awayId, setAwayId] = useState(281); const [prediction, setPrediction] = useState<Prediction | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/matches").then((response) => response.json()).then((data) => setTeams(data.teams ?? [])).catch(() => setError("Team data is temporarily unavailable.")); }, []);
  useEffect(() => { if (!homeId || !awayId || homeId === awayId) { setError("Choose two different teams."); setPrediction(null); return; } const controller = new AbortController(); setLoading(true); fetch(`/api/matches?home_id=${homeId}&away_id=${awayId}`, { signal: controller.signal }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setPrediction(data); setError(""); }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Prediction unavailable."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [homeId, awayId]);
  const swap = () => { setHomeId(awayId); setAwayId(homeId); };
  return <section className="match-workbench shell" aria-label="Match outcome prediction">
    <div className="fixture-select"><label><span>HOME TEAM</span><select value={homeId} onChange={(event) => setHomeId(Number(event.target.value))}>{teams.map((team) => <option value={team.club_id} key={team.club_id}>{team.name}</option>)}</select></label><button type="button" onClick={swap} aria-label="Swap home and away teams">⇄</button><label><span>AWAY TEAM</span><select value={awayId} onChange={(event) => setAwayId(Number(event.target.value))}>{teams.map((team) => <option value={team.club_id} key={team.club_id}>{team.name}</option>)}</select></label></div>
    <div className={`prediction-board ${loading ? "loading" : ""}`}>{error && <p className="match-error">{error}</p>}{prediction && <>
      <div className="team-summary home"><span>HOME</span><h2>{prediction.home.name}</h2><Form value={prediction.home.form} /><div><small>ELO</small><strong>{Math.round(prediction.home.elo)}</strong></div></div>
      <div className="probability-center"><span className="model-status"><i /> CALIBRATED MODEL</span><div className="probability-bars"><div><span>HOME WIN</span><i><b style={{ width: pct(prediction.probabilities.home_win) }} /></i><strong>{pct(prediction.probabilities.home_win)}</strong></div><div><span>DRAW</span><i><b style={{ width: pct(prediction.probabilities.draw) }} /></i><strong>{pct(prediction.probabilities.draw)}</strong></div><div><span>AWAY WIN</span><i><b style={{ width: pct(prediction.probabilities.away_win) }} /></i><strong>{pct(prediction.probabilities.away_win)}</strong></div></div><p>{prediction.version} · model {pct(prediction.metrics.accuracy)} · always-home {pct(prediction.metrics.baselines.always_home_accuracy)} · Elo favourite {pct(prediction.metrics.baselines.elo_favorite_accuracy)}</p></div>
      <div className="team-summary away"><span>AWAY</span><h2>{prediction.away.name}</h2><Form value={prediction.away.form} /><div><small>ELO</small><strong>{Math.round(prediction.away.elo)}</strong></div></div>
    </>}</div>
    {prediction && <div className="match-analysis"><div><span className="section-index">DECISION FACTORS</span><h3>What moves the model</h3></div><div className="factor-list">{prediction.factors.map((factor) => <article key={factor.label}><span>{factor.label}</span><div><i className={factor.favors} style={{ width: `${Math.min(100, 30 + Math.abs(factor.edge) * 35)}%` }} /></div><strong>{factor.favors === "home" ? prediction.home.name : prediction.away.name}</strong></article>)}</div></div>}
    <p className="match-disclaimer">Probabilities use completed historical matches and current rolling form. They do not account for injuries, lineups, transfers after the dataset refresh, or live match conditions.</p>
  </section>;
}
