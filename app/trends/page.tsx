import type { Metadata } from "next";
import { SiteNav } from "../site-nav";
import { TrendLab } from "./trend-lab";

export const metadata: Metadata = { title: "Valuation Trends — Touchline", description: "Compare position-specific player valuation trajectories, uncertainty, and season evidence." };

export default function TrendsPage() {
  return <main className="trends-page"><SiteNav active="trends" /><header className="compare-hero shell"><div className="eyebrow"><span /> HISTORICAL VALUATION</div><h1>Follow the signal.<br /><em>Across seasons.</em></h1><p>Compare up to three position-specific valuation trajectories, their uncertainty, and the amount of evidence behind every seasonal estimate.</p></header><TrendLab /><footer className="footer shell"><div className="brand"><span className="brand-mark">T</span><span>TOUCHLINE</span></div><p>Role-specific models · bootstrap uncertainty · honest gaps</p><a href="/models">Inspect models →</a></footer></main>;
}
