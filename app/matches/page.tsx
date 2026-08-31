import type { Metadata } from "next";
import Link from "next/link";
import { MatchLab } from "./match-lab";

export const metadata: Metadata = { title: "Match Lab — Touchline", description: "Compare Premier League teams with calibrated, time-validated match outcome probabilities." };

export default function MatchesPage() {
  return <main className="matches-page">
    <nav className="nav shell" aria-label="Primary navigation"><Link className="brand" href="/"><span className="brand-mark">T</span><span>TOUCHLINE</span></Link><div className="nav-links"><Link href="/#valuation">Valuation</Link><Link href="/scouting">Scouting</Link><Link className="active" href="/matches">Matches</Link></div><Link className="github-link" href="#method">Method ↗</Link></nav>
    <header className="match-hero shell"><div className="eyebrow"><span /> MATCH LAB / 03</div><div className="match-heading"><h1>Read the matchup.<br /><em>Price the uncertainty.</em></h1><p>Compare current team strength and recent form to estimate home-win, draw, and away-win probabilities before kickoff.</p></div></header>
    <MatchLab />
    <section className="match-method shell" id="method"><div className="match-method-title"><span className="section-index">VALIDATION DESIGN</span><h2>No peeking<br />at tomorrow.</h2></div><div className="validation-grid"><article><strong>4,430</strong><span>training matches</span><p>Historical seasons build the model in chronological order.</p></article><article><strong>375</strong><span>calibration matches</span><p>A separate season calibrates probability confidence.</p></article><article><strong>380</strong><span>test matches</span><p>The newest completed season remains untouched until final scoring.</p></article><article><strong>48.2%</strong><span>three-way accuracy</span><p>Reported honestly alongside log loss and Brier score.</p></article></div></section>
    <footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>CC0 data · match-softmax-2025-v1</p><Link href="/scouting">Scouting lab →</Link></footer>
  </main>;
}
