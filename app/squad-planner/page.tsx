import type { Metadata } from "next";
import scouting from "../../data/scouting-index.json";
import images from "../../data/player-images.json";
import type { PlayerPhoto } from "../player-avatar";
import { SiteNav } from "../site-nav";
import { SquadPlanner } from "./squad-planner";

export const metadata: Metadata = {
  title: "Squad Planner — Touchline",
  description: "Build a formation, diagnose positional gaps, and model a transfer window with transparent player evidence.",
};

export default function SquadPlannerPage() {
  const players = scouting.players.map((player) => ({
    ...player,
    photo: (images.players as Record<string, PlayerPhoto>)[String(player.player_id)] ?? null,
  }));

  return <main className="planner-page">
    <SiteNav active="squad-planner" />
    <header className="planner-hero shell">
      <div className="eyebrow"><span /> SQUAD PLANNER / 05</div>
      <div><h1>Build the XI.<br /><em>Stress-test the window.</em></h1><p>Shape a formation, identify the weakest statistical fits, and replace them without losing sight of the budget. Every recommendation links back to the underlying player evidence.</p></div>
    </header>
    <SquadPlanner players={players} modelVersion={scouting.version} />
    <footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Model-backed planning · shareable scenarios</p><a href="/transfers">Transfer builder →</a></footer>
  </main>;
}
