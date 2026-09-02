import type { Metadata } from "next";
import Link from "next/link";
import { PerformanceDashboard } from "./performance-dashboard";
import { SiteNav } from "../../site-nav";

export const metadata: Metadata = { title: "Live Model Performance — Touchline", description: "An immutable, automatically graded ledger of Touchline's pre-match Premier League predictions." };

export default function PerformancePage() {
  return <main className="matches-page"><SiteNav active="matches" /><header className="performance-hero shell"><div className="eyebrow"><span /> LIVE MODEL OPERATIONS</div><h1>Predict first.<br /><em>Grade in public.</em></h1><p>Touchline snapshots probabilities before kickoff, ingests the final result later, and publishes the model’s running accuracy and calibration without retroactive edits.</p></header><div className="shell"><PerformanceDashboard /></div><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Automated fixture sync · immutable prediction ledger</p><Link href="/matches">Match lab →</Link></footer></main>;
}
